/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Trade, TradeSession, TradingPair, BalanceTransaction } from './types';

// Helper to calculate statistics for a given list of trades
export interface AccountStatistics {
  startingBalance: number;
  netProfit: number;
  currentBalance: number;
  winRate: number; // percentage
  profitFactor: number;
  maxDrawdown: number; // percentage of drawdown based on peak equity
  maxDrawdownVal: number; // absolute currency drawdown
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  breakevenTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  grossProfit: number;
  grossLoss: number;
  totalRMultiple: number;
  avgRMultiple: number;

  // NEW DYNAMIC DETAILED STATS BASED ON USER SCREENSHOTS
  avgDailyPnl: number;
  avgTradePnl: number;
  tradeExpectancy: number;
  largestProfit: number;
  largestLoss: number;
  avgWinTrade: number;
  avgLossTrade: number;
  avgWinningDayPnl: number;
  avgLosingDayPnl: number;
  bestDayProfit: number;
  worstDayLoss: number;
  bestMonthLabel: string;
  bestMonthValue: number;
  worstMonthLabel: string;
  worstMonthValue: number;
  avgDailyVolume: number;
  totalVolume: number;
  totalCommissions: number;
  totalSwap: number;
  totalTradingDays: number;
  winningDays: number;
  losingDays: number;
  maxWinStreak: number;
  maxLossStreak: number;
  maxWinDayStreak: number;
  maxLossDayStreak: number;
  openTrades: number;
}

