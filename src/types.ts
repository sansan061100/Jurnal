/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'STANDARD' | 'PROPFIRM';

export interface Account {
  id: string;
  userId: string;       // Owner user identifier
  name: string;
  startingBalance: number;
  currency: string;
  broker: string;
  leverage: string;
  description: string;
  createdAt: string;
  type: AccountType;     // STANDARD or PROPFIRM

  // Prop Firm Challenge limits
  targetProfit?: number;      // e.g. 10000 (10% of 100K)
  maxTotalLoss?: number;      // e.g. 10000 (10% aggregate drawdown)
  maxDailyLoss?: number;      // e.g. 5000 (5% daily drawdown)
  minTradingDays?: number;    // e.g. 5 days minimal activetrading days
}

export type TradeAction = 'BUY' | 'SELL';
export type TradeSession = 'Asian' | 'London' | 'New York' | 'Other';

export interface TradingPair {
  id: string;
  name: string;
  alias: string;
  contractSize: number; // multiplier used for lot calculations
}

export interface Trade {
  id: string;
  accountId: string;
  userId: string;
  pair: string;       // Will map to pair alias
  action: TradeAction;
  lotSize: number;
  entryPrice: number;
  stopLoss?: number;  // SL level
  takeProfit?: number;// TP level
  exitPrice: number;
  pnl: number;        // Positive for profit, negative for loss
  commission?: number; // Fee deducted from pnl
  swap?: number;       // Fee/rebate adjusted to pnl
  entryDate: string;  // ISO format or date-time string YYYY-MM-DDTHH:mm
  exitDate: string;
  session: TradeSession;
  notes: string;
  rrRatio?: number;    // Setup planned risk-reward
  rMultiple?: number;  // Realized R multiple
  disciplineRating?: 'MATCH' | 'PATIENT' | 'FOMO' | 'REVENGE' | 'OVERLEVERAGE';
}

export interface BalanceTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  date: string; // ISO format string
  notes: string;
}

export interface MonthlyProgress {
  monthIndex: number; // 1 to 12
  actualBalance?: number;
  actualWithdrawn?: number;
}

export interface Challenge {
  id: string;
  userId: string;
  title: string;
  startBalance: number;
  targetBalance: number;
  durationMonths: number; // up to 12
  withdrawalRate: number; // percentage (e.g., 20 means 20% of monthly profit is withdrawn)
  startDate: string;       // YYYY-MM-DD
  accountId?: string;     // linked portfolio/account Id
  monthlyProgress: MonthlyProgress[];
  createdAt: string;
  isActive: boolean;
}

