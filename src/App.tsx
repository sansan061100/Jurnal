/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Globe,
  Database,
  Sliders,
  Sparkles,
  Award,
  LogOut,
  ArrowRight,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Types
import { Account, Trade, TradeAction, TradeSession, TradingPair, BalanceTransaction } from './types';

// Import Utils
import {
  calculateStatistics,
  formatCurrency,
  formatPercent,
  generateEquityCurveData,
  generateDailyPnlData,
  TRADING_STRATEGIES_LIST,
  detectTradingSession,
  DEFAULT_TRADING_PAIRS,
  getTradeStatus
} from './utils';

// Import Subcomponents
import SettingsDrawer from './components/SettingsDrawer';
import AccountModal from './components/AccountModal';
import TradeModal from './components/TradeModal';
import PairsModal from './components/PairsModal';
import OverviewTab from './components/OverviewTab';
import CalendarTab from './components/CalendarTab';
import TradesTab from './components/TradesTab';
import CalculatorTab from './components/CalculatorTab';
import ConfirmModal from './components/ConfirmModal';
import ImportModal from './components/ImportModal';

export default function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('tj_local_user');
    if (saved) return JSON.parse(saved);
    const defaultUser = {
      uid: 'local-trader-id',
      displayName: 'Trader',
      avatar: '📊',
      currency: 'USD',
      isLocal: true,
    };
    localStorage.setItem('tj_local_user', JSON.stringify(defaultUser));
    return defaultUser;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- CORE DATA STATE ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balanceTransactions, setBalanceTransactions] = useState<BalanceTransaction[]>([]);
  const [customPairs, setCustomPairs] = useState<TradingPair[]>(DEFAULT_TRADING_PAIRS);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'calendar' | 'calculator'>('overview');

  // Force Minimalism Light Theme on load
  useEffect(() => {
    const body = document.body;
    body.classList.add('light');
  }, []);

  // Drawer / Modal overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isPairsModalOpen, setIsPairsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Editing Modals State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPair, setFilterPair] = useState('ALL');
  const [filterSession, setFilterSession] = useState('ALL');
  const [filterOutcome, setFilterOutcome] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Custom confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 4, 20)); // May 2026 default
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  // Toast notifications State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Trigger brief alert popup
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };



  // Sync core local storage states
  useEffect(() => {
    if (!currentUser) {
      setAccounts([]);
      setTrades([]);
      setBalanceTransactions([]);
      setActiveAccountId('');
      return;
    }

    const storedAccountStr = localStorage.getItem('tj_local_accounts');
    const storedTradeStr = localStorage.getItem('tj_local_trades');
    const storedTxStr = localStorage.getItem('tj_local_tx');

    let localAccounts: Account[] = [];
    let localTrades: Trade[] = [];
    let localTx: BalanceTransaction[] = [];

    try { localAccounts = storedAccountStr ? JSON.parse(storedAccountStr) : []; } catch (e) { console.error(e); }
    try { localTrades = storedTradeStr ? JSON.parse(storedTradeStr) : []; } catch (e) { console.error(e); }
    try { localTx = storedTxStr ? JSON.parse(storedTxStr) : []; } catch (e) { console.error(e); }

    setAccounts(localAccounts);
    setTrades(localTrades);
    setBalanceTransactions(localTx);

    if (localAccounts.length > 0) {
      setActiveAccountId(localAccounts[0].id);
    } else {
      setActiveAccountId('');
    }
  }, [currentUser]);

  // --- PERSIST KUSTOM PAIRS (LOCAL ONLY OR STATIC IS PREFERABLE) ---
  useEffect(() => {
    const savedPairs = localStorage.getItem('tj_custom_pairs');
    if (savedPairs) {
      try {
        setCustomPairs(JSON.parse(savedPairs));
      } catch (e) {
        setCustomPairs(DEFAULT_TRADING_PAIRS);
      }
    }
  }, []);

  const savePairsToStorage = (updatedPairs: TradingPair[]) => {
    setCustomPairs(updatedPairs);
    localStorage.setItem('tj_custom_pairs', JSON.stringify(updatedPairs));
    showToast('Custom asset symbols successfully updated!', 'success');
  };

  // --- ACTIVE DATA RESOLVERS ---
  const activeAccount = useMemo(() => {
    if (!activeAccountId) return accounts[0] || null;
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || null;
  }, [activeAccountId, accounts]);

  const activeAccountTrades = useMemo(() => {
    if (!activeAccount) return [];
    return trades.filter(t => t.accountId === activeAccount.id);
  }, [activeAccount, trades]);

  const stats = useMemo(() => {
    if (!activeAccount) {
      return {
        startingBalance: 0,
        netProfit: 0,
        currentBalance: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        maxDrawdownVal: 0,
        totalTrades: 0,
        wonTrades: 0,
        lostTrades: 0,
        breakevenTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        bestTrade: 0,
        worstTrade: 0,
        grossProfit: 0,
        grossLoss: 0,
        totalRMultiple: 0,
        avgRMultiple: 0
      };
    }
    return calculateStatistics(activeAccount, activeAccountTrades, balanceTransactions);
  }, [activeAccount, activeAccountTrades, balanceTransactions]);

  // Chart datasets
  const equityCurveDataset = useMemo(() => {
    if (!activeAccount) return [];
    return generateEquityCurveData(activeAccount, activeAccountTrades, balanceTransactions);
  }, [activeAccount, activeAccountTrades, balanceTransactions]);

  const dailyPnlDataset = useMemo(() => {
    return generateDailyPnlData(activeAccountTrades);
  }, [activeAccountTrades]);

  // FILTERED TRADES FOR SEARCH / RECENT list
  const filteredTrades = useMemo(() => {
    let result = [...activeAccountTrades];

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        t =>
          t.pair.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }

    if (filterPair !== 'ALL') {
      result = result.filter(t => t.pair === filterPair);
    }
    if (filterSession !== 'ALL') {
      result = result.filter(t => t.session === filterSession);
    }
    if (filterOutcome !== 'ALL') {
      if (filterOutcome === 'WIN') {
        result = result.filter(t => getTradeStatus(t) === 'WIN');
      } else if (filterOutcome === 'LOSS') {
        result = result.filter(t => getTradeStatus(t) === 'LOSS');
      } else if (filterOutcome === 'BREAKEVEN') {
        result = result.filter(t => getTradeStatus(t) === 'BE');
      }
    }

    result.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    return result;
  }, [activeAccountTrades, searchTerm, filterPair, filterSession, filterOutcome]);

  const paginatedTrades = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPair, filterSession, filterOutcome]);

  // --- PERSISTENCE CLOUD HANDLERS ---
  const handleOpenAccountModal = (acc: Account | null = null) => {
    setEditingAccount(acc);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (form: any) => {
    if (!currentUser) return;
    try {
      const id = editingAccount ? editingAccount.id : `acc-${Date.now()}`;
      const payload: Account = {
        id,
        userId: currentUser.uid,
        name: form.name.trim(),
        startingBalance: form.startingBalance,
        currency: form.currency,
        broker: form.broker.trim(),
        leverage: form.leverage.trim(),
        description: form.description.trim(),
        createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
        type: 'STANDARD',
      };

      const updatedAccounts = editingAccount
        ? accounts.map(a => a.id === id ? payload : a)
        : [...accounts, payload];
      setAccounts(updatedAccounts);
      localStorage.setItem('tj_local_accounts', JSON.stringify(updatedAccounts));
      showToast(editingAccount ? 'Account settings updated successfully!' : 'New portfolio account registered!', 'success');
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      
      if (!activeAccountId || activeAccountId === '') {
        setActiveAccountId(id);
      }
    } catch (e) {
      showToast('Failed to save account settings.', 'error');
    }
  };

  const handleDeleteAccount = (id: string) => {
    if (!currentUser) return;
    const accToRemove = accounts.find(a => a.id === id);
    if (!accToRemove) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Portfolio Account',
      message: `Are you sure you want to permanently delete "${accToRemove.name}" and all its transaction history from local storage? This action cannot be undone.`,
      confirmText: 'Yes, Delete Permanently',
      isDanger: true,
      onConfirm: () => {
        try {
          const updatedAccs = accounts.filter(a => a.id !== id);
          const updatedTrades = trades.filter(t => t.accountId !== id);
          const updatedTx = balanceTransactions.filter(tx => tx.accountId !== id);

          setAccounts(updatedAccs);
          setTrades(updatedTrades);
          setBalanceTransactions(updatedTx);

          localStorage.setItem('tj_local_accounts', JSON.stringify(updatedAccs));
          localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
          localStorage.setItem('tj_local_tx', JSON.stringify(updatedTx));

          showToast(`Portfolio "${accToRemove.name}" was successfully deleted from local storage.`, 'info');
          if (activeAccountId === id) {
            setActiveAccountId(updatedAccs[0]?.id || '');
          }
        } catch (e) {
          showToast('Failed to delete the portfolio account.', 'error');
        }
      }
    });
  };

  const handleOpenTradeModal = (trade: Trade | null = null) => {
    if (!activeAccount) {
      alert('Please create a portfolio account first before logging transactions!');
      return;
    }
    setEditingTrade(trade);
    setIsTradeModalOpen(true);
  };

  const handleSaveTrade = (form: any) => {
    if (!currentUser || !activeAccount) return;
    try {
      const id = editingTrade ? editingTrade.id : `trade-${Date.now()}`;
      const payload: Trade = {
        id,
        accountId: activeAccount.id,
        userId: currentUser.uid,
        pair: form.pair,
        action: form.action,
        lotSize: form.lotSize,
        entryPrice: form.entryPrice,
        exitPrice: form.exitPrice,
        pnl: form.pnl,
        entryDate: form.entryDate,
        exitDate: form.exitDate,
        session: form.session,
        notes: form.notes || '',
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        rrRatio: form.rrRatio,
        rMultiple: form.rMultiple,
        disciplineRating: form.disciplineRating
      };

      const updatedTrades = editingTrade
        ? trades.map(t => t.id === id ? payload : t)
        : [...trades, payload];
      setTrades(updatedTrades);
      localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
      showToast(editingTrade ? 'Transaction updated successfully!' : 'New trade transaction logged successfully!', 'success');
      setIsTradeModalOpen(false);
      setEditingTrade(null);
    } catch (e) {
      showToast('Failed to log the transaction.', 'error');
    }
  };

  const handleDeleteTrade = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction from your journal permanently?',
      confirmText: 'Yes, Delete',
      isDanger: true,
      onConfirm: () => {
        try {
          const updatedTrades = trades.filter(t => t.id !== id);
          setTrades(updatedTrades);
          localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
          showToast('Transaction deleted from performance logs.', 'info');
        } catch (e) {
          showToast('Failed to delete the transaction.', 'error');
        }
      }
    });
  };

  const handleAddBalanceTransaction = (type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, notes: string) => {
    if (!currentUser || !activeAccount) return;
    try {
      const id = `tx-${Date.now()}`;
      const payload: BalanceTransaction = {
        id,
        accountId: activeAccount.id,
        userId: currentUser.uid,
        type,
        amount,
        date: new Date().toISOString(),
        notes: notes.trim() || (type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal')
      };

      const updatedTx = [...balanceTransactions, payload];
      setBalanceTransactions(updatedTx);
      localStorage.setItem('tj_local_tx', JSON.stringify(updatedTx));
      showToast('Balance ledger updated successfully!', 'success');
    } catch (e) {
      showToast('Failed to record balance transaction.', 'error');
    }
  };

  const handleDeleteBalanceTransaction = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Transaction',
      message: 'Are you sure you want to revoke this transaction? Your capital balance will be re-adjusted immediately.',
      confirmText: 'Yes, Revoke',
      isDanger: true,
      onConfirm: () => {
        try {
          const updatedTx = balanceTransactions.filter(tx => tx.id !== id);
          setBalanceTransactions(updatedTx);
          localStorage.setItem('tj_local_tx', JSON.stringify(updatedTx));
          showToast('Ledger transaction revoked.', 'info');
        } catch (e) {
          showToast('Failed to revoke balance transaction.', 'error');
        }
      }
    });
  };

  const handleImportTrades = (importedTrades: Trade[]) => {
    try {
      const updatedTrades = [...trades, ...importedTrades];
      setTrades(updatedTrades);
      localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
      showToast(`Imported ${importedTrades.length} transactions into portfolio successfully!`, 'success');
      setIsImportModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to commit imported transaction records.', 'error');
    }
  };

  const clearAllData = () => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Wipe All Portfolio Data',
      message: 'Are you sure you want to wipe all registered portfolios, transaction ledgers, and database entries? This action is absolutely irreversible.',
      confirmText: 'Yes, Wipe Everything',
      isDanger: true,
      onConfirm: () => {
        try {
          setAccounts([]);
          setTrades([]);
          setBalanceTransactions([]);
          localStorage.removeItem('tj_local_accounts');
          localStorage.removeItem('tj_local_trades');
          localStorage.removeItem('tj_local_tx');
          showToast('All local database statistics successfully wiped.', 'info');
          setActiveAccountId('');
        } catch (e) {
          showToast('Failed to clear database logs.', 'error');
        }
      }
    });
  };

  // --- RENDER PORTALS ---

  return (
    <div className="h-screen w-screen bg-cat-base text-zinc-950 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Sleek Modern Minimalist App frame taking full viewport */}
      <div className="w-full h-full bg-white relative flex flex-col flex-1 overflow-hidden">
        
        {/* Dynamic Top App Header */}
        <header className="bg-cat-mantle border-b border-zinc-200/80 shrink-0 z-30">
          <div className="w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 border border-zinc-200 bg-zinc-50 text-cat-text flex items-center justify-center font-bold text-sm uppercase rounded-lg">
                {activeAccount?.name ? activeAccount.name.charAt(0).toUpperCase() : '➕'}
              </div>
              <div className="text-left">
                <span className="text-[8px] text-zinc-400 font-extrabold uppercase tracking-widest block leading-none">
                  TRADING ACCOUNT
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs font-bold text-cat-text hover:text-zinc-500 transition flex items-center gap-1 mt-1 leading-none cursor-pointer uppercase tracking-wider"
                >
                  {activeAccount?.name || 'Create Account'} ▾
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">


              {/* Quick Add Trade button */}
              {accounts.length > 0 && (
                <button
                  onClick={() => handleOpenTradeModal(null)}
                  title="Log New Operation"
                  className="bg-zinc-900 hover:bg-zinc-800 text-white p-2 rounded-lg border border-transparent transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 font-bold" />
                </button>
              )}

              {/* Quick settings gear drawer */}
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="p-2 border border-zinc-200 rounded-lg bg-zinc-50/50 hover:bg-zinc-100 text-cat-text transition cursor-pointer"
              >
                <Sliders className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Toast Alert Popup */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 12 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-16 left-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold leading-relaxed ${
                toast.type === 'success'
                  ? 'bg-cat-green/10 text-cat-green border-cat-green/20'
                  : toast.type === 'error'
                  ? 'bg-cat-red/10 text-cat-red border-cat-red/20'
                  : 'bg-cat-blue/10 text-cat-blue border-cat-blue/20'
              }`}
            >
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main core view */}
        <main className="flex-1 w-full overflow-y-auto px-4 py-6 pb-6 relative scrollbar-none">
          
          {/* ONBOARDING MANDATE SCREEN */}
          {accounts.length === 0 ? (
            <div className="absolute inset-0 bg-cat-base z-30 flex flex-col items-center justify-center px-6 py-8 text-center select-none">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-cat-mantle border-2 border-cat-surface0 rounded-[32px] p-6 space-y-5 shadow-xl max-w-xs"
              >
                <div className="w-12 h-12 bg-cat-mauve/15 rounded-2xl flex items-center justify-center text-cat-mauve mx-auto border-2 border-cat-surface0">
                  <Award className="h-6 w-6 stroke-[2]" />
                </div>
                
                <div className="space-y-1.5">
                  <h2 className="text-sm font-black text-cat-text uppercase tracking-widest">Register Your First Portfolio</h2>
                  <p className="text-[11px] text-cat-subtext leading-relaxed font-bold">
                     Welcome! To start logging, charting, and evaluating your transaction operations, please register your first portfolio account.
                  </p>
                </div>

                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="w-full py-3.5 bg-cat-peach hover:bg-cat-yellow text-cat-base border-2 border-cat-surface0 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Register Portfolio</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  setActiveAccountId={setActiveAccountId}
                  activeAccountTrades={activeAccountTrades}
                  stats={stats}
                  equityCurveDataset={equityCurveDataset}
                  dailyPnlDataset={dailyPnlDataset}
                  balanceTransactions={balanceTransactions}
                  onAddBalanceTransaction={handleAddBalanceTransaction}
                  onDeleteBalanceTransaction={handleDeleteBalanceTransaction}
                  customPairs={customPairs}
                />
              )}

              {activeTab === 'trades' && (
                <TradesTab
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  filterPair={filterPair}
                  setFilterPair={setFilterPair}
                  filterSession={filterSession}
                  setFilterSession={setFilterSession}
                  filterOutcome={filterOutcome}
                  setFilterOutcome={setFilterOutcome}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalPages={totalPages}
                  paginatedTrades={paginatedTrades}
                  customPairs={customPairs}
                  onEditTrade={handleOpenTradeModal}
                  onDeleteTrade={handleDeleteTrade}
                  filteredTrades={filteredTrades}
                  activeAccountTradesCount={activeAccountTrades.length}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarTab
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  activeAccountTrades={activeAccountTrades}
                  calendarDate={calendarDate}
                  setCalendarDate={setCalendarDate}
                  selectedCalendarDay={selectedCalendarDay}
                  setSelectedCalendarDay={setSelectedCalendarDay}
                />
              )}

              {activeTab === 'calculator' && (
                <CalculatorTab
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  stats={stats}
                  customPairs={customPairs}
                />
              )}
            </>
          )}
        </main>

        {/* Sleek Fixed Bottom Tab Navigation */}
        {accounts.length > 0 && (
          <nav className="bg-white border-t border-zinc-100/80 z-40 select-none shrink-0 w-full">
            <div className="max-w-md mx-auto grid grid-cols-4 gap-1 py-1.5 px-2">
              {/* Overview Tab Button */}
              <button
                onClick={() => setActiveTab('overview')}
                disabled={accounts.length === 0}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 select-none ${
                  activeTab === 'overview'
                    ? 'text-zinc-950 bg-zinc-50 font-bold'
                    : 'text-zinc-400 hover:text-zinc-600 bg-transparent'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Overview</span>
              </button>

              {/* Trades Tab Button */}
              <button
                onClick={() => setActiveTab('trades')}
                disabled={accounts.length === 0}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 select-none ${
                  activeTab === 'trades'
                    ? 'text-zinc-950 bg-zinc-50 font-bold'
                    : 'text-zinc-400 hover:text-zinc-600 bg-transparent'
                }`}
              >
                <div className="relative flex flex-col items-center justify-center gap-1">
                  <Database className="h-4 w-4" />
                  {activeAccountTrades.length > 0 && (
                    <span className="absolute -top-1 -right-3.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-zinc-900 text-white text-[8px] font-bold px-1 select-none leading-none">
                      {activeAccountTrades.length}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold">Ledger</span>
              </button>

              {/* Calendar Tab Button */}
              <button
                onClick={() => setActiveTab('calendar')}
                disabled={accounts.length === 0}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 select-none ${
                  activeTab === 'calendar'
                    ? 'text-zinc-950 bg-zinc-50 font-bold'
                    : 'text-zinc-400 hover:text-zinc-600 bg-transparent'
                }`}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Calendar</span>
              </button>

              {/* Risk Calculator Tab Button */}
              <button
                onClick={() => setActiveTab('calculator')}
                disabled={accounts.length === 0}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 select-none ${
                  activeTab === 'calculator'
                    ? 'text-zinc-950 bg-zinc-50 font-bold'
                    : 'text-zinc-400 hover:text-zinc-600 bg-transparent'
                }`}
              >
                <Calculator className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Calculator</span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* --- DRAWERS & DIALOG OVERLAYS --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            accounts={accounts}
            activeAccountId={activeAccountId}
            setActiveAccountId={setActiveAccountId}
            activeAccount={activeAccount}
            activeAccountTrades={activeAccountTrades}
            stats={stats}
            onOpenAccountModal={handleOpenAccountModal}
            onDeleteAccount={handleDeleteAccount}
            onClearAllData={clearAllData}
            onOpenPairsModal={() => setIsPairsModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAccountModalOpen && (
          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
            editingAccount={editingAccount}
            onSave={handleSaveAccount}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTradeModalOpen && (
          <TradeModal
            isOpen={isTradeModalOpen}
            onClose={() => setIsTradeModalOpen(false)}
            accounts={accounts}
            activeAccountId={activeAccountId}
            editingTrade={editingTrade}
            customPairs={customPairs}
            onSavePairs={savePairsToStorage}
            onSave={handleSaveTrade}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPairsModalOpen && (
          <PairsModal
            isOpen={isPairsModalOpen}
            onClose={() => setIsPairsModalOpen(false)}
            customPairs={customPairs}
            onSavePairs={savePairsToStorage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportModalOpen && (
          <ImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            activeAccountId={activeAccountId}
            userId={currentUser?.uid || 'local-trader-id'}
            onImportSuccess={handleImportTrades}
            customPairs={customPairs}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            isDanger={confirmModal.isDanger !== false}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
