import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Compass, PlusCircle, Trash2, Edit3, HelpCircle, AlertTriangle, CheckCircle, Flame, DollarSign, ArrowRight, CornerDownRight, Save } from 'lucide-react';
import { Account, Challenge, MonthlyProgress } from '../types';
import { formatCurrency } from '../utils';

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface ChallengesTabProps {
  accounts: Account[];
  activeAccountId: string;
  trades: any[];
  balanceTransactions: any[];
  onShowToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

interface PresetChallenge {
  title: string;
  startBalance: number;
  targetBalance: number;
  durationMonths: number;
  withdrawalRate: number;
  description: string;
}

// Mathemtical simulation helper for compounding target milestones with profit withdrawal rate
interface MilestonePlan {
  monthIndex: number;
  startBalance: number;
  targetBalanceBeforeWithdrawal: number;
  rawProfit: number;
  withdrawal: number;
  targetBalance: number; // after withdrawal
}

export function calculateCompoundingPlan(
  startBalance: number,
  targetBalance: number,
  durationMonths: number,
  withdrawalRatePct: number
): {
  milestones: MilestonePlan[];
  monthlyGrowthRateNet: number; 
  monthlyGrowthRateRaw: number; 
} {
  const S = Math.max(1, startBalance);
  const E = Math.max(2, targetBalance);
  const M = Math.max(1, Math.min(12, durationMonths));
  const w = Math.max(0, Math.min(99, withdrawalRatePct)) / 100;

  // Monthly net growth rate required: r = (E/S)^(1/M) - 1
  const monthlyGrowthRateNet = Math.pow(E / S, 1 / M) - 1;

  // Monthly raw growth rate needed before withdrawal: g = r / (1 - w)
  const monthlyGrowthRateRaw = w < 1 ? monthlyGrowthRateNet / (1 - w) : monthlyGrowthRateNet;

  const milestones: MilestonePlan[] = [];
  let currentStart = S;

  for (let k = 1; k <= M; k++) {
    const netGain = currentStart * monthlyGrowthRateNet;
    const targetAfter = currentStart + netGain;

    const rawProfit = w < 1 ? netGain / (1 - w) : netGain;
    const withdrawal = rawProfit * w;
    const targetBefore = currentStart + rawProfit;

    milestones.push({
      monthIndex: k,
      startBalance: parseFloat(currentStart.toFixed(2)),
      targetBalanceBeforeWithdrawal: parseFloat(targetBefore.toFixed(2)),
      rawProfit: parseFloat(rawProfit.toFixed(2)),
      withdrawal: parseFloat(withdrawal.toFixed(2)),
      targetBalance: parseFloat(targetAfter.toFixed(2)),
    });

    currentStart = targetAfter;
  }

  return {
    milestones,
    monthlyGrowthRateNet,
    monthlyGrowthRateRaw,
  };
}

export default function ChallengesTab({
  accounts,
  activeAccountId,
  trades,
  balanceTransactions,
  onShowToast,
}: ChallengesTabProps) {
  const currentAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  // State to hold challenges list or active challenge
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string>('');

  // Form Fields for Custom Challenge Creation
  const [formTitle, setFormTitle] = useState('');
  const [formStartBalance, setFormStartBalance] = useState('50');
  const [formTargetBalance, setFormTargetBalance] = useState('1000');
  const [formDuration, setFormDuration] = useState('3');
  const [formWdRate, setFormWdRate] = useState('10');
  const [formLinkAccountId, setFormLinkAccountId] = useState<string>('');
  const [presetLinkAccountId, setPresetLinkAccountId] = useState<string>('');

  // Synchronize dynamic default link account
  useEffect(() => {
    if (activeAccountId) {
      setFormLinkAccountId(activeAccountId);
      setPresetLinkAccountId(activeAccountId);
    } else if (accounts.length > 0) {
      setFormLinkAccountId(accounts[0].id);
      setPresetLinkAccountId(accounts[0].id);
    }
  }, [activeAccountId, accounts]);

  // Milestone edit states
  const [editingMonthIdx, setEditingMonthIdx] = useState<number | null>(null);
  const [editActualBalance, setEditActualBalance] = useState('');
  const [editActualWithdrawn, setEditActualWithdrawn] = useState('');

  // Presets List
  const PRESETS: PresetChallenge[] = [
    {
      title: 'Micro Compounding Run ($50 -> $1000)',
      startBalance: 50,
      targetBalance: 1000,
      durationMonths: 3,
      withdrawalRate: 10,
      description: 'The ultimate discipline test. Compounding 10% profit withdrawals monthly while building raw capital.',
    },
    {
      title: 'Prop Firm Runway ($10K -> $12K)',
      startBalance: 10000,
      targetBalance: 12000,
      durationMonths: 2,
      withdrawalRate: 20,
      description: 'Replicate prop firm requirements over 2 stages, withdrawing 20% of profits monthly for pocket rewards.',
    },
    {
      title: 'High Roller Compounding Sprint ($1K -> $10K)',
      startBalance: 1000,
      targetBalance: 10000,
      durationMonths: 6,
      withdrawalRate: 0,
      description: 'Zero withdraw high-growth runway. Fast compounding requires consecutive stable months.',
    },
    {
      title: 'Decent Income Maker ($500 -> $5000)',
      startBalance: 500,
      targetBalance: 5000,
      durationMonths: 4,
      withdrawalRate: 25,
      description: 'High withdrawal challenge. Pay out 25% of compounding profits monthly while pushing raw targets.',
    }
  ];

  // Load challenges from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tj_trading_challenges');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validated = parsed.filter((c): c is Challenge => !!(c && typeof c === 'object' && c.id));
          setChallenges(validated);
          const active = validated.find(c => c && c.isActive);
          if (active) {
            setActiveChallengeId(active.id);
          } else if (validated.length > 0 && validated[0]) {
            setActiveChallengeId(validated[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to parse challenges from local storage', e);
      }
    }
  }, []);

  // Save challenges utility
  const saveChallenges = (updated: Challenge[]) => {
    setChallenges(updated);
    try {
      localStorage.setItem('tj_trading_challenges', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save challenges to local storage', e);
    }
  };

  // Active Challenge Resolver
  const activeChallenge = useMemo(() => {
    return challenges.find(c => c && c.id === activeChallengeId) || null;
  }, [challenges, activeChallengeId]);

  // Account associated with the active challenge, resolving correct currency
  const challengeAccount = useMemo(() => {
    if (!activeChallenge || !activeChallenge.accountId) return currentAccount;
    return accounts.find(a => a.id === activeChallenge.accountId) || currentAccount;
  }, [activeChallenge, accounts, currentAccount]);

  const activeCurrency = challengeAccount?.currency || 'USD';

  // Compounding milestones generated dynamically for the selected challenge
  const activeMilestonesPlan = useMemo(() => {
    if (!activeChallenge) return null;
    return calculateCompoundingPlan(
      activeChallenge.startBalance || 50,
      activeChallenge.targetBalance || 1000,
      activeChallenge.durationMonths || 3,
      activeChallenge.withdrawalRate || 0
    );
  }, [activeChallenge]);

  // Compute live account metrics since the start date if challenge is linked
  const liveLinkedStats = useMemo(() => {
    if (!activeChallenge || !activeChallenge.accountId) return null;
    
    // Resolve trades and withdrawals for linked account since startDate
    const rawStart = new Date(activeChallenge.startDate || new Date()).getTime();
    const challStartDate = isNaN(rawStart) ? Date.now() : rawStart;
    
    // 1. Filter trades
    const challTrades = trades.filter(t => 
      t && t.accountId === activeChallenge.accountId &&
      new Date(t.entryDate || '').getTime() >= challStartDate
    );
    const linkedPnl = challTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

    // 2. Filter withdrawals
    const challWds = balanceTransactions.filter(tx => 
      tx && tx.accountId === activeChallenge.accountId &&
      tx.type === 'WITHDRAWAL' &&
      new Date(tx.date || '').getTime() >= challStartDate
    );
    const linkedWdAmount = challWds.reduce((acc, tx) => acc + (tx.amount || 0), 0);

    // Live Balance = Starting balance + PnL - Withdrawals
    const liveEstBalance = (activeChallenge.startBalance || 0) + linkedPnl - linkedWdAmount;

    return {
      totalLinkedProfit: linkedPnl,
      totalLinkedWithdrawn: linkedWdAmount,
      liveBalance: liveEstBalance,
      tradesCount: challTrades.length
    };
  }, [activeChallenge, trades, balanceTransactions]);

  // Calculate current progress status
  const currentStatusOverview = useMemo(() => {
    if (!activeChallenge || !activeMilestonesPlan) return null;

    // Use linked stats if account is linked, otherwise use the last recorded manual month-end balance, or just default start
    let currentBalance = activeChallenge.startBalance || 0;
    let totalWithdrawn = 0;

    const progressList = activeChallenge.monthlyProgress || [];

    if (activeChallenge.accountId && liveLinkedStats) {
      currentBalance = liveLinkedStats.liveBalance;
      totalWithdrawn = liveLinkedStats.totalLinkedWithdrawn;
    } else {
      // Find the latest month with actual logged data
      const loggedMonths = [...progressList]
        .filter(m => m && m.actualBalance !== undefined)
        .sort((a, b) => b.monthIndex - a.monthIndex);
      
      if (loggedMonths.length > 0 && loggedMonths[0]) {
        currentBalance = loggedMonths[0].actualBalance!;
      }
      totalWithdrawn = progressList.reduce((sum, m) => sum + (m?.actualWithdrawn || 0), 0);
    }

    const netProfit = currentBalance - (activeChallenge.startBalance || 0);
    const targetDiff = (activeChallenge.targetBalance || 1000) - (activeChallenge.startBalance || 50);
    const progressPercent = targetDiff > 0 
      ? Math.min(100, Math.max(0, parseFloat(((netProfit / targetDiff) * 100).toFixed(1))))
      : 0;

    // Actual realized trade P&L (connected to portfolio or manual estimate)
    const profitGoal = targetDiff;
    const actualPnl = (activeChallenge.accountId && liveLinkedStats) 
      ? liveLinkedStats.totalLinkedProfit 
      : netProfit;
    
    const pnlProgressPercent = profitGoal > 0 
      ? parseFloat(((actualPnl / profitGoal) * 100).toFixed(1))
      : 0;

    // Determine current month index of challenge based on elapsed dates
    const startMs = new Date(activeChallenge.startDate || new Date()).getTime();
    const elapsedMs = isNaN(startMs) ? 0 : Date.now() - startMs;
    const computedMonthIdx = isNaN(elapsedMs) ? 1 : Math.ceil(elapsedMs / (1000 * 60 * 60 * 24 * 30));
    const currentMonthIdx = Math.max(1, Math.min(activeChallenge.durationMonths || 3, computedMonthIdx || 1));

    return {
      currentBalance,
      totalWithdrawn,
      netProfit,
      progressPercent,
      profitGoal,
      actualPnl,
      pnlProgressPercent,
      currentMonthIdx
    };
  }, [activeChallenge, activeMilestonesPlan, liveLinkedStats]);

  // Handler to Create custom compounding Runway
  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseFloat(formStartBalance);
    const target = parseFloat(formTargetBalance);
    const months = parseInt(formDuration);
    const wd = parseFloat(formWdRate);

    if (isNaN(start) || start <= 0) {
      onShowToast('Please enter a valid positive starting balance.', 'error');
      return;
    }
    if (isNaN(target) || target <= start) {
      onShowToast('Target balance must exceed starting balance.', 'error');
      return;
    }
    if (isNaN(months) || months < 1 || months > 12) {
      onShowToast('Duration must be between 1 and 12 months.', 'error');
      return;
    }
    if (isNaN(wd) || wd < 0 || wd > 99) {
      onShowToast('Please set a monthly withdrawal rate between 0% and 99%.', 'error');
      return;
    }

    const newChall: Challenge = {
      id: generateUUID(),
      userId: 'local',
      title: formTitle.trim() || `My Compounding Challenge ($${start} to $${target})`,
      startBalance: start,
      targetBalance: target,
      durationMonths: months,
      withdrawalRate: wd,
      startDate: new Date().toISOString().substring(0, 10),
      accountId: formLinkAccountId && formLinkAccountId !== 'none' ? formLinkAccountId : undefined,
      monthlyProgress: Array.from({ length: months }, (_, i) => ({
        monthIndex: i + 1,
      })),
      createdAt: new Date().toISOString(),
      isActive: challenges.length === 0, // Make primary if first challenge
    };

    const updated = [...challenges.map(c => ({ ...c, isActive: false })), newChall];
    saveChallenges(updated);
    setActiveChallengeId(newChall.id);
    setFormTitle('');
    onShowToast('Challenge compounding runway successfully initiated!', 'success');
  };

  // Launch a Preset Challenge
  const handleLaunchPreset = (preset: PresetChallenge) => {
    const newChall: Challenge = {
      id: generateUUID(),
      userId: 'local',
      title: preset.title,
      startBalance: preset.startBalance,
      targetBalance: preset.targetBalance,
      durationMonths: preset.durationMonths,
      withdrawalRate: preset.withdrawalRate,
      startDate: new Date().toISOString().substring(0, 10),
      accountId: presetLinkAccountId && presetLinkAccountId !== 'none' ? presetLinkAccountId : undefined,
      monthlyProgress: Array.from({ length: preset.durationMonths }, (_, i) => ({
        monthIndex: i + 1,
      })),
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const updated = [...challenges.map(c => ({ ...c, isActive: false })), newChall];
    saveChallenges(updated);
    setActiveChallengeId(newChall.id);
    onShowToast(`Successfully launched "${preset.title}"!`, 'success');
  };

  // Delete a challenge
  const handleDeleteChallenge = (id: string) => {
    const filtered = challenges.filter(c => c && c.id !== id);
    if (filtered.length > 0) {
      if (id === activeChallengeId) {
        // Find first remaining challenge, make active
        const nextActive = filtered[0];
        if (nextActive) {
          nextActive.isActive = true;
          setActiveChallengeId(nextActive.id);
        }
      }
    } else {
      setActiveChallengeId('');
    }
    saveChallenges(filtered);
    onShowToast('Compounding challenge successfully removed.', 'info');
  };

  // Activate specific challenge
  const handleToggleActive = (id: string) => {
    const updated = challenges.map(c => ({
      ...c,
      isActive: c.id === id,
    }));
    saveChallenges(updated);
    setActiveChallengeId(id);
    onShowToast('Active compounding challenge calendar changed.', 'success');
  };

  // Save manual monthly actual metrics override
  const handleSaveMonthValues = (monthIndex: number) => {
    if (!activeChallenge) return;
    const balance = parseFloat(editActualBalance);
    const withdrawn = parseFloat(editActualWithdrawn);

    if (isNaN(balance) || balance < 0) {
      onShowToast('Please provide a valid actual balance.', 'error');
      return;
    }

    const updatedProgress = (activeChallenge.monthlyProgress || []).map(m => {
      if (m.monthIndex === monthIndex) {
        return {
          ...m,
          actualBalance: balance,
          actualWithdrawn: isNaN(withdrawn) ? 0 : withdrawn,
        };
      }
      return m;
    });

    const updatedChallenges = challenges.map(c => {
      if (c.id === activeChallengeId) {
        return {
          ...c,
          monthlyProgress: updatedProgress,
        };
      }
      return c;
    });

    saveChallenges(updatedChallenges);
    setEditingMonthIdx(null);
    setEditActualBalance('');
    setEditActualWithdrawn('');
    onShowToast(`Milestone Month ${monthIndex} logging updated!`, 'success');
  };

  const handleEditClick = (progress: MonthlyProgress) => {
    setEditingMonthIdx(progress.monthIndex);
    setEditActualBalance(progress.actualBalance !== undefined ? String(progress.actualBalance) : '');
    setEditActualWithdrawn(progress.actualWithdrawn !== undefined ? String(progress.actualWithdrawn) : '');
  };

  return (
    <div className="space-y-5 pb-10">
      
      {/* 1. Interactive Header Explainer Card */}
      <div className="text-left bg-cat-mantle border-2 border-cat-surface0 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 select-none">
        <div>
          <h2 className="text-base font-black text-cat-text tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cat-lavender animate-bounce" />
            Compounding Growth Challenges
          </h2>
          <p className="text-xs text-cat-subtext mt-1.5 max-w-xl">
            Gamify your financial discipline. Define a growth challenge roadmap (like <strong>{formatCurrency(50, activeCurrency)} to {formatCurrency(1000, activeCurrency)}</strong>), set automatic or manual monthly goals, and compound profits while tracking structured reward payouts.
          </p>
        </div>
        
        {challenges.length > 0 && (
          <div className="flex flex-col gap-1 text-center sm:text-right bg-cat-base border border-cat-surface0 px-3.5 py-1.5 rounded-2xl w-full sm:w-auto max-w-full sm:max-w-[340px] overflow-hidden shrink-0">
            <span className="text-[8px] text-cat-subtext font-black uppercase tracking-wider">Select Challenge</span>
            <select
              value={activeChallengeId}
              onChange={e => handleToggleActive(e.target.value)}
              className="bg-transparent text-xs font-black text-cat-text focus:outline-none border-0 p-0 cursor-pointer text-center sm:text-right uppercase w-full max-w-full truncate block"
            >
              {challenges.map(c => {
                const linkedAcc = accounts.find(a => a.id === c.accountId);
                const tag = linkedAcc ? ` [⛓️ ${linkedAcc.name} (${linkedAcc.currency})]` : ' [✏️ manual]';
                return (
                  <option key={c.id} value={c.id} className="bg-cat-mantle text-cat-text font-black text-xs">
                    {c.title.substring(0, 30)}{c.title.length > 30 ? '...' : ''}{tag}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Main Grid: Left is creation/presets, Right/Center is active simulation display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* LEFT COMPONENT COLUMN: Setup or Selection of Compound presets */}
        <div className="lg:col-span-1 space-y-5">
          {/* Custom Challenge Creator Form */}
          <div className="bg-white border-2 border-zinc-150 p-5 rounded-[24px] text-left">
            <h3 className="text-[10px] font-black tracking-widest text-zinc-900 uppercase flex items-center gap-1.5 mb-3.5">
              <PlusCircle className="h-4.5 w-4.5 text-zinc-700" /> Start Compounding Goal
            </h3>
            
            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Challenge Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 to 1K Compound"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Start Capital *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="50"
                    value={formStartBalance}
                    onChange={e => setFormStartBalance(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Target Capital *</label>
                  <input
                    type="number"
                    required
                    min="2"
                    placeholder="1000"
                    value={formTargetBalance}
                    onChange={e => setFormTargetBalance(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-mono font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Duration *</label>
                  <select
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-bold"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} Month{i > 0 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Withdraw rate (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="99"
                    title="Withdraw % of profit at end of each month"
                    placeholder="10"
                    value={formWdRate}
                    onChange={e => setFormWdRate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-mono font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black text-zinc-500 mb-1.5 uppercase tracking-wider pl-0.5">Link with Portfolio Account</label>
                <select
                  value={formLinkAccountId}
                  onChange={e => setFormLinkAccountId(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs px-3.5 py-3 rounded-xl focus:outline-none font-bold"
                >
                  <option value="none">❌ Manual Mode (Unlinked)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      ⛓️ Link to: {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
                <span className="text-[7.5px] text-zinc-400 mt-1 block leading-normal font-medium pl-0.5">
                  Tracks actual trades &amp; balance for the selected portfolio.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-800 transition transform active:scale-98 flex items-center justify-center gap-1 cursor-pointer"
              >
                Launch Custom Challenge <ArrowRight className="h-3 w-3" />
              </button>
            </form>
          </div>

          {/* Quick Preset Cards */}
          <div className="bg-white border-2 border-zinc-150 p-5 rounded-[24px] text-left">
            <h3 className="text-[10px] font-black tracking-widest text-zinc-900 uppercase flex items-center gap-1.5 mb-1 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
              <Compass className="h-4 w-4 text-zinc-700 font-bold" /> Challenge Presets
            </h3>
            <span className="text-[8px] text-zinc-400 uppercase tracking-widest block pl-3 mb-3.5">Fast compound blueprints</span>

            {/* Target Account Selector for Presets */}
            <div className="mb-4 bg-zinc-50 border border-zinc-150 p-3 rounded-xl space-y-1">
              <label className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider pl-0.5">Preset Target Account</label>
              <select
                value={presetLinkAccountId}
                onChange={e => setPresetLinkAccountId(e.target.value)}
                className="w-full bg-white border border-zinc-250 text-zinc-805 text-xs px-2.5 py-2 rounded-lg focus:outline-none font-bold cursor-pointer text-zinc-800"
              >
                <option value="none">❌ Manual Mode (Unlinked)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    ⛓️ Link to: {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {PRESETS.map((p, idx) => (
                <div 
                  key={idx}
                  className="p-3 border border-zinc-200 rounded-xl hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50/90 transition flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-[11px] font-black text-zinc-800 uppercase tracking-wide flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> {p.title}
                    </h4>
                    <p className="text-[9px] text-zinc-400 mt-1 leading-normal font-medium">{p.description}</p>
                  </div>
                  
                  <div className="mt-3 border-t border-zinc-200/60 pt-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] text-zinc-400 font-extrabold uppercase">comp rate</span>
                      <span className="text-[9px] font-mono font-black text-zinc-800">
                        {p.durationMonths} mths / {p.withdrawalRate}% WD
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLaunchPreset(p)}
                      className="text-[8px] font-black bg-zinc-900 hover:bg-zinc-800 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider cursor-pointer"
                    >
                      Deploy Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT BOARD COLUMN: Grid block with interactive details + milestone target calendar of compounds */}
        <div className="lg:col-span-2 space-y-5">
          {activeChallenge && activeMilestonesPlan && currentStatusOverview ? (
            <div className="bg-white border-2 border-zinc-150 p-5 rounded-[24px] text-left space-y-5">
              
              {/* Header Title with link status and delete */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center text-[7px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                      Active Challenge Run
                    </span>
                    {activeChallenge.accountId ? (
                      <span className="inline-flex items-center text-[7px] bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                        ⛓️ Linked to: {challengeAccount?.name || 'Deleted Account'} ({activeCurrency})
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[7px] bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        ✏️ manual mode (unlinked)
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight flex items-center gap-1.5">
                    {activeChallenge.title}
                  </h3>
                  <p className="text-[9px] text-zinc-400">
                    Started on <strong className="font-mono text-zinc-650 font-extrabold">{activeChallenge.startDate}</strong> ~ Expected final size is {formatCurrency(activeChallenge.targetBalance, activeCurrency)}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteChallenge(activeChallenge.id)}
                  className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition hover:bg-red-100 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Wipe Goal
                </button>
              </div>

              {/* Progress visual bar */}
              <div className="bg-[#fcfcfc] border border-zinc-150 p-4 rounded-xl space-y-4 select-none">
                
                {/* 1. Account Capital Pool Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-650">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-700">
                      🏦 Capital Pool Balance Progress
                    </span>
                    <span className="font-mono">{Math.min(100, Math.max(0, currentStatusOverview.progressPercent))}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden flex border border-zinc-200">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, currentStatusOverview.progressPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-extrabold text-zinc-400 font-mono">
                    <span>Initial: {formatCurrency(activeChallenge.startBalance, activeCurrency)}</span>
                    <span className="text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                      Balance: {formatCurrency(currentStatusOverview.currentBalance, activeCurrency)}
                    </span>
                    <span>Target: {formatCurrency(activeChallenge.targetBalance, activeCurrency)}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-100" />

                {/* 2. Pure Trade P&L Growth progress (User request: based on selected account's actual P&L) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-650">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-700">
                      📈 Realized Trade P&amp;L Progress
                    </span>
                    <span className={`font-mono ${currentStatusOverview.actualPnl >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {currentStatusOverview.pnlProgressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden flex border border-zinc-200">
                    <div
                      className={`${
                        currentStatusOverview.actualPnl >= 0 ? 'bg-blue-500' : 'bg-rose-500'
                      } h-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, currentStatusOverview.pnlProgressPercent))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-extrabold text-zinc-400 font-mono">
                    <span>Base P&amp;L: {formatCurrency(0, activeCurrency)}</span>
                    <span className={`font-black px-1.5 py-0.5 rounded-lg border ${
                      currentStatusOverview.actualPnl >= 0 
                        ? 'text-blue-700 bg-blue-50 border-blue-100' 
                        : 'text-rose-700 bg-rose-50 border-rose-100'
                    }`}>
                      Realized P&amp;L: {currentStatusOverview.actualPnl >= 0 ? '+' : ''}{formatCurrency(currentStatusOverview.actualPnl, activeCurrency)}
                    </span>
                    <span>Profit Goal: +{formatCurrency(currentStatusOverview.profitGoal, activeCurrency)}</span>
                  </div>
                </div>

              </div>

              {/* Live Challenge Metrics Stats Bento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* 1. Raw required gain monthly */}
                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-wider">Required Gain / Mo</span>
                  <div className="mt-1">
                    <span className="text-sm font-black font-mono text-zinc-800 tracking-tight block">
                      +{parseFloat((activeMilestonesPlan.monthlyGrowthRateRaw * 100).toFixed(1))}%
                    </span>
                    <span className="text-[7.5px] text-zinc-400 block font-bold leading-none mt-0.5">BEFORE WD CUTS</span>
                  </div>
                </div>

                {/* 2. Achieved Gains */}
                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-wider">Net Gains Achieved</span>
                  <div className="mt-1">
                    <span className={`text-sm font-black font-mono tracking-tight block ${
                      currentStatusOverview.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {currentStatusOverview.netProfit >= 0 ? '+' : ''}{formatCurrency(currentStatusOverview.netProfit, activeCurrency)}
                    </span>
                    <span className="text-[7.5px] text-zinc-400 block font-bold leading-none mt-0.5">NET PROFIT TOTAL</span>
                  </div>
                </div>

                {/* 3. Withdrawals Simulated */}
                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-wider">Profits Harvested</span>
                  <div className="mt-1 border-0">
                    <span className="text-sm font-black font-mono text-zinc-800 tracking-tight block">
                      {formatCurrency(currentStatusOverview.totalWithdrawn, activeCurrency)}
                    </span>
                    <span className="text-[7.5px] text-zinc-400 block font-bold leading-none mt-0.5">WD SIMULATED</span>
                  </div>
                </div>

                {/* 4. Active Month Indicator */}
                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-wider">Current Run Period</span>
                  <div className="mt-1">
                    <span className="text-sm font-black font-mono text-zinc-800 tracking-tight block">
                      Month {currentStatusOverview.currentMonthIdx}
                    </span>
                    <span className="text-[7.5px] text-zinc-400 block font-bold leading-none mt-0.5">OF {activeChallenge.durationMonths} MONTHS</span>
                  </div>
                </div>
              </div>

              {/* Informative advice note */}
              {activeChallenge.withdrawalRate > 0 && (
                <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-xl flex items-start gap-2.5">
                  <HelpCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5 font-bold" />
                  <p className="text-[10px] text-zinc-650 leading-relaxed font-bold">
                    This compound trajectory simulates a monthly <strong>{activeChallenge.withdrawalRate}% profit cash-out (WD)</strong>. 
                    This means at the end of each month, {activeChallenge.withdrawalRate}% of your realized compound gains are withdrawn to celebrate, 
                    requiring a raw trading gain rate of <strong className="font-mono text-zinc-800">+{parseFloat((activeMilestonesPlan.monthlyGrowthRateRaw * 100).toFixed(1))}%</strong> in your account to securely satisfy compound targets!
                  </p>
                </div>
              )}

              {/* Milestones Monthly Breakdown List / Road calendar */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b pb-1.5 border-zinc-100">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">
                    🎯 Month-by-Month Compounding Calendar ({activeChallenge?.durationMonths} Months)
                  </h4>
                  <span className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider">Setup: {activeChallenge.withdrawalRate}% WD rate</span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {activeMilestonesPlan.milestones.map((planned, idx) => {
                    const progressState = (activeChallenge.monthlyProgress || []).find(m => m && m.monthIndex === planned.monthIndex);
                    
                    // Flags to determine state
                    const actualBalance = progressState?.actualBalance;
                    const isPassed = actualBalance !== undefined && actualBalance >= planned.targetBalance;
                    const isLogged = actualBalance !== undefined;
                    const isActivePeriod = planned.monthIndex === currentStatusOverview.currentMonthIdx;
                    
                    const isEditing = editingMonthIdx === planned.monthIndex;

                    return (
                      <div 
                        key={idx}
                        className={`p-4 border rounded-2xl transition duration-150 ${
                          isPassed 
                            ? 'bg-emerald-50/20 border-emerald-250/90' 
                            : isActivePeriod 
                              ? 'bg-zinc-50/90 border-zinc-350/90 shadow-sm ring-2 ring-zinc-950/5' 
                              : 'bg-white border-zinc-200 hover:bg-zinc-50/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left text elements */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border leading-none ${
                                isPassed 
                                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/10' 
                                  : isActivePeriod 
                                    ? 'bg-zinc-900 border border-transparent text-white' 
                                    : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                              }`}>
                                Month {planned.monthIndex}
                              </span>
                              {isPassed && (
                                <span className="inline-flex items-center gap-1 text-[8px] text-emerald-800 font-extrabold uppercase bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200 select-none">
                                  <CheckCircle className="h-3 w-3 inline" /> Achieved
                                </span>
                              )}
                              {!isPassed && isLogged && (
                                <span className="inline-flex items-center gap-1 text-[8px] text-amber-800 font-extrabold uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-205 select-none">
                                  Logged
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div>
                                <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-black block">Start Balance</span>
                                <span className="font-mono text-zinc-800 font-extrabold">
                                  {formatCurrency(planned.startBalance, activeCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-black block">Compound Target</span>
                                <span className="font-mono text-zinc-900 font-black">
                                  {formatCurrency(planned.targetBalance, activeCurrency)} 
                                  {planned.withdrawal > 0 && <span className="text-[9px] text-zinc-400 font-bold"> (after WD)</span>}
                                </span>
                              </div>
                            </div>

                            {/* Withdrawal/Raw profit hints */}
                            {planned.withdrawal > 0 && (
                              <div className="flex items-center gap-2 pt-1">
                                <CornerDownRight className="h-3.5 w-3.5 text-zinc-400" />
                                <div className="flex items-center gap-2.5 text-[8.5px] text-zinc-400 font-bold">
                                  <span>Simulated Profit: <strong className="font-mono text-zinc-700">{formatCurrency(planned.rawProfit, activeCurrency)}</strong></span>
                                  <span>•</span>
                                  <span className="text-emerald-700 bg-emerald-50/65 px-1 rounded">WD Reward: <strong className="font-mono">{formatCurrency(planned.withdrawal, activeCurrency)}</strong></span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right interactive logger / editor */}
                          <div className="shrink-0 flex items-center justify-end sm:border-l sm:border-zinc-150 sm:pl-4 min-w-[140px] select-none">
                            {isEditing ? (
                              <div className="space-y-2 w-full max-w-[170px]">
                                <div>
                                  <label className="block text-[7.5px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">End Balance</label>
                                  <input
                                    type="number"
                                    placeholder={String(planned.targetBalance)}
                                    value={editActualBalance}
                                    onChange={e => setEditActualBalance(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-[10px] px-2 py-1 rounded focus:outline-none font-mono font-bold"
                                  />
                                </div>
                                {activeChallenge.withdrawalRate > 0 && (
                                  <div>
                                    <label className="block text-[7.5px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">Actual WD Cash</label>
                                    <input
                                      type="number"
                                      placeholder={String(planned.withdrawal)}
                                      value={editActualWithdrawn}
                                      onChange={e => setEditActualWithdrawn(e.target.value)}
                                      className="w-full bg-zinc-50 border border-zinc-200 text-zinc-800 text-[10px] px-2 py-1 rounded focus:outline-none font-mono font-bold"
                                    />
                                  </div>
                                )}
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveMonthValues(planned.monthIndex)}
                                    className="flex-1 bg-zinc-900 border border-transparent text-white font-black text-[7.5px] uppercase tracking-wider py-1.5 rounded flex items-center justify-center gap-0.5 cursor-pointer"
                                  >
                                    <Save className="h-3 w-3 shrink-0" /> Log
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMonthIdx(null)}
                                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-extrabold text-[7.5px] uppercase py-1.5 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1.5 text-right w-full">
                                {isLogged ? (
                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] text-zinc-400 font-extrabold uppercase block font-medium">Logged Balance</span>
                                    <strong className="font-mono text-[11px] text-zinc-800 block">
                                      {formatCurrency(progressState?.actualBalance || 0, activeCurrency)}
                                    </strong>
                                    {(progressState?.actualWithdrawn || 0) > 0 && (
                                      <span className="text-[8px] text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded font-bold font-mono">
                                        WD: {formatCurrency(progressState?.actualWithdrawn || 0, activeCurrency)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[8.5px] text-zinc-400 font-black uppercase tracking-wide block">
                                    No records logged
                                  </span>
                                )}
                                
                                {!activeChallenge.accountId && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditClick(progressState || { monthIndex: planned.monthIndex })}
                                    className="text-[8.5px] font-black text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-205 border border-zinc-200 px-3 py-1 rounded-xl uppercase tracking-wider cursor-pointer flex items-center gap-0.5"
                                  >
                                    <Edit3 className="h-3 w-3 shrink-0" /> Log actuals
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border-2 border-zinc-150 p-10 rounded-[24px] text-center flex flex-col items-center justify-center space-y-4">
              <Trophy className="h-14 w-14 text-zinc-300 stroke-1 animate-pulse" />
              <div>
                <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">No Active Compound Challenge Started</h3>
                <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Join compounding traders. Deploy one of our pre-configured speed-run challenge presets from the left sidebar, or create a custom compound profile!
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
