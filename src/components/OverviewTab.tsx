import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Shield,
  Percent,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  HelpCircle,
  Calculator,
  RefreshCw
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
import { Account, Trade, BalanceTransaction, TradingPair } from '../types';
import { AccountStatistics, formatCurrency, formatPercent, calculateStatistics, getTradeStatus } from '../utils';

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
  customPairs: TradingPair[];
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
  onDeleteBalanceTransaction,
  customPairs
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
  
  // Interactive Metric Help / Explanations popover state
  const [expandedMetricHelp, setExpandedMetricHelp] = useState<string | null>(null);

  // Tab selector for the detailed performance console
  const [consoleTab, setConsoleTab] = useState<'returns' | 'activity' | 'streaks' | 'volume'>('returns');

  // Visualization Mode: 'currency' or 'percentage'
  const [visualMode, setVisualMode] = useState<'currency' | 'percentage'>('currency');



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
        percentageGrowth: 0,
        percentageProfit: 0,
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
      
      const pctGrowth = startingBal > 0 ? ((currentBal - startingBal) / startingBal) * 100 : 0;
      const pctProfit = startingBal > 0 ? (trade.pnl / startingBal) * 100 : 0;
      
      points.push({
        index: i + 1,
        tradeId: trade.id,
        date: dateLabel,
        pair: trade.pair,
        profit: trade.pnl,
        balance: parseFloat(currentBal.toFixed(2)),
        percentageGrowth: parseFloat(pctGrowth.toFixed(2)),
        percentageProfit: parseFloat(pctProfit.toFixed(2)),
        pnlLabel: `${trade.pnl >= 0 ? '+' : ''}${trade.pnl}`,
      });
    });
    
    return points;
  }, [filteredTradesForStats, computedStats.startingBalance, currentAccountSelected, timeFilter]);

  // Calculate average risk per trade as a percentage of the starting balance
  const pctAvgRiskPerTrade = useMemo(() => {
    let totalRiskVal = 0;
    let count = 0;
    filteredTradesForStats.forEach(t => {
      if (t.rMultiple && Math.abs(t.rMultiple) > 0) {
        totalRiskVal += Math.abs(t.pnl / t.rMultiple);
        count++;
      }
    });
    const avgRiskAmount = count > 0 ? totalRiskVal / count : 0;
    const startingBal = computedStats.startingBalance;
    return startingBal > 0 ? (avgRiskAmount / startingBal) * 100 : 0;
  }, [filteredTradesForStats, computedStats.startingBalance]);

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

  // UI/UX INSERTION: New analytic insights for pro trading performance
  const sessionPerformance = useMemo(() => {
    const sessionsList: ('Asian' | 'London' | 'New York' | 'Other')[] = ['Asian', 'London', 'New York', 'Other'];
    return sessionsList.map(s => {
      const sessionTrades = filteredTradesForStats.filter(t => t.session === s);
      const total = sessionTrades.length;
      const won = sessionTrades.filter(t => getTradeStatus(t) === 'WIN').length;
      const lost = sessionTrades.filter(t => getTradeStatus(t) === 'LOSS').length;
      const pnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
      const winRate = total > 0 ? (won / total) * 100 : 0;
      return {
        session: s,
        total,
        won,
        lost,
        pnl: parseFloat(pnl.toFixed(2)),
        winRate
      };
    });
  }, [filteredTradesForStats]);

  const assetChampions = useMemo(() => {
    const counts: Record<string, { count: number; pnl: number; won: number }> = {};
    filteredTradesForStats.forEach(t => {
      if (!counts[t.pair]) {
        counts[t.pair] = { count: 0, pnl: 0, won: 0 };
      }
      counts[t.pair].count += 1;
      counts[t.pair].pnl += t.pnl;
      if (getTradeStatus(t) === 'WIN') counts[t.pair].won += 1;
    });

    const list = Object.entries(counts).map(([pair, detail]) => ({
      pair,
      count: detail.count,
      pnl: parseFloat(detail.pnl.toFixed(2)),
      winRate: detail.count > 0 ? (detail.won / detail.count) * 100 : 0
    }));

    const sortedBest = [...list].filter(x => x.pnl > 0.01).sort((a, b) => b.pnl - a.pnl);
    const sortedWorst = [...list].filter(x => x.pnl < -0.01).sort((a, b) => a.pnl - b.pnl);

    return {
      champion: sortedBest[0] || null,
      challenge: sortedWorst[0] || null,
    };
  }, [filteredTradesForStats]);

  const gamificationStats = useMemo(() => {
    // Sort trades chronologically to calculate true consecutive streams
    const sortedTrades = [...filteredTradesForStats].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    let xp = 0;
    let discStreak = 0;
    let maxDiscStreak = 0;

    // Quests counts
    let planAlignedCount = 0;
    let patientEntryCount = 0;
    let slTpActiveCount = 0;
    let detailedNotesCount = 0;

    sortedTrades.forEach(t => {
      const isDisciplineOk = !t.disciplineRating || t.disciplineRating === 'MATCH' || t.disciplineRating === 'PATIENT';
      
      // Calculate discipline consecutive streak
      if (isDisciplineOk) {
        discStreak += 1;
        if (discStreak > maxDiscStreak) maxDiscStreak = discStreak;
      } else {
        discStreak = 0;
      }

      // 1. Base rating XP
      if (t.disciplineRating === 'MATCH' || !t.disciplineRating) {
        xp += 120;
        planAlignedCount += 1;
      } else if (t.disciplineRating === 'PATIENT') {
        xp += 120;
        patientEntryCount += 1;
      } else {
        // Honesty / Learning XP for tracking bad behaviors
        xp += 25;
      }

      // 2. Risk configuration XP (has stopLoss and takeProfit)
      if (t.stopLoss !== undefined && t.takeProfit !== undefined) {
        xp += 60;
        slTpActiveCount += 1;
      }

      // 3. Notes depth XP
      if (t.notes && t.notes.trim().length > 25) {
        xp += 40;
        detailedNotesCount += 1;
      }

      // 4. Financial profit bonus
      if (t.pnl > 0.01) {
        xp += 40;
      }

      // 5. Streak additional multiplier
      if (discStreak > 1) {
        xp += Math.min(discStreak * 15, 75);
      }
    });

    const levels = [
      { num: 1, minXp: 0, maxXp: 500, title: 'Novice Practitioner', titleIndo: 'Murid Disiplin', color: 'text-cat-text border-cat-surface1 bg-cat-surface0/20' },
      { num: 2, minXp: 501, maxXp: 1500, title: 'Mindful Operator', titleIndo: 'Pengawas Emosi', color: 'text-cat-teal border-cat-teal bg-cat-teal/10' },
      { num: 3, minXp: 1501, maxXp: 3500, title: 'Execution Architect', titleIndo: 'Arsitek Sistem', color: 'text-cat-lavender border-cat-lavender bg-cat-lavender/10' },
      { num: 4, minXp: 3501, maxXp: 7000, title: 'Emotional Commander', titleIndo: 'Komandan Risiko', color: 'text-cat-peach border-cat-peach bg-cat-peach/10' },
      { num: 5, minXp: 7001, maxXp: 999999, title: 'Zen Market Master', titleIndo: 'Zen Master Pasar', color: 'text-cat-green border-cat-green bg-cat-green/10' },
    ];

    let activeLevel = levels[0];
    for (const lvl of levels) {
      if (xp >= lvl.minXp && xp <= lvl.maxXp) {
        activeLevel = lvl;
        break;
      }
    }
    if (xp > 7000) {
      activeLevel = levels[4];
    }

    const currentLvlXp = xp - activeLevel.minXp;
    const requiredLvlXp = activeLevel.maxXp - activeLevel.minXp;
    const progressPercent = activeLevel.num === 5 ? 100 : Math.min(Math.max((currentLvlXp / requiredLvlXp) * 100, 0), 100);

    // Quests definition
    const quests = [
      { id: 'q1', label: 'Plan Follower', sub: 'Target 3 entri "Plan Aligned"', current: planAlignedCount, target: 3, done: planAlignedCount >= 3, exp: '+250 XP' },
      { id: 'q2', label: 'Turtle Patience', sub: 'Sabar menunggu 1 entri "Patient Entry"', current: patientEntryCount, target: 1, done: patientEntryCount >= 1, exp: '+150 XP' },
      { id: 'q3', label: 'SL/TP Shield', sub: 'Pasang Stop Loss & Take Profit di 4 trades', current: slTpActiveCount, target: 4, done: slTpActiveCount >= 4, exp: '+200 XP' },
      { id: 'q4', label: 'Deep Psychology Scribe', sub: 'Catat risalah setup > 25 karakter di 3 trades', current: detailedNotesCount, target: 3, done: detailedNotesCount >= 3, exp: '+150 XP' },
    ];

    const completedQuestsCount = quests.filter(q => q.done).length;

    return {
      xp,
      level: activeLevel,
      progressPercent,
      currentLvlXp,
      requiredLvlXp,
      discStreak,
      maxDiscStreak,
      quests,
      completedQuestsCount
    };
  }, [filteredTradesForStats]);

  const psychologyBreakdown = useMemo(() => {
    const total = filteredTradesForStats.length;
    const counts = { MATCH: 0, PATIENT: 0, FOMO: 0, REVENGE: 0, OVERLEVERAGE: 0 };
    filteredTradesForStats.forEach(t => {
      const r = t.disciplineRating || 'MATCH';
      if (counts[r] !== undefined) {
        counts[r] += 1;
      } else {
        counts['MATCH'] += 1;
      }
    });

    return [
      { key: 'MATCH', label: 'Plan Aligned 🎯', count: counts.MATCH, pct: total > 0 ? (counts.MATCH / total) * 100 : 0, color: 'bg-cat-green text-cat-green', border: 'border-cat-green/20' },
      { key: 'PATIENT', label: 'Patient Entry 🐢', count: counts.PATIENT, pct: total > 0 ? (counts.PATIENT / total) * 100 : 0, color: 'bg-cat-teal text-cat-teal', border: 'border-cat-teal/20' },
      { key: 'FOMO', label: 'FOMO Chase 😡', count: counts.FOMO, pct: total > 0 ? (counts.FOMO / total) * 100 : 0, color: 'bg-cat-yellow text-[#dfa000]', border: 'border-cat-yellow/20' },
      { key: 'REVENGE', label: 'Revenge Trade 🤯', count: counts.REVENGE, pct: total > 0 ? (counts.REVENGE / total) * 100 : 0, color: 'bg-cat-red text-cat-red', border: 'border-cat-red/20' },
      { key: 'OVERLEVERAGE', label: 'Big Lot / Risk 🐘', count: counts.OVERLEVERAGE, pct: total > 0 ? (counts.OVERLEVERAGE / total) * 100 : 0, color: 'bg-[#e58a50] text-[#e58a50]', border: 'border-cat-peach/20' },
    ];
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

  // Helper variables for percentage visualizations
  const growthRatePct = computedStats.startingBalance > 0
    ? ((computedStats.currentBalance - computedStats.startingBalance) / computedStats.startingBalance) * 100
    : 0;
  const netProfitPct = computedStats.startingBalance > 0
    ? (computedStats.netProfit / computedStats.startingBalance) * 100
    : 0;

  // Unified formatting helper for currency vs percentage display
  const formatValOrPct = (val: number, forcePlusSign = true) => {
    if (visualMode === 'percentage') {
      const pct = computedStats.startingBalance > 0 ? (val / computedStats.startingBalance) * 100 : 0;
      return `${forcePlusSign && pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    }
    return `${forcePlusSign && val >= 0 ? '+' : ''}${formatCurrency(val, currentCurrency)}`;
  };



  return (
    <div className="space-y-4 pb-6">
      
      {/* Dynamic Time Period Filters - Minimal design with backgrounds & padding, no borders on pills */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-3.5 rounded-2xl flex flex-col gap-2.5 brut-shadow-sm select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-cat-lavender tracking-widest uppercase">
            <span>📅</span>
            <span>DAILY / WEEKLY / MONTHLY FILTER</span>
          </div>
          {timeFilter === 'custom' && (
            <span className="text-[8px] font-bold text-cat-subtext">CUSTOM SPAN</span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' }
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
            Custom Range
          </button>
        </div>

        {/* Custom Date span selectors */}
        {timeFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-cat-surface0/40">
            <div>
              <label className="block text-[8px] text-cat-subtext font-black uppercase mb-1">
                Start Date
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
                End Date
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

        {/* Setting Visualisasi Mode Tampilan */}
        <div className="border-t border-cat-surface0/60 pt-2.5 mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black text-cat-lavender tracking-widest uppercase flex items-center gap-1.5">
              <span>🎯</span> GROWTH & RISK ANALYSIS MODE
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVisualMode('currency')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all duration-150 ${
                visualMode === 'currency'
                  ? 'bg-cat-text text-cat-base font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]'
                  : 'bg-cat-surface0 text-cat-subtext hover:bg-cat-surface1/60'
              }`}
            >
              Currency ({currentCurrency})
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('percentage')}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black cursor-pointer uppercase tracking-wider transition-all duration-150 ${
                visualMode === 'percentage'
                  ? 'bg-cat-text text-cat-base font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]'
                  : 'bg-cat-surface0 text-cat-subtext hover:bg-cat-surface1/60'
              }`}
            >
              Percentage (%)
            </button>
          </div>
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
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm text-left">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-blue/5 flex items-center justify-center">
            <Shield className="h-3 w-3 text-cat-blue/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Running Balance</span>
          <div className="mt-3">
            <span className="text-base font-black font-mono text-cat-text block tracking-tight leading-none">
              {visualMode === 'percentage' ? (
                `${growthRatePct >= 0 ? '+' : ''}${growthRatePct.toFixed(2)}%`
              ) : (
                formatCurrency(computedStats.currentBalance, currentCurrency)
              )}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-mono">
              {visualMode === 'percentage' ? (
                `Balance: ${formatCurrency(computedStats.currentBalance, currentCurrency)}`
              ) : (
                `Initial: ${formatCurrency(computedStats.startingBalance, currentCurrency)}`
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Laba/Rugi Net (Net PnL) */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm text-left">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-peach/5 flex items-center justify-center">
            <Activity className="h-3 w-3 text-cat-peach/25" />
          </div>
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Net Profit & Loss</span>
          <div className="mt-3">
            <span className={`text-base font-black font-mono block tracking-tight leading-none ${computedStats.netProfit >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
              {visualMode === 'percentage' ? (
                `${netProfitPct >= 0 ? '+' : ''}${netProfitPct.toFixed(2)}%`
              ) : (
                `${computedStats.netProfit >= 0 ? '+' : ''}${formatCurrency(computedStats.netProfit, currentCurrency)}`
              )}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-bold flex items-center gap-1">
              {visualMode === 'percentage' ? (
                `PnL: ${computedStats.netProfit >= 0 ? '+' : ''}${formatCurrency(computedStats.netProfit, currentCurrency)}`
              ) : (
                `Gain: ${netProfitPct.toFixed(2)}%`
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Total Realized R Multiple */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group brut-shadow-sm text-left">
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
                {visualMode === 'percentage' ? (
                  `Avg Risk: ~${pctAvgRiskPerTrade.toFixed(2)}%`
                ) : (
                  `Avg: ${computedStats.avgRMultiple > 0 ? '+' : ''}${computedStats.avgRMultiple.toFixed(2)}R/tx`
                )}
              </span>
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${rStatus.color}`}>
                {rStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Strike Rate */}
        <div className="bg-cat-mantle p-3.5 border-2 border-cat-surface0 rounded-2xl flex justify-between items-center shadow-sm relative overflow-hidden group brut-shadow-sm">
          <div className="flex flex-col justify-between h-full text-left">
            <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Strike Rate</span>
            <div className="mt-3">
              <span className="text-base font-black font-mono text-cat-lavender block tracking-tight leading-none">
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
          
          {/* Circular Progress Indicator for Strike Rate */}
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="3.5"
                opacity={0.5}
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3.5"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * Math.min(100, Math.max(0, computedStats.winRate))) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[9px] font-mono font-black text-cat-text">
              {Math.round(computedStats.winRate)}%
            </span>
          </div>
        </div>
      </div>

      {/* Mini KPIs Row - Upgraded to Interactive with Help Indicators */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-3 rounded-2xl grid grid-cols-3 gap-1.5 text-center text-xs divide-x-2 divide-cat-surface0/45 brut-shadow-sm select-none">
        <button
          onClick={() => setExpandedMetricHelp(prev => prev === 'profitFactor' ? null : 'profitFactor')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-cat-surface0/70 transition cursor-pointer focus:outline-none"
        >
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider flex items-center gap-1">
            Profit Factor <HelpCircle className="h-2.5 w-2.5 text-cat-subtext/60 inline" />
          </span>
          <span className="font-mono text-cat-peach font-black text-xs block mt-0.5">
            {computedStats.profitFactor.toFixed(2)}
          </span>
        </button>
        <button
          onClick={() => setExpandedMetricHelp(prev => prev === 'maxDrawdown' ? null : 'maxDrawdown')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-cat-surface0/70 transition cursor-pointer focus:outline-none"
        >
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider flex items-center gap-1">
            Max Drawdown <HelpCircle className="h-2.5 w-2.5 text-cat-subtext/60 inline" />
          </span>
          <span className="font-mono text-cat-red font-black text-xs block mt-0.5">
            -{computedStats.maxDrawdown.toFixed(2)}%
          </span>
        </button>
        <button
          onClick={() => setExpandedMetricHelp(prev => prev === 'avgWinLoss' ? null : 'avgWinLoss')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-cat-surface0/70 transition cursor-pointer focus:outline-none"
        >
          <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider flex items-center gap-0.5">
            Avg Win / Loss <HelpCircle className="h-2.5 w-2.5 text-cat-subtext/60 inline" />
          </span>
          <span className="font-mono text-cat-green font-black text-xs block mt-0.5">
            {computedStats.avgLoss > 0 ? (computedStats.avgWin / computedStats.avgLoss).toFixed(2) : computedStats.avgWin > 0 ? '99.9' : '0.00'}
          </span>
        </button>
      </div>

      {/* Interactive Metrik Help Explanations Card (Sleek UI/UX Helper) */}
      {expandedMetricHelp && (
        <div className="bg-cat-mantle border-2 border-cat-lavender p-3.5 rounded-2xl relative shadow-md text-xs transition-all duration-300">
          <button
            onClick={() => setExpandedMetricHelp(null)}
            className="absolute top-2 right-3 text-cat-subtext hover:text-cat-text font-black text-[12px] p-1"
            title="Close explanation"
          >
            ✕
          </button>
          <h4 className="font-black text-cat-lavender uppercase text-[9px] tracking-wider mb-1.5 flex items-center gap-1">
            💡 Trader Education: {expandedMetricHelp === 'profitFactor' ? 'Profit Factor Explained' : expandedMetricHelp === 'maxDrawdown' ? 'Max Drawdown Explained' : 'Average Win / Loss Ratio Explained'}
          </h4>
          <p className="text-cat-text leading-relaxed text-[11px] pr-4">
            {expandedMetricHelp === 'profitFactor' && 'The ratio of gross profit to gross loss. Values above 1.5 indicate a healthy and consistent strategy. To increase profit factor, maintain healthy risk-to-reward ratios (> 1.5R) and avoid impulsive emotional entries.'}
            {expandedMetricHelp === 'maxDrawdown' && 'The largest drop in balance from your peak account equity. Keep Max Drawdown below 10% to protect your capital. If drawdown is elevated, consider reducing your trade lot sizes by 50%.'}
            {expandedMetricHelp === 'avgWinLoss' && 'The ratio of average win size to average loss size. Any ratio above 1.0 indicates your winning trades are on average larger than your losing trades, showing excellent risk management!'}
          </p>
        </div>
      )}

      {/* Detailed Performance Statistics Console Component - Upgraded Tabbed Bento Grid */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 md:p-5 flex flex-col gap-4 select-none my-2 text-cat-text brut-shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cat-surface0/60">
          <div className="text-left">
            <h3 className="text-sm font-black text-cat-text flex items-center gap-2 uppercase tracking-wide">
              <span className="text-base text-cat-lavender">📊</span> Detailed Performance Statistics
            </h3>
            <p className="text-[11px] text-cat-subtext">Comprehensive analysis of trading performance across your selected period</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cat-lavender/10 text-cat-lavender border border-cat-lavender/20 rounded-full text-[9px] font-black uppercase tracking-widest">
            ✨ Professional Analytics
          </div>
        </div>

        {/* Tab switcher pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-cat-surface0 rounded-xl self-start">
          {[
            { id: 'returns', label: '💶 Returns & Efficiency' },
            { id: 'activity', label: '📈 Activity & Volume' },
            { id: 'streaks', label: '⚡ Streaks & Records' },
            { id: 'volume', label: '🕒 Days & Sessions' },
          ].map(tb => (
            <button
              key={tb.id}
              onClick={() => setConsoleTab(tb.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer tracking-wider transition-all duration-150 ${
                consoleTab === tb.id
                  ? 'bg-cat-text text-cat-base font-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]'
                  : 'text-cat-subtext hover:text-cat-text hover:bg-cat-surface1/60 bg-transparent'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {consoleTab === 'returns' && (
            <>
              {/* Avg Trade P&L */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Avg Trade P&L</span>
                <div className={`text-sm font-black font-mono mt-1 ${
                  computedStats.avgTradePnl >= 0.01 ? 'text-cat-green' : computedStats.avgTradePnl < -0.01 ? 'text-cat-red' : 'text-cat-text'
                }`}>
                  {formatValOrPct(computedStats.avgTradePnl)}
                </div>
              </div>

              {/* Trade Expectancy */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Expected Payoff</span>
                <div className={`text-sm font-black font-mono mt-1 ${
                  computedStats.tradeExpectancy >= 0.01 ? 'text-cat-green' : computedStats.tradeExpectancy < -0.01 ? 'text-cat-red' : 'text-cat-text'
                }`}>
                  {formatValOrPct(computedStats.tradeExpectancy)}
                </div>
              </div>

              {/* Avg Daily P&L */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Avg Daily P&L</span>
                <div className={`text-sm font-black font-mono mt-1 ${
                  computedStats.avgDailyPnl >= 0.01 ? 'text-cat-green' : computedStats.avgDailyPnl < -0.01 ? 'text-cat-red' : 'text-cat-text'
                }`}>
                  {formatValOrPct(computedStats.avgDailyPnl)}
                </div>
              </div>

              {/* Total Trading Days */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Total Trading Days</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-text">
                  {computedStats.totalTradingDays} Days
                </div>
              </div>

              {/* Open Trades */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Open Trades</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-text">
                  {computedStats.openTrades}
                </div>
              </div>
            </>
          )}

          {consoleTab === 'activity' && (
            <>
              {/* Total Volume */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Total Volume</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-text">
                  {computedStats.totalVolume.toFixed(2)} Lots
                </div>
              </div>

              {/* Avg Daily Volume */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Avg Daily Volume</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-text">
                  {computedStats.avgDailyVolume.toFixed(2)} Lots/Day
                </div>
              </div>

              {/* Total Commissions */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Total Commissions</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-red">
                  -{formatCurrency(computedStats.totalCommissions, currentCurrency)}
                </div>
              </div>

              {/* Total Swap */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Total Swap Paid</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-text">
                  {formatCurrency(computedStats.totalSwap, currentCurrency)}
                </div>
              </div>
            </>
          )}

          {consoleTab === 'streaks' && (
            <>
              {/* Max Win Streak */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Max Win Streak</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-green">
                  {computedStats.maxWinStreak} trades
                </div>
              </div>

              {/* Max Loss Streak */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Max Loss Streak</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-red">
                  {computedStats.maxLossStreak} trades
                </div>
              </div>

              {/* Max Win Day Streak */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Max Win Day Streak</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-green">
                  {computedStats.maxWinDayStreak} days
                </div>
              </div>

              {/* Max Loss Day Streak */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Max Loss Day Streak</span>
                <div className="text-sm font-black font-mono mt-1 text-cat-red">
                  {computedStats.maxLossDayStreak} days
                </div>
              </div>

              {/* Best Month */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Best Month</span>
                  <span className="text-[8px] text-cat-subtext/85 font-bold font-mono">({computedStats.bestMonthLabel})</span>
                </div>
                <div className="text-sm font-black font-mono mt-1 text-cat-green">
                  {formatValOrPct(computedStats.bestMonthValue)}
                </div>
              </div>

              {/* Worst Month */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Worst Month</span>
                  <span className="text-[8px] text-cat-subtext/85 font-bold font-mono">({computedStats.worstMonthLabel})</span>
                </div>
                <div className="text-sm font-black font-mono mt-1 text-cat-red">
                  {formatValOrPct(computedStats.worstMonthValue, false)}
                </div>
              </div>
            </>
          )}

          {consoleTab === 'volume' && (
            <>
              {/* Winning Days & Losing Days */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Days Ratio</span>
                <div className="text-[9px] font-mono font-bold mt-1 flex flex-col gap-0.5 text-left">
                  <span className="text-cat-green">🟩 {computedStats.winningDays} Win Days</span>
                  <span className="text-cat-red">🟥 {computedStats.losingDays} Loss Days</span>
                </div>
              </div>

              {/* Avg Winning & Losing Trade */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Avg Trade Win/Loss</span>
                <div className="text-[9px] font-mono font-black mt-1 flex flex-col text-left">
                  <span className="text-cat-green">{formatValOrPct(computedStats.avgWinTrade)}</span>
                  <span className="text-cat-red">{formatValOrPct(computedStats.avgLossTrade, false)}</span>
                </div>
              </div>

              {/* Avg Winning & Losing Day P&L */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Avg Day Win/Loss</span>
                <div className="text-[9px] font-mono font-black mt-1 flex flex-col text-left">
                  <span className="text-cat-green">🟩 {formatValOrPct(computedStats.avgWinningDayPnl)}</span>
                  <span className="text-cat-red">🟥 {formatValOrPct(computedStats.avgLosingDayPnl, false)}</span>
                </div>
              </div>

              {/* Largest Single Trade Win / Loss */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Extreme Trade P&L</span>
                <div className="text-[9px] font-mono font-black mt-1 flex flex-col text-left">
                  <span className="text-cat-green">🏆 {formatValOrPct(computedStats.largestProfit)}</span>
                  <span className="text-cat-red">💀 {formatValOrPct(computedStats.largestLoss, false)}</span>
                </div>
              </div>

              {/* Best Single Day / Worst Single Day */}
              <div className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex flex-col justify-between text-left min-h-[72px]">
                <span className="text-[10px] font-black tracking-tight text-cat-subtext uppercase">Extreme Day P&L</span>
                <div className="text-[9px] font-mono font-black mt-1 flex flex-col text-left">
                  <span className="text-cat-green">⚡ {formatValOrPct(computedStats.bestDayProfit)}</span>
                  <span className="text-cat-red">⚠️ {formatValOrPct(computedStats.worstDayLoss, false)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Champion Asset & Biggest Obstacle Card */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-4 rounded-2xl flex flex-col justify-between shadow-sm brut-shadow-sm text-left">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            <span>🏆</span> Champion Asset & Biggest Obstacle
          </h3>
          <p className="text-[10px] text-cat-subtext">Comparison of instruments with highest net profit vs drawdown losses</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {/* Champion Asset Card */}
          <div className="bg-cat-base border border-cat-surface0 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-green/5 flex items-center justify-center">
              <span className="text-[10px]">🏆</span>
            </div>
            <span className="text-[9px] text-cat-subtext font-black uppercase tracking-wider block">Champion Asset</span>
            <div className="mt-2 text-left">
              {assetChampions.champion ? (
                <>
                  <span className="text-xs font-black text-cat-text block tracking-tight font-mono">
                    {assetChampions.champion.pair}
                  </span>
                  <span className="text-xs text-cat-green font-black block mt-0.5">
                    +{formatCurrency(assetChampions.champion.pnl, currentCurrency)}
                  </span>
                  <span className="text-[8px] text-cat-subtext block font-mono mt-0.5">
                    WR: {assetChampions.champion.winRate.toFixed(1)}% ({assetChampions.champion.count} trades)
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-cat-subtext italic block py-1">No win data available</span>
              )}
            </div>
          </div>

          {/* Trouble Asset Card */}
          <div className="bg-cat-base border border-cat-surface0 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-red/5 flex items-center justify-center">
              <span className="text-[10px]">⚠️</span>
            </div>
            <span className="text-[9px] text-cat-subtext font-black uppercase tracking-wider block">Trouble Asset</span>
            <div className="mt-2 text-left">
              {assetChampions.challenge ? (
                <>
                  <span className="text-xs font-black text-cat-text block tracking-tight font-mono">
                    {assetChampions.challenge.pair}
                  </span>
                  <span className="text-xs text-cat-red font-black block mt-0.5">
                    {formatCurrency(assetChampions.challenge.pnl, currentCurrency)}
                  </span>
                  <span className="text-[8px] text-cat-subtext block font-mono mt-0.5">
                    WR: {assetChampions.challenge.winRate.toFixed(1)}% ({assetChampions.challenge.count} trades)
                  </span>
                </>
              ) : (
                <span className="text-[9px] text-cat-subtext italic block py-1">No loss data available</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trading Sessions Performance Insights List (UI/UX Improvement) */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 p-4 rounded-2xl brut-shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-left">
            <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
              <span>🕒</span> Win Rate & PnL by Trading Session
            </h3>
            <p className="text-[10px] text-cat-subtext">Financial performance broken down by global timezone sessions</p>
          </div>
          <span className="text-[8px] font-black text-cat-lavender bg-cat-lavender/10 px-2 py-0.5 rounded-lg uppercase tracking-wider">
            Markets Timezone
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-left">
          {sessionPerformance.map(sess => {
            const hasTrades = sess.total > 0;
            const pnlColor = sess.pnl >= 0 ? 'text-cat-green' : 'text-cat-red';
            return (
              <div key={sess.session} className="bg-cat-base border border-cat-surface0/70 p-3 rounded-xl flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cat-text uppercase tracking-wide flex items-center gap-1">
                    {sess.session === 'Asian' ? '🇯🇵 Asian (Tokyo)' : sess.session === 'London' ? '🇬🇧 London (Europe)' : sess.session === 'New York' ? '🇺🇸 New York (US)' : '☕ Other (Weekend)'}
                  </span>
                  <span className={`text-[10px] font-mono font-black ${hasTrades ? pnlColor : 'text-cat-subtext'}`}>
                    {hasTrades ? `${sess.pnl >= 0 ? '+' : ''}${formatCurrency(sess.pnl, currentCurrency)}` : '0.00'}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-cat-surface0 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cat-lavender h-full rounded-full transition-all duration-300"
                      style={{ width: `${sess.winRate || 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-cat-text shrink-0">
                    {sess.winRate.toFixed(0)}% WR
                  </span>
                </div>

                <div className="mt-1 flex justify-between text-[8px] text-cat-subtext font-bold uppercase tracking-wider">
                  <span>Frequency: {sess.total} trades</span>
                  <span>{sess.won} Won / {sess.lost} Lost</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equity Curve Line Chart */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            📈 Net Equity Curve
          </h3>
          <p className="text-[10px] text-cat-subtext">Cumulative performance of your account balance and growth percentage</p>
        </div>

        {filteredTradesForStats.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-cat-subtext text-xs italic">
            No trade performance data found for the selected period.
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
                    return pt ? pt.date : '';
                  }}
                />
                <YAxis 
                  stroke="#71717a" 
                  tickLine={false} 
                  domain={visualMode === 'percentage' ? ['dataMin - 0.5', 'dataMax + 0.5'] : ['dataMin - 100', 'dataMax + 100']} 
                  tickFormatter={(val) => visualMode === 'percentage' ? `${Number(val).toFixed(1)}%` : formatCurrency(Number(val), currentCurrency).split(',')[0]}
                />
                <Tooltip
                  cursor={{ stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '12px', borderWidth: '1.5px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ color: '#09090b', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#09090b', fontSize: '11px' }}
                  labelFormatter={(labelIndex) => {
                    const idx = Number(labelIndex);
                    const pt = computedEquityCurve[idx];
                    if (!pt) return '';
                    return pt.tradeId === 'start' ? 'Initial Balance' : `${pt.date} • ${pt.pair}`;
                  }}
                  formatter={(value: any) => [
                    visualMode === 'percentage' ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%` : formatCurrency(Number(value), currentCurrency),
                    visualMode === 'percentage' ? 'Growth (%)' : 'Account Balance'
                  ]}
                />
                <Area type="monotone" dataKey={visualMode === 'percentage' ? 'percentageGrowth' : 'balance'} stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#pastelEquityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* NEW: Pair Distribution Donut Chart */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
        <div className="mb-3">
          <h3 className="text-xs font-black text-cat-text flex items-center gap-1.5">
            🍩 Trading Asset Pairs Distribution
          </h3>
          <p className="text-[10px] text-cat-subtext">Percentage of trades and financial performance by trading instrument</p>
        </div>

        {pairDistributionData.length === 0 ? (
          <div className="h-[140px] flex items-center justify-center text-cat-subtext text-xs italic">
            No trades recorded in this period.
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
