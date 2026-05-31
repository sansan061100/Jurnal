import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Shield,
  Percent,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { Account, Trade, BalanceTransaction } from '../types';
import { AccountStatistics, formatCurrency, formatPercent, calculateStatistics } from '../utils';

const GORGEOUS_COLORS = [
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#ea580c', // Orange/Peach
  '#db2777', // Rose Pink
  '#2563eb', // Blue
  '#7c3aed', // Purple/Violet
  '#ca8a04', // Amber Yellow
  '#008a47', // Forest Green
];

const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  return new Date(dateStr + 'T00:00:00');
};

interface OverviewTabProps {
  accounts: Account[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  activeAccountTrades: Trade[];
  stats: AccountStatistics;
  equityCurveDataset: any[];
  dailyPnlDataset: any[];
  balanceTransactions: BalanceTransaction[];
  onAddBalanceTransaction: (type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, notes: string) => void;
  onDeleteBalanceTransaction: (id: string) => void;
}

export default function OverviewTab({
  accounts,
  activeAccountId,
  setActiveAccountId,
  activeAccountTrades,
  stats,
  equityCurveDataset,
  dailyPnlDataset,
  balanceTransactions,
  onAddBalanceTransaction,
  onDeleteBalanceTransaction
}: OverviewTabProps) {
  const currentAccountSelected = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const currentCurrency = currentAccountSelected?.currency || 'USD';

  // Time Filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Funding Modal states
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [fundingType, setFundingType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingNotes, setFundingNotes] = useState('');
  const [showFundingHistory, setShowFundingHistory] = useState(false);

  // Filter transactions for this specific active account only
  const activeTxList = useMemo(() => {
    return balanceTransactions.filter(tx => tx.accountId === currentAccountSelected?.id);
  }, [balanceTransactions, currentAccountSelected]);

  // Reactive Trades list based on Selected Time Filter
  const filteredTradesForStats = useMemo(() => {
    const now = new Date();
    
    return activeAccountTrades.filter(trade => {
      if (!trade.entryDate) return false;
      
      const tradeDate = parseSafeDate(trade.entryDate); 
      const tradeDateISO = trade.entryDate.substring(0, 10);
      
      if (timeFilter === 'today') {
        const todayStr = now.toISOString().substring(0, 10);
        return tradeDateISO === todayStr;
      }
      
      if (timeFilter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday of current week
        const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        return tradeDate >= monday && tradeDate < nextMonday;
      }
      
      if (timeFilter === 'month') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const firstDay = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const lastDay = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return tradeDate >= firstDay && tradeDate <= lastDay;
      }
      
      if (timeFilter === 'custom') {
        if (!customStart && !customEnd) return true;
        const start = customStart ? new Date(customStart + 'T00:00:00') : new Date('2000-01-01T00:00:00');
        const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date('2100-01-01T23:59:59');
        return tradeDate >= start && tradeDate <= end;
      }
      
      return true; // 'all'
    });
  }, [activeAccountTrades, timeFilter, customStart, customEnd]);

