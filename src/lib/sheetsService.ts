import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Account, Trade, BalanceTransaction, TradingPair } from '../types';

// Initialize firebase app if needed (reusing the same initialization)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Store sheets specific configurations locally
const SHEET_ID_KEY = 'tj_google_sheet_id';

export const getCachedSheetId = (): string | null => {
  return localStorage.getItem(SHEET_ID_KEY);
};

export const setCachedSheetId = (id: string | null) => {
  if (id) {
    localStorage.setItem(SHEET_ID_KEY, id);
  } else {
    localStorage.removeItem(SHEET_ID_KEY);
  }
};

/**
 * Initialize OAuth listener. Call this on App mount.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Triggers official "Sign in with Google" popup and fetches OAuth credentials.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  setCachedSheetId(null);
};

/**
 * Search Drive files for an existing "Trading Journal Portfolio Logs" spreadsheet.
 * If not found, create a new spreadsheet with proper worksheets.
 */
export const findOrCreateSpreadsheet = async (token: string): Promise<string> => {
  // First, look up locally saved spreadsheet ID for speedy access
  const locallySavedId = getCachedSheetId();
  if (locallySavedId) {
    try {
      // Validate sheet accessibility
      const verifyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${locallySavedId}?fields=spreadsheetId`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (verifyRes.ok) {
        return locallySavedId;
      }
    } catch (e) {
      console.warn('Cached sheet ID was invalid or inaccessible:', e);
    }
  }

  // Search in Google Drive
  const query = encodeURIComponent("name = 'Trading Journal Portfolio Logs' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!driveRes.ok) {
    throw new Error('Failed to search Drive files');
  }

  const driveData = await driveRes.json();
  if (driveData.files && driveData.files.length > 0) {
    const id = driveData.files[0].id;
    setCachedSheetId(id);
    return id;
  }

  // Create new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'Trading Journal Portfolio Logs'
      },
      sheets: [
        { properties: { title: 'Portfolios' } },
        { properties: { title: 'Trades' } },
        { properties: { title: 'BalanceTransactions' } },
        { properties: { title: 'CustomPairs' } }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Spreadsheet creation failed:', errText);
    throw new Error('Failed to create Trading Journal Google Sheet');
  }

  const newSheet = await createRes.json();
  const newId = newSheet.spreadsheetId;
  setCachedSheetId(newId);
  return newId;
};

/**
 * Ensure all required worksheets exist in the selected spreadsheet.
 */
export const ensureWorksheetsExist = async (token: string, spreadsheetId: string): Promise<void> => {
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!getRes.ok) {
    throw new Error('Failed to inspect spreadsheet structure');
  }

  const data = await getRes.json();
  const sheets = data.sheets || [];
  const existingTitles = sheets.map((s: any) => s.properties.title);

  const requiredSheets = ['Portfolios', 'Trades', 'BalanceTransactions', 'CustomPairs'];
  const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));

  if (missingSheets.length > 0) {
    const requests = missingSheets.map(title => ({
      addSheet: {
        properties: {
          title
        }
      }
    }));

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!updateRes.ok) {
      throw new Error('Failed to initialize missing sheets in your spreadsheet');
    }
  }
};

/**
 * Sync (Push) entire local app state to the Google Spreadsheet.
 */
export const pushData = async (
  token: string,
  spreadsheetId: string,
  accounts: Account[],
  trades: Trade[],
  balanceTx: BalanceTransaction[],
  customPairs: TradingPair[]
): Promise<void> => {
  // Ensure worksheets are present
  await ensureWorksheetsExist(token, spreadsheetId);

  // Clear previous data
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ranges: ['Portfolios!A1:Z5000', 'Trades!A1:Z50000', 'BalanceTransactions!A1:Z10000', 'CustomPairs!A1:Z1000']
    })
  });

  if (!clearRes.ok) {
    throw new Error('Failed to clean sheet buffer before syncing.');
  }

  // Construct Batch Write payloads
  const portfolioHeaders = [
    'id', 'userId', 'name', 'startingBalance', 'currency', 'broker', 'leverage', 'description', 'createdAt', 'type', 'targetProfit', 'maxTotalLoss', 'maxDailyLoss', 'minTradingDays'
  ];
  const portfoliosData = [
    portfolioHeaders,
    ...accounts.map(acc => [
      acc.id || '',
      acc.userId || '',
      acc.name || '',
      acc.startingBalance ?? 0,
      acc.currency || '',
      acc.broker || '',
      acc.leverage || '',
      acc.description || '',
      acc.createdAt || '',
      acc.type || 'STANDARD',
      acc.targetProfit ?? '',
      acc.maxTotalLoss ?? '',
      acc.maxDailyLoss ?? '',
      acc.minTradingDays ?? ''
    ])
  ];

  const tradeHeaders = [
    'id', 'accountId', 'userId', 'pair', 'action', 'lotSize', 'entryPrice', 'stopLoss', 'takeProfit', 'exitPrice', 'pnl', 'entryDate', 'exitDate', 'session', 'notes', 'rrRatio', 'rMultiple', 'disciplineRating'
  ];
  const tradesData = [
    tradeHeaders,
    ...trades.map(t => [
      t.id || '',
      t.accountId || '',
      t.userId || '',
      t.pair || '',
      t.action || 'BUY',
      t.lotSize ?? 0,
      t.entryPrice ?? 0,
      t.stopLoss ?? '',
      t.takeProfit ?? '',
      t.exitPrice ?? 0,
      t.pnl ?? 0,
      t.entryDate || '',
      t.exitDate || '',
      t.session || 'Asian',
      t.notes || '',
      t.rrRatio ?? '',
      t.rMultiple ?? '',
      t.disciplineRating || ''
    ])
  ];

  const txHeaders = ['id', 'accountId', 'userId', 'type', 'amount', 'date', 'notes'];
  const transactionsData = [
    txHeaders,
    ...balanceTx.map(tx => [
      tx.id || '',
      tx.accountId || '',
      tx.userId || '',
      tx.type || 'DEPOSIT',
      tx.amount ?? 0,
      tx.date || '',
      tx.notes || ''
    ])
  ];

  const pairHeaders = ['id', 'name', 'alias', 'contractSize'];
  const pairsData = [
    pairHeaders,
    ...customPairs.map(p => [
      p.id || '',
      p.name || '',
      p.alias || '',
      p.contractSize ?? 100000
    ])
  ];

  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Portfolios!A1', values: portfoliosData },
        { range: 'Trades!A1', values: tradesData },
        { range: 'BalanceTransactions!A1', values: transactionsData },
        { range: 'CustomPairs!A1', values: pairsData }
      ]
    })
  });

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    console.error('Sheets batch update failed:', errText);
    throw new Error('Failed to save accounts and trade operations to Google Sheet');
  }
};

/**
 * Pull and parse all data from target Google Spreadsheet.
 */
export const pullData = async (
  token: string,
  spreadsheetId: string
): Promise<{
  accounts: Account[];
  trades: Trade[];
  balanceTransactions: BalanceTransaction[];
  customPairs: TradingPair[];
}> => {
  await ensureWorksheetsExist(token, spreadsheetId);

  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Portfolios!A1:Z5000&ranges=Trades!A1:Z50000&ranges=BalanceTransactions!A1:Z10000&ranges=CustomPairs!A1:Z1000`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!getRes.ok) {
    throw new Error('Failed to fetch data ranges from Google Spreadsheet');
  }

  const result = await getRes.json();
  const ranges = result.valueRanges || [];

  const portfoliosRaw = ranges.find((r: any) => r.range.startsWith('Portfolios!'))?.values;
  const tradesRaw = ranges.find((r: any) => r.range.startsWith('Trades!'))?.values;
  const balanceRaw = ranges.find((r: any) => r.range.startsWith('BalanceTransactions!'))?.values;
  const pairsRaw = ranges.find((r: any) => r.range.startsWith('CustomPairs!'))?.values;

  // Parsers to yield correctly typed accounts
  const parsePortfolios = (values: any[][] | undefined): Account[] => {
    if (!values || values.length <= 1) return [];
    const headers = values[0].map(h => String(h).trim());
    return values.slice(1).map(row => {
      const item: any = {};
      headers.forEach((header, idx) => {
        const val = row[idx];
        if (['startingBalance', 'targetProfit', 'maxTotalLoss', 'maxDailyLoss', 'minTradingDays'].includes(header)) {
          item[header] = val && val !== '' ? parseFloat(val) : undefined;
        } else {
          item[header] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return item as Account;
    }).filter(p => p.id);
  };

  const parseTrades = (values: any[][] | undefined): Trade[] => {
    if (!values || values.length <= 1) return [];
    const headers = values[0].map(h => String(h).trim());
    return values.slice(1).map(row => {
      const item: any = {};
      headers.forEach((header, idx) => {
        const val = row[idx];
        if (['lotSize', 'entryPrice', 'stopLoss', 'takeProfit', 'exitPrice', 'pnl', 'rrRatio', 'rMultiple'].includes(header)) {
          item[header] = val && val !== '' ? parseFloat(val) : undefined;
        } else {
          item[header] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return item as Trade;
    }).filter(t => t.id);
  };

  const parseBalanceTransactions = (values: any[][] | undefined): BalanceTransaction[] => {
    if (!values || values.length <= 1) return [];
    const headers = values[0].map(h => String(h).trim());
    return values.slice(1).map(row => {
      const item: any = {};
      headers.forEach((header, idx) => {
        const val = row[idx];
        if (header === 'amount') {
          item[header] = val && val !== '' ? parseFloat(val) : 0;
        } else {
          item[header] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return item as BalanceTransaction;
    }).filter(tx => tx.id);
  };

  const parseCustomPairs = (values: any[][] | undefined): TradingPair[] => {
    if (!values || values.length <= 1) return [];
    const headers = values[0].map(h => String(h).trim());
    return values.slice(1).map(row => {
      const item: any = {};
      headers.forEach((header, idx) => {
        const val = row[idx];
        if (header === 'contractSize') {
          item[header] = val && val !== '' ? parseFloat(val) : 100000;
        } else {
          item[header] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return item as TradingPair;
    }).filter(p => p.id);
  };

  return {
    accounts: parsePortfolios(portfoliosRaw),
    trades: parseTrades(tradesRaw),
    balanceTransactions: parseBalanceTransactions(balanceRaw),
    customPairs: parseCustomPairs(pairsRaw)
  };
};
