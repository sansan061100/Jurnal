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
    netProfit += trade.pnl;
    runningBal += trade.pnl;

    if (trade.pnl > 0.01) {
      wonTrades++;
      grossProfit += trade.pnl;
      if (trade.pnl > bestTrade) bestTrade = trade.pnl;
    } else if (trade.pnl < -0.01) {
      lostTrades++;
      grossLoss += Math.abs(trade.pnl);
      if (trade.pnl < worstTrade) worstTrade = trade.pnl;
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
    avgRMultiple: parseFloat(avgRMultiple.toFixed(2))
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

  let formattedNum = '';
  if (absValue >= 1000000) {
    const valInM = absValue / 1000000;
    const rounded = Math.round(valInM * 100) / 100;
    formattedNum = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(rounded) + 'M';
  } else if (absValue >= 1000) {
    const valInK = absValue / 1000;
    const rounded = Math.round(valInK * 100) / 100;
    formattedNum = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(rounded) + 'k';
  } else {
    formattedNum = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(absValue);
  }

  return `${isNegative ? '-' : ''}${prefix}${formattedNum}`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return formatNumberAbbreviated(value, currency, true);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Date helpers
export function formatDateIndonesia(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  let rrRatio = 0;
  if (stopLoss && takeProfit && stopLoss !== entryPrice) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk > 0) {
      rrRatio = parseFloat((reward / risk).toFixed(2));
    }
  }

  // 3. Calculate Realized R-Multiple
  let rMultiple = 0;
  if (stopLoss && stopLoss !== entryPrice) {
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    if (riskPerUnit > 0) {
      const riskAmount = riskPerUnit * lotSize * contractSize;
      rMultiple = parseFloat((pnl / riskAmount).toFixed(2));
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
      date: 'Mulai',
      pair: 'Starting Balance',
      profit: 0,
      balance: currentBal,
      pnlLabel: '0',
    }
  ];

  sorted.forEach((trade, i) => {
    currentBal += trade.pnl;
    points.push({
      index: i + 1,
      tradeId: trade.id,
      date: new Date(trade.entryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      pair: trade.pair,
      profit: trade.pnl,
      balance: parseFloat(currentBal.toFixed(2)),
      pnlLabel: `${trade.pnl >= 0 ? '+' : ''}${trade.pnl}`,
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
    pnlMap[dateStr].pnl += trade.pnl;
    pnlMap[dateStr].count += 1;
  });

  return Object.entries(pnlMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      pnl: parseFloat(data.pnl.toFixed(2)),
      tradeCount: data.count,
    }));
}

// Standard trading pairs
export const DEFAULT_TRADING_PAIRS: TradingPair[] = [
  { id: 'p-eurusd', name: 'Euro / US Dollar', alias: 'EURUSD', contractSize: 100000 },
  { id: 'p-gbpusd', name: 'Great British Pound / US Dollar', alias: 'GBPUSD', contractSize: 100000 },
  { id: 'p-xauusd', name: 'Emas (Gold / USD)', alias: 'XAUUSD', contractSize: 100 },
  { id: 'p-usdjpy', name: 'US Dollar / Yen Jepang', alias: 'USDJPY', contractSize: 1000 },
  { id: 'p-gbpjpy', name: 'Pound Inggris / Yen Jepang', alias: 'GBPJPY', contractSize: 1000 },
  { id: 'p-btcusd', name: 'Bitcoin / US Dollar', alias: 'BTCUSD', contractSize: 1 },
  { id: 'p-ethusd', name: 'Ethereum / US Dollar', alias: 'ETHUSD', contractSize: 1 },
  { id: 'p-nas100', name: 'Nasdaq 100 Index', alias: 'NAS100', contractSize: 1 },
  { id: 'p-us30', name: 'Dow Jones (US30)', alias: 'US30', contractSize: 1 }
];

export const TRADING_PAIRS_LIST = DEFAULT_TRADING_PAIRS.map(p => p.alias);

export const TRADING_STRATEGIES_LIST = [
  'Order Block SMC', 'Liquidity Grab', 'Fair Value Gap (FVG)', 'Breakout',
  'Support & Resistance (S/R)', 'Trendline Bounce', 'Moving Average Cross',
  'Fibonacci Retracement', 'ICT Killzone', 'Harmonic Pattern'
];


// Standard exports completed