  // Reactive Balance Transactions based on Selected Time Filter
  const filteredTxForStats = useMemo(() => {
    const now = new Date();
    
    return activeTxList.filter(tx => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date + 'T00:00:00');
      const txDateISO = tx.date.substring(0, 10);
      
      if (timeFilter === 'today') {
        const todayStr = now.toISOString().substring(0, 10);
        return txDateISO === todayStr;
      }
      
      if (timeFilter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        return txDate >= monday && txDate < nextMonday;
      }
      
      if (timeFilter === 'month') {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const firstDay = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const lastDay = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        return txDate >= firstDay && txDate <= lastDay;
      }
      
      if (timeFilter === 'custom') {
        if (!customStart && !customEnd) return true;
        const start = customStart ? new Date(customStart + 'T00:00:00') : new Date('2000-01-01T00:00:00');
        const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date('2100-01-01T23:59:59');
        return txDate >= start && txDate <= end;
      }
      
      return true;
    });
  }, [activeTxList, timeFilter, customStart, customEnd]);

  // Recalculated dynamic statistics scoped exactly to selected window
  const computedStats = useMemo(() => {
    if (!currentAccountSelected) return stats;
    
    // Starting balance relative to everything BEFORE the filtered window
    const now = new Date();
    let periodStart: Date | null = null;
    
    if (timeFilter === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeFilter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      periodStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    } else if (timeFilter === 'month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (timeFilter === 'custom') {
      periodStart = customStart ? new Date(customStart + 'T00:00:00') : null;
    }
    
    let pnlBefore = 0;
    let fundingBefore = 0;
    
    if (periodStart) {
      // Trades before the beginning of this filter period
      activeAccountTrades.forEach(t => {
        const tDate = parseSafeDate(t.entryDate);
        if (tDate < periodStart!) {
          pnlBefore += t.pnl;
        }
      });
      
      // Transactions before the beginning of this filter period
      activeTxList.forEach(tx => {
        const txDate = parseSafeDate(tx.date);
        if (txDate < periodStart!) {
          fundingBefore += tx.type === 'DEPOSIT' ? tx.amount : -tx.amount;
        }
      });
    }
    
    const periodStartingBalance = currentAccountSelected.startingBalance + pnlBefore + fundingBefore;
    
    const customAccount = {
      ...currentAccountSelected,
      startingBalance: periodStartingBalance
    };
    
    return calculateStatistics(customAccount, filteredTradesForStats, filteredTxForStats);
  }, [
    currentAccountSelected,
    activeAccountTrades,
    activeTxList,
    timeFilter,
    customStart,
    customEnd,
    filteredTradesForStats,
    filteredTxForStats,
    stats
  ]);

  // Recalculate Equity Curve with intelligent labels
  const computedEquityCurve = useMemo(() => {
    if (!currentAccountSelected) return [];
    
    const sorted = [...filteredTradesForStats].sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
    
    const startingBal = computedStats.startingBalance;
    let currentBal = startingBal;
    
    const points = [
      {
        index: 0,
        tradeId: 'start',
        date: 'Start',
        pair: 'Starting Balance',
        profit: 0,
        balance: parseFloat(currentBal.toFixed(2)),
        pnlLabel: '0',
      }
    ];
    
    sorted.forEach((trade, i) => {
      currentBal += trade.pnl;
      let dateLabel = '';
      const tDate = parseSafeDate(trade.entryDate);
      
      if (timeFilter === 'today') {
        // Today curve represents individual trades since all share 1 calendar day
        dateLabel = `Tx #${i + 1}`;
      } else if (timeFilter === 'week') {
        dateLabel = tDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      } else if (timeFilter === 'month') {
        dateLabel = tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        dateLabel = tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      }
      
      points.push({
        index: i + 1,
        tradeId: trade.id,
        date: dateLabel,
        pair: trade.pair,
        profit: trade.pnl,
        balance: parseFloat(currentBal.toFixed(2)),
        pnlLabel: `${trade.pnl >= 0 ? '+' : ''}${trade.pnl}`,
      });
    });
    
    return points;
  }, [filteredTradesForStats, computedStats.startingBalance, currentAccountSelected, timeFilter]);

  // Recalculate Daily P&L with custom axis
  const computedDailyPnl = useMemo(() => {
    if (timeFilter === 'today') {
      const sorted = [...filteredTradesForStats].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      );
      return sorted.map((trade, i) => ({
        date: `Tx #${i + 1} (${trade.pair})`,
        pnl: trade.pnl,
        tradeCount: 1,
      }));
    }
    
    if (timeFilter === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const pnlMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      const countMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
      
      filteredTradesForStats.forEach(t => {
        const d = parseSafeDate(t.entryDate);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (pnlMap[dayName] !== undefined) {
          pnlMap[dayName] += t.pnl;
          countMap[dayName] += 1;
        }
      });
      
      return days.map(d => ({
        date: d,
        pnl: parseFloat(pnlMap[d].toFixed(2)),
        tradeCount: countMap[d]
      }));
    }
    
    if (timeFilter === 'month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
      const pnlMap: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Week 5': 0 };
      const countMap: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Week 5': 0 };
      
      filteredTradesForStats.forEach(t => {
        const d = parseSafeDate(t.entryDate);
        const day = d.getDate();
        let weekKey = 'Week 5';
        if (day <= 7) weekKey = 'Week 1';
        else if (day <= 14) weekKey = 'Week 2';
        else if (day <= 21) weekKey = 'Week 3';
        else if (day <= 28) weekKey = 'Week 4';
        
        pnlMap[weekKey] += t.pnl;
        countMap[weekKey] += 1;
      });
      
      return weeks.map(w => ({
        date: w,
        pnl: parseFloat(pnlMap[w].toFixed(2)),
        tradeCount: countMap[w]
      }));
    }
    
    // Year / All Grouping (Monthly)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pnlMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    months.forEach(m => {
      pnlMap[m] = 0;
      countMap[m] = 0;
    });
    
    filteredTradesForStats.forEach(t => {
      const d = parseSafeDate(t.entryDate);
      const mName = d.toLocaleDateString('en-US', { month: 'short' });
      if (pnlMap[mName] !== undefined) {
        pnlMap[mName] += t.pnl;
        countMap[mName] += 1;
      }
    });
    
    return months.map(m => ({
      date: m,
      pnl: parseFloat(pnlMap[m].toFixed(2)),
      tradeCount: countMap[m]
    }));
  }, [filteredTradesForStats, timeFilter]);

  // Pair distribution donut chart data
  const pairDistributionData = useMemo(() => {
    const counts: Record<string, { count: number; pnl: number }> = {};
    
    filteredTradesForStats.forEach(t => {
      if (!counts[t.pair]) {
        counts[t.pair] = { count: 0, pnl: 0 };
      }
      counts[t.pair].count += 1;
      counts[t.pair].pnl += t.pnl;
    });
    
    return Object.entries(counts).map(([pair, detail]) => ({
      name: pair,
      value: detail.count,
      pnl: parseFloat(detail.pnl.toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [filteredTradesForStats]);

  const handleFundingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount!');
      return;
    }
    if (fundingType === 'WITHDRAWAL' && amount > computedStats.currentBalance) {
      alert(`Insufficient funds! Maximum withdrawal: ${formatCurrency(computedStats.currentBalance, currentCurrency)}`);
      return;
    }

    onAddBalanceTransaction(fundingType, amount, fundingNotes || (fundingType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'));
    setIsFundingModalOpen(false);
    setFundingAmount('');
    setFundingNotes('');
  };

  const getRMultipleStatus = (r: number) => {
    if (r >= 10) return { label: '🏆 Elite TR', color: 'text-cat-green bg-cat-green/10 border-cat-green/20' };
    if (r >= 5) return { label: '⚡ Profitable TR', color: 'text-cat-teal bg-cat-teal/10 border-cat-teal/20' };
    if (r > 0) return { label: '📈 Positive R', color: 'text-cat-blue bg-cat-blue/10 border-cat-blue/20' };
    if (r === 0) return { label: '⚖️ No Trade', color: 'text-cat-subtext bg-cat-surface0 border-cat-surface1' };
    return { label: '📉 Recovering', color: 'text-cat-red bg-cat-red/10 border-cat-red/20' };
  };

  const rStatus = getRMultipleStatus(computedStats.totalRMultiple);

  return (
    <div className="space-y-4 pb-6">
      
      {/* Dynamic Time Period Filters - Minimal design with backgrounds & padding, no borders on pills */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-3.5 rounded-2xl flex flex-col gap-2.5 brut-shadow-sm select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-cat-lavender tracking-widest uppercase">
            <span>📅</span>
            <span>FILTER BULANAN / HARIAN</span>
          </div>
          {timeFilter === 'custom' && (
            <span className="text-[8px] font-bold text-cat-subtext">CUSTOM SPAN</span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'week', label: 'Minggu Ini' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setTimeFilter(p.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all duration-150 ${
                timeFilter === p.id
                  ? 'bg-cat-text text-cat-base font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]'
                  : 'bg-cat-surface0 text-cat-subtext hover:bg-cat-surface1'
              }`}
            >
              {p.label}
            </button>
          ))}
          
          <button
            onClick={() => setTimeFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all duration-150 ${
              timeFilter === 'custom'
                ? 'bg-cat-text text-cat-base font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]'
                : 'bg-cat-surface0 text-cat-subtext hover:bg-cat-surface1'
            }`}
          >
            Pilih Tanggal
          </button>
        </div>

        {/* Custom Date span selectors */}
        {timeFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-cat-surface0/40">
            <div>
              <label className="block text-[8px] text-cat-subtext font-black uppercase mb-1">
                Mulai Tanggal
              </label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full text-xs p-2 font-black border border-cat-surface0 bg-cat-base"
              />
            </div>
            <div>
              <label className="block text-[8px] text-cat-subtext font-black uppercase mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full text-xs p-2 font-black border border-cat-surface0 bg-cat-base"
              />
            </div>
          </div>
        )}
      </div>

      {/* Account Info Card */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-4 rounded-2xl flex flex-col gap-1.5 brut-shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">💼</span>
            <span className="text-[10px] font-black tracking-widest text-cat-lavender uppercase">
              TRADING PORTFOLIO
            </span>
          </div>
          <span className="text-[9px] bg-cat-green/10 text-cat-green border border-cat-green/20 px-2 py-0.5 rounded-lg font-black uppercase">
            {currentAccountSelected?.leverage || '1:100'} Leverage
          </span>
        </div>
        <div className="text-left mt-1">
          <h4 className="text-sm font-black text-cat-text leading-tight">{currentAccountSelected?.name}</h4>
          <p className="text-[10px] text-cat-subtext font-mono mt-1">
            {currentAccountSelected?.broker || 'Demo Broker'} • {currentAccountSelected?.currency} • Registered on {new Date(currentAccountSelected?.createdAt || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Capital Management */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-4 rounded-2xl flex flex-col gap-2.5 brut-shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🪙</span>
            <span className="text-[10px] font-black tracking-widest text-cat-peach uppercase">Capital Management</span>
          </div>
          <span className="text-[10px] text-cat-text font-bold">
            Balance: {formatCurrency(computedStats.currentBalance, currentCurrency)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => {
              setFundingType('DEPOSIT');
              setIsFundingModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-cat-green text-cat-base border-2 border-cat-surface0 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 animate-pulse-subtle"
          >
            📥 Deposit Funds
          </button>
          <button
            onClick={() => {
              setFundingType('WITHDRAWAL');
              setIsFundingModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-cat-red text-cat-base border-2 border-cat-surface0 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5"
          >
            📤 Withdraw Funds
          </button>
        </div>

        {/* Mutable transaction list widget */}
        {activeTxList.length > 0 && (
          <div className="mt-2.5 border-t-2 border-cat-surface0/30 pt-2.5">
            <button
              onClick={() => setShowFundingHistory(prev => !prev)}
              className="w-full flex justify-between items-center text-[10px] font-black text-cat-subtext hover:text-cat-text transition focus:outline-none"
            >
              <span>📜 CAPITAL LOGS ({activeTxList.length})</span>
              <span>{showFundingHistory ? 'HIDE ▲' : 'SHOW ▼'}</span>
            </button>

            {showFundingHistory && (
              <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1.5 pr-1 font-sans">
                {activeTxList.map(tx => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-cat-base border border-cat-surface0 text-[10px]"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black uppercase tracking-wider ${tx.type === 'DEPOSIT' ? 'text-cat-green' : 'text-cat-red'}`}>
                          {tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <span className="text-[8px] text-cat-subtext">
                          {new Date(tx.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[9px] text-cat-subtext italic truncate max-w-[140px] mt-0.5">"{tx.notes}"</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <strong className={`font-mono font-bold ${tx.type === 'DEPOSIT' ? 'text-cat-green' : 'text-cat-red'}`}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount, currentCurrency)}
                      </strong>
                      <button
                        onClick={() => onDeleteBalanceTransaction(tx.id)}
                        title="Cancel transaction"
                        className="text-cat-red hover:bg-cat-red/10 px-1.5 py-0.5 rounded transition font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Funding Modal */}
      {isFundingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsFundingModalOpen(false)}
            className="fixed inset-0 bg-cat-crust/85 backdrop-blur-sm cursor-pointer"
          />
          <div className="w-full max-w-xs bg-cat-mantle border-2 border-cat-surface0 p-5 rounded-3xl shadow-2xl relative z-50 text-left">
            <h3 className="text-sm font-black text-cat-text mb-3 flex items-center gap-2">
              {fundingType === 'DEPOSIT' ? '📥 Add Capital' : '📤 Withdraw Capital'}
            </h3>
            <p className="text-[10px] text-cat-subtext mb-4 leading-relaxed">
              {fundingType === 'DEPOSIT' 
                ? 'Introduce supplementary balance to amplify your trade buying power.' 
                : 'Withdraw trade earnings from your running balance securely.'}
            </p>

            <form onSubmit={handleFundingSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] text-cat-text font-black uppercase mb-1">
                  Amount ({currentCurrency})
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="e.g. 500"
                  value={fundingAmount}
                  onChange={e => setFundingAmount(e.target.value)}
                  className="w-full text-xs p-3 font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] text-cat-text font-black uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Profit Withdrawal"
                  value={fundingNotes}
                  onChange={e => setFundingNotes(e.target.value)}
                  className="w-full text-xs p-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(false)}
                  className="py-2.5 bg-cat-surface0 hover:bg-cat-surface1 text-cat-text text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`py-2.5 text-cat-base text-xs font-black rounded-xl transition-all cursor-pointer border-2 border-cat-surface0 ${
                    fundingType === 'DEPOSIT' ? 'bg-cat-green' : 'bg-cat-red'
                  }`}
                >
                  {fundingType === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Pro-Trader Filtered Bento Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Saldo Berjalan (Running Balance) */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-blue/5 flex items-center justify-center">
            <Shield className="h-3 w-3 text-cat-blue/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Running Balance</span>
          <div className="mt-3">
            <span className="text-base font-black font-mono text-cat-text block tracking-tight leading-none">
              {formatCurrency(computedStats.currentBalance, currentCurrency)}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-mono">
              Initial: {formatCurrency(computedStats.startingBalance, currentCurrency)}
            </span>
          </div>
        </div>

        {/* Card 2: Laba/Rugi Net (Net PnL) */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-peach/5 flex items-center justify-center">
            <Activity className="h-3 w-3 text-cat-peach/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Net Profit & Loss</span>
          <div className="mt-3">
            <span className={`text-base font-black font-mono block tracking-tight leading-none ${computedStats.netProfit >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
              {computedStats.netProfit >= 0 ? '+' : ''}{formatCurrency(computedStats.netProfit, currentCurrency)}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-bold flex items-center gap-1">
              Gain: <span className={computedStats.netProfit >= 0 ? 'text-cat-green' : 'text-cat-red'}>
                {computedStats.startingBalance > 0 ? ((computedStats.netProfit / computedStats.startingBalance) * 100).toFixed(2) : 0}%
              </span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Realized R Multiple */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-lavender/5 flex items-center justify-center">
            <Award className="h-3 w-3 text-cat-lavender/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Realized R-Multiple</span>
          <div className="mt-3">
            <span className={`text-lg font-black font-mono block tracking-tight leading-none ${computedStats.totalRMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
              {computedStats.totalRMultiple >= 0 ? '+' : ''}{computedStats.totalRMultiple.toFixed(2)} R
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] text-cat-subtext font-medium font-mono">
                Avg: {computedStats.avgRMultiple > 0 ? '+' : ''}{computedStats.avgRMultiple.toFixed(2)}R/tx
              </span>
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${rStatus.color}`}>
                {rStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Strike Rate */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-pink/5 flex items-center justify-center">
            <Percent className="h-3 w-3 text-cat-pink/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Strike Rate</span>
          <div className="mt-3">
            <span className="text-lg font-black font-mono text-cat-lavender block tracking-tight leading-none">
              {formatPercent(computedStats.winRate)}
            </span>
            <div className="flex items-center gap-1 mt-1.5 text-[9px] text-cat-subtext font-bold">
              <span className="text-cat-green flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> {computedStats.wonTrades}W</span>
              <span>/</span>
              <span className="text-cat-red flex items-center gap-0.5"><XCircle className="h-2.5 w-2.5" /> {computedStats.lostTrades}L</span>
              <span>/</span>
              <span className="text-cat-subtext font-normal leading-none">{computedStats.breakevenTrades}BE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini KPIs Row */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-3 rounded-2xl grid grid-cols-3 gap-1 text-center text-xs divide-x-2 divide-cat-surface0/40 brut-shadow-sm">
        <div>
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider block">Profit Factor</span>
          <span className="font-mono text-cat-peach font-black text-xs block mt-0.5">
            {computedStats.profitFactor.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider block">Max Drawdown</span>
          <span className="font-mono text-cat-red font-black text-xs block mt-0.5">
            -{computedStats.maxDrawdown.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider block">Avg Win / Loss</span>
          <span className="font-mono text-cat-green font-black text-xs block mt-0.5">
            {computedStats.avgLoss > 0 ? (computedStats.avgWin / computedStats.avgLoss).toFixed(2) : computedStats.avgWin > 0 ? '99.9' : '0.00'}
          </span>
        </div>
      </div>

      {/* Equity Curve Line Chart */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            📈 Net Equity Curve
          </h3>
          <p className="text-[10px] text-cat-subtext">Visual trajectory of accumulated capital balance</p>
        </div>

        {filteredTradesForStats.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-cat-subtext text-xs italic">
            No trades present in list for the selected period.
          </div>
        ) : (
          <div className="h-[140px] w-full font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={computedEquityCurve} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="pastelEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.6} />
                <XAxis
                  dataKey="index"
                  stroke="#71717a"
                  tickLine={false}
                  minTickGap={45}
                  tickFormatter={(idx) => {
                    const i = Number(idx);
                    if (isNaN(i) || i < 0 || i >= computedEquityCurve.length) return '';
                    if (i === 0) return 'Start';
                    const pt = computedEquityCurve[i];
                    if (!pt) return '';
                    const prevPt = computedEquityCurve[i - 1];
                    if (prevPt && prevPt.date === pt.date) {
                      return '';
                    }
                    return pt.date;
                  }}
                />
                <YAxis stroke="#71717a" tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip
                  cursor={{ stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', borderWidth: '1.5px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ color: '#09090b', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#09090b', fontSize: '11px' }}
                  labelFormatter={(labelIndex) => {
                    const idx = Number(labelIndex);
                    const pt = computedEquityCurve[idx];
                    if (!pt) return '';
                    return pt.tradeId === 'start' ? 'Initial Capital' : `${pt.date} • ${pt.pair}`;
                  }}
                  formatter={(value: any) => [
                    formatCurrency(Number(value), currentCurrency),
                    'Account Balance'
                  ]}
                />
                <Area type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#pastelEquityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily P&L Bar Chart */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            📊 Distribution Net P&L {timeFilter === 'today' ? '(Per Trade)' : '(Chronological)'}
          </h3>
          <p className="text-[10px] text-cat-subtext">Sum of gains and losses accrued in selected sequence</p>
        </div>

        {computedDailyPnl.length === 0 || computedDailyPnl.every(e => e.pnl === 0) ? (
          <div className="h-[135px] flex items-center justify-center text-cat-subtext text-xs italic">
            No gains or losses recorded in the selected period.
          </div>
        ) : (
          <div className="h-[135px] w-full font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computedDailyPnl} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" opacity={0.6} />
                <XAxis dataKey="date" stroke="#71717a" tickLine={false} />
                <YAxis stroke="#71717a" tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f4f4f5', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', borderWidth: '1.5px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ color: '#09090b', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '11px', color: '#09090b' }}
                  formatter={(value: any) => [formatCurrency(Number(value), currentCurrency), 'P&L']}
                />
                <Bar dataKey="pnl">
                  {computedDailyPnl.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#008a47' : '#da251d'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* NEW: Pair Distribution Donut Chart */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            🍩 Trading Pair Distribution
          </h3>
          <p className="text-[10px] text-cat-subtext">Breakdown of trade count & financial success per asset pair</p>
        </div>

        {pairDistributionData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-cat-subtext text-xs italic">
            No trades present inside current period.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-2.5">
            {/* Donut container */}
            <div className="h-[140px] w-full font-mono text-[9px] relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderRadius: '0px', borderWidth: '2px' }}
                    labelStyle={{ color: '#000000', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px', color: '#000000' }}
                    formatter={(value: any, name: any, props: any) => {
                      return [
                        `${value} trades (${props.payload.pnl >= 0 ? '+' : ''}${formatCurrency(props.payload.pnl, currentCurrency)})`,
                        name
                      ];
                    }}
                  />
                  <Pie
                    data={pairDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pairDistributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={GORGEOUS_COLORS[index % GORGEOUS_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Label for Donut Hole */}
              <div className="absolute flex flex-col justify-center items-center text-center select-none pointer-events-none">
                <span className="text-[11px] font-black text-cat-text leading-none">{computedStats.totalTrades}</span>
                <span className="text-[8px] font-bold text-cat-subtext uppercase tracking-wider mt-0.5">TRADES</span>
              </div>
            </div>

            {/* Structured Legend Item Breakdown List */}
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {pairDistributionData.map((item, index) => {
                const percentage = ((item.value / computedStats.totalTrades) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between text-[10px] font-semibold text-cat-text bg-cat-base border border-cat-surface0/60 p-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-zinc-200"
                        style={{ backgroundColor: GORGEOUS_COLORS[index % GORGEOUS_COLORS.length] }}
                      />
                      <span className="font-mono font-bold tracking-tight text-[11px]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-cat-subtext font-mono text-[9px]">
                        {item.value}x ({percentage}%)
                      </span>
                      <strong className={`font-mono font-bold text-[10px] shrink-0 ${item.pnl >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                        {item.pnl >= 0 ? '+' : ''}{formatCurrency(item.pnl, currentCurrency)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