export function calculateStatistics(
  account: Account,
  trades: Trade[],
  balanceTransactions: BalanceTransaction[] = []
): AccountStatistics {
  const startingBalance = account.startingBalance;
  
  // Calculate total transaction funding for this account
  const activeTransactions = balanceTransactions.filter(tx => tx.accountId === account.id);
  const totalFunding = activeTransactions.reduce((acc, tx) => {
    return tx.type === 'DEPOSIT' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  let currentBalance = startingBalance + totalFunding;
  let netProfit = 0;
  let wonTrades = 0;
  let lostTrades = 0;
  let breakevenTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let bestTrade = 0;
  let worstTrade = 0;
  let totalRMultiple = 0;
  let tradesWithR = 0;

  // Sort trades chronologically to trace equity curve and drawdown
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );

  let runningBal = startingBalance + totalFunding;
  let peakBalance = runningBal;
  let maxDrawdownVal = 0;
  let maxDrawdownPercent = 0;

  for (const trade of sortedTrades) {
    const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
    netProfit += netTradePnl;
    runningBal += netTradePnl;

    const status = getTradeStatus(trade);
    if (status === 'WIN') {
       wonTrades++;
       grossProfit += netTradePnl;
       if (netTradePnl > bestTrade) bestTrade = netTradePnl;
    } else if (status === 'LOSS') {
       lostTrades++;
       grossLoss += Math.abs(netTradePnl);
       if (netTradePnl < worstTrade) worstTrade = netTradePnl;
    } else {
       breakevenTrades++;
    }

    // Tally R-Multiple
    if (trade.rMultiple !== undefined && !isNaN(trade.rMultiple)) {
      totalRMultiple += trade.rMultiple;
      tradesWithR++;
    }

    // Peak tracker
    if (runningBal > peakBalance) {
      peakBalance = runningBal;
    }

    // Drawdown tracker
    const drawdownVal = peakBalance - runningBal;
    if (drawdownVal > maxDrawdownVal) {
      maxDrawdownVal = drawdownVal;
    }
    const drawdownPercent = peakBalance > 0 ? (drawdownVal / peakBalance) * 100 : 0;
    if (drawdownPercent > maxDrawdownPercent) {
      maxDrawdownPercent = drawdownPercent;
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
  const avgWin = wonTrades > 0 ? grossProfit / wonTrades : 0;
  const avgLoss = lostTrades > 0 ? grossLoss / lostTrades : 0;
  const avgRMultiple = tradesWithR > 0 ? totalRMultiple / tradesWithR : 0;

  // ---------------- NEW STATS COMPUTATIONS ----------------

  // 1. Daily grouped stats
  const dailyPnlMap: Record<string, number> = {};
  sortedTrades.forEach(trade => {
    const dateStr = trade.entryDate ? trade.entryDate.substring(0, 10) : '';
    if (dateStr) {
      const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
      dailyPnlMap[dateStr] = (dailyPnlMap[dateStr] || 0) + netTradePnl;
    }
  });

  const totalTradingDays = Object.keys(dailyPnlMap).length;
  const winningDays = Object.values(dailyPnlMap).filter(val => val > 0.01).length;
  const losingDays = Object.values(dailyPnlMap).filter(val => val < -0.01).length;

  const avgDailyPnl = totalTradingDays > 0 ? netProfit / totalTradingDays : 0;
  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0;

  // Expectancy calculation: (Win% * AvgWin) - (Loss% * AvgLoss)
  const winRateFract = totalTrades > 0 ? wonTrades / totalTrades : 0;
  const lossRateFract = totalTrades > 0 ? lostTrades / totalTrades : 0;
  const tradeExpectancy = (winRateFract * avgWin) - (lossRateFract * avgLoss);

  const largestProfit = wonTrades > 0 ? bestTrade : 0;
  const largestLoss = lostTrades > 0 ? worstTrade : 0;
  const avgWinTrade = avgWin;
  const avgLossTrade = lostTrades > 0 ? -avgLoss : 0; // negative value

  // Avg PNL on winning vs losing days
  const winningDayVals = Object.values(dailyPnlMap).filter(val => val > 0.01);
  const losingDayVals = Object.values(dailyPnlMap).filter(val => val < -0.01);
  const avgWinningDayPnl = winningDayVals.length > 0 ? winningDayVals.reduce((a, b) => a + b, 0) / winningDayVals.length : 0;
  const avgLosingDayPnl = losingDayVals.length > 0 ? losingDayVals.reduce((a, b) => a + b, 0) / losingDayVals.length : 0;

  // Best/worst day
  const dayVals = Object.values(dailyPnlMap);
  const bestDayProfit = dayVals.length > 0 ? Math.max(0, ...dayVals) : 0;
  const worstDayLoss = dayVals.length > 0 ? Math.min(0, ...dayVals) : 0;

  // 2. Monthly grouped stats
  const monthlyPnlMap: Record<string, number> = {};
  sortedTrades.forEach(trade => {
    const monthStr = trade.entryDate ? trade.entryDate.substring(0, 7) : ''; // YYYY-MM
    if (monthStr) {
      const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
      monthlyPnlMap[monthStr] = (monthlyPnlMap[monthStr] || 0) + netTradePnl;
    }
  });

  function formatMonthYear(yearMonthStr: string): string {
    if (!yearMonthStr) return '';
    const [year, month] = yearMonthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  let bestMonthLabel = '-';
  let bestMonthValue = 0;
  let worstMonthLabel = '-';
  let worstMonthValue = 0;

  const monthEntries = Object.entries(monthlyPnlMap);
  if (monthEntries.length > 0) {
    const sortedByPnl = [...monthEntries].sort((a, b) => b[1] - a[1]);
    bestMonthLabel = formatMonthYear(sortedByPnl[0][0]);
    bestMonthValue = sortedByPnl[0][1];

    worstMonthLabel = formatMonthYear(sortedByPnl[sortedByPnl.length - 1][0]);
    worstMonthValue = sortedByPnl[sortedByPnl.length - 1][1];
  }

  // Volume & Fees
  const totalVolume = trades.reduce((sum, t) => sum + (t.lotSize || 0), 0);
  const avgDailyVolume = totalTradingDays > 0 ? totalVolume / totalTradingDays : 0;
  
  // Commission and Swaps (default to 0.00 since we only have direct logs, but extensible in client storage if specified)
  const totalCommissions = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
  const totalSwap = trades.reduce((sum, t) => sum + (t.swap || 0), 0);

  // Chronological Streaks calculations
  let maxWinStreak = 0;
  let currentWinStreak = 0;
  let maxLossStreak = 0;
  let currentLossStreak = 0;

  sortedTrades.forEach(trade => {
    const status = getTradeStatus(trade);
    if (status === 'WIN') {
      currentWinStreak++;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      currentLossStreak = 0;
    } else if (status === 'LOSS') {
      currentLossStreak++;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  // Day Streaks (Win & Loss streaks based on chronological calendar days)
  const sortedDatesList = Object.keys(dailyPnlMap).sort((a, b) => a.localeCompare(b));
  let maxWinDayStreak = 0;
  let currentWinDayStreak = 0;
  let maxLossDayStreak = 0;
  let currentLossDayStreak = 0;

  sortedDatesList.forEach(dateStr => {
    const dayPnl = dailyPnlMap[dateStr];
    if (dayPnl > 0.01) {
      currentWinDayStreak++;
      if (currentWinDayStreak > maxWinDayStreak) maxWinDayStreak = currentWinDayStreak;
      currentLossDayStreak = 0;
    } else if (dayPnl < -0.01) {
      currentLossDayStreak++;
      if (currentLossDayStreak > maxLossDayStreak) maxLossDayStreak = currentLossDayStreak;
      currentWinDayStreak = 0;
    } else {
      currentWinDayStreak = 0;
      currentLossDayStreak = 0;
    }
  });

  return {
    startingBalance,
    netProfit,
    currentBalance: parseFloat(runningBal.toFixed(2)),
    winRate,
    profitFactor,
    maxDrawdown: maxDrawdownPercent,
    maxDrawdownVal,
    totalTrades,
    wonTrades,
    lostTrades,
    breakevenTrades,
    avgWin,
    avgLoss,
    bestTrade,
    worstTrade,
    grossProfit,
    grossLoss,
    totalRMultiple: parseFloat(totalRMultiple.toFixed(2)),
    avgRMultiple: parseFloat(avgRMultiple.toFixed(2)),

    // New variables
    avgDailyPnl,
    avgTradePnl,
    tradeExpectancy,
    largestProfit,
    largestLoss,
    avgWinTrade,
    avgLossTrade,
    avgWinningDayPnl,
    avgLosingDayPnl,
    bestDayProfit,
    worstDayLoss,
    bestMonthLabel,
    bestMonthValue,
    worstMonthLabel,
    worstMonthValue,
    avgDailyVolume,
    totalVolume,
    totalCommissions,
    totalSwap,
    totalTradingDays,
    winningDays,
    losingDays,
    maxWinStreak,
    maxLossStreak,
    maxWinDayStreak,
    maxLossDayStreak,
    openTrades: 0 // always 0 since trades logged in this version are of fully completed entries
  };
}

// Formatting helpers
export function formatNumberAbbreviated(value: number, currency: string = 'USD', withSymbol: boolean = true): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  let prefix = '';
  if (withSymbol) {
    if (currency === 'USC') {
      prefix = '¢';
    } else if (currency === 'IDR') {
      prefix = 'Rp';
    } else {
      prefix = '$';
    }
  }

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(absValue);

  return `${isNegative ? '-' : ''}${prefix}${formattedNum}`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return formatNumberAbbreviated(value, currency, true);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Date helpers
export function formatDateEnglish(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Detect session based on trade entry hour
export function detectTradingSession(dateTimeStr: string): TradeSession {
  if (!dateTimeStr) return 'Other';
  const date = new Date(dateTimeStr);
  const hour = date.getHours(); // Local hour of the user's browser

  if (hour >= 6 && hour < 14) {
    return 'Asian';
  } else if (hour >= 14 && hour < 21) {
    return 'London';
  } else {
    return 'New York';
  }
}

// Calculate PnL and automated metrics
export function calculateTradePnLAndMetrics(
  action: 'BUY' | 'SELL',
  lotSize: number,
  entryPrice: number,
  exitPrice: number,
  stopLoss: number | undefined,
  takeProfit: number | undefined,
  contractSize: number
) {
  // 1. Calculate P&L
  let pnl = 0;
  if (action === 'BUY') {
    pnl = (exitPrice - entryPrice) * lotSize * contractSize;
  } else {
    pnl = (entryPrice - exitPrice) * lotSize * contractSize;
  }
  pnl = parseFloat(pnl.toFixed(2));

  // 2. Calculate Setup RR Ratio (Target RR)
  let rrRatio: number | undefined = undefined;
  if (stopLoss && takeProfit && stopLoss !== entryPrice) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk > 0) {
      rrRatio = parseFloat((reward / risk).toFixed(2));
    }
  }

  // 3. Calculate Realized R-Multiple
  let rMultiple: number | undefined = undefined;
  if (stopLoss && stopLoss !== entryPrice) {
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    if (riskPerUnit > 0) {
      const riskAmount = riskPerUnit * lotSize * contractSize;
      if (riskAmount > 0) {
        rMultiple = parseFloat((pnl / riskAmount).toFixed(2));
      }
    }
  }

  return { pnl, rrRatio, rMultiple };
}

// Generate an Equity Curve dataset for chart consumption
export interface EquityPoint {
  index: number;
  tradeId: string;
  date: string;
  pair: string;
  profit: number;
  balance: number;
  pnlLabel: string;
}

export function generateEquityCurveData(
  account: Account,
  trades: Trade[],
  balanceTransactions: BalanceTransaction[] = []
): EquityPoint[] {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );

  const activeTransactions = balanceTransactions.filter(tx => tx.accountId === account.id);
  const totalFunding = activeTransactions.reduce((acc, tx) => {
    return tx.type === 'DEPOSIT' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  let currentBal = account.startingBalance + totalFunding;
  
  const points: EquityPoint[] = [
    {
      index: 0,
      tradeId: 'start',
      date: 'Start',
      pair: 'Starting Balance',
      profit: 0,
      balance: currentBal,
      pnlLabel: '0',
    }
  ];

  sorted.forEach((trade, i) => {
    const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
    currentBal += netTradePnl;
    points.push({
      index: i + 1,
      tradeId: trade.id,
      date: new Date(trade.entryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      pair: trade.pair,
      profit: parseFloat(netTradePnl.toFixed(2)),
      balance: parseFloat(currentBal.toFixed(2)),
      pnlLabel: `${netTradePnl >= 0 ? '+' : ''}${netTradePnl.toFixed(2)}`,
    });
  });

  return points;
}

// Generate P&L per Day datasets
export interface DailyPnlPoint {
  date: string;
  pnl: number;
  tradeCount: number;
}

export function generateDailyPnlData(trades: Trade[]): DailyPnlPoint[] {
  const pnlMap: Record<string, { pnl: number; count: number }> = {};

  trades.forEach(trade => {
    // Take just YYYY-MM-DD
    const dateStr = trade.entryDate.substring(0, 10);
    if (!pnlMap[dateStr]) {
      pnlMap[dateStr] = { pnl: 0, count: 0 };
    }
    const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
    pnlMap[dateStr].pnl += netTradePnl;
    pnlMap[dateStr].count += 1;
  });

  return Object.entries(pnlMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      pnl: parseFloat(data.pnl.toFixed(2)),
      tradeCount: data.count,
    }));
}

// Standard trading pairs
export const DEFAULT_TRADING_PAIRS: TradingPair[] = [
  { id: 'p-eurusd', name: 'Euro / US Dollar', alias: 'EURUSD', contractSize: 100000 },
  { id: 'p-gbpusd', name: 'Great British Pound / US Dollar', alias: 'GBPUSD', contractSize: 100000 },
  { id: 'p-xauusd', name: 'Gold / US Dollar', alias: 'XAUUSD', contractSize: 100 },
  { id: 'p-usdjpy', name: 'US Dollar / Japanese Yen', alias: 'USDJPY', contractSize: 1000 },
  { id: 'p-gbpjpy', name: 'British Pound / Japanese Yen', alias: 'GBPJPY', contractSize: 1000 },
  { id: 'p-btcusd', name: 'Bitcoin / US Dollar', alias: 'BTCUSD', contractSize: 1 },
  { id: 'p-ethusd', name: 'Ethereum / US Dollar', alias: 'ETHUSD', contractSize: 1 },
  { id: 'p-nas100', name: 'Nasdaq 100 Index', alias: 'NAS100', contractSize: 1 },
  { id: 'p-us30', name: 'Dow Jones Index (US30)', alias: 'US30', contractSize: 1 }
];

export const TRADING_PAIRS_LIST = DEFAULT_TRADING_PAIRS.map(p => p.alias);

export const TRADING_STRATEGIES_LIST = [
  'Order Block SMC', 'Liquidity Grab', 'Fair Value Gap (FVG)', 'Breakout Check',
  'Support & Resistance (S/R)', 'Trendline Bounce', 'Moving Average Cross',
  'Fibonacci Retracement', 'ICT Killzone', 'Harmonic Pattern'
];

export function parseNumericString(str: string | number | undefined | null): number {
  if (str === undefined || str === null) return 0;
  if (typeof str === 'number') return str;
  
  let clean = str.trim();
  if (!clean) return 0;
  
  // Strip currency symbols and letters entirely
  clean = clean.replace(/[^0-9.,-]/g, '');
  
  // If we have both dot and comma
  if (clean.includes(',') && clean.includes('.')) {
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European/Indonesian format: 1.234,56 -> remove dots, replace comma with dot
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // US format: 1,234.56 -> remove commas
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // Only commas exist
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length !== 3) {
      // e.g. "10,5" or "10000,50" -> decimal comma
      clean = clean.replace(/,/g, '.');
    } else {
      // e.g. "10,000" or "1,000,000" -> thousand separators
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes('.')) {
    // Only dots exist
    const parts = clean.split('.');
    if (parts.length > 2) {
      // e.g. "1.000.000" -> multiple dots are thousand separators
      clean = clean.replace(/\./g, '');
    }
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function getTradeStatus(trade: Trade): 'WIN' | 'LOSS' | 'BE' {
  const netTradePnl = trade.pnl - (trade.commission || 0) + (trade.swap || 0);
  const hasSL = trade.stopLoss !== undefined && trade.stopLoss !== null && trade.stopLoss !== 0;
  if (hasSL && trade.rMultiple !== undefined && !isNaN(trade.rMultiple)) {
    if (Math.abs(trade.rMultiple) < 0.5) {
      return 'BE';
    }
    return netTradePnl > 0.01 ? 'WIN' : netTradePnl < -0.01 ? 'LOSS' : 'BE';
  }
  return netTradePnl > 0.01 ? 'WIN' : netTradePnl < -0.01 ? 'LOSS' : 'BE';
}
