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
  ArrowRight
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
  DEFAULT_TRADING_PAIRS
} from './utils';

// Import Subcomponents
import SettingsDrawer from './components/SettingsDrawer';
import AccountModal from './components/AccountModal';
import TradeModal from './components/TradeModal';
import PairsModal from './components/PairsModal';
import OverviewTab from './components/OverviewTab';
import CalendarTab from './components/CalendarTab';
import TradesTab from './components/TradesTab';
import AuthScreen from './components/AuthScreen';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('tj_local_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- CORE DATA STATE ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [balanceTransactions, setBalanceTransactions] = useState<BalanceTransaction[]>([]);
  const [customPairs, setCustomPairs] = useState<TradingPair[]>(DEFAULT_TRADING_PAIRS);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'calendar'>('overview');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('tj_theme') as 'light' | 'dark') || 'dark';
  });

  // Drawer / Modal overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isPairsModalOpen, setIsPairsModalOpen] = useState(false);

  // Editing Modals State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPair, setFilterPair] = useState('ALL');
  const [filterSession, setFilterSession] = useState('ALL');
  const [filterStrategy, setFilterStrategy] = useState('ALL');
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

  // Theme observer
  useEffect(() => {
    localStorage.setItem('tj_theme', theme);
    const body = document.body;
    if (theme === 'light') {
      body.classList.add('light');
    } else {
      body.classList.remove('light');
    }
  }, [theme]);

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
    showToast('Daftar pair kustom berhasil diperbarui!', 'success');
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
          t.strategy.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }

    if (filterPair !== 'ALL') {
      result = result.filter(t => t.pair === filterPair);
    }
    if (filterSession !== 'ALL') {
      result = result.filter(t => t.session === filterSession);
    }
    if (filterStrategy !== 'ALL') {
      result = result.filter(t => t.strategy === filterStrategy);
    }
    if (filterOutcome !== 'ALL') {
      if (filterOutcome === 'WIN') {
        result = result.filter(t => t.pnl > 0.01);
      } else if (filterOutcome === 'LOSS') {
        result = result.filter(t => t.pnl < -0.01);
      } else if (filterOutcome === 'BREAKEVEN') {
        result = result.filter(t => Math.abs(t.pnl) <= 0.01);
      }
    }

    result.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    return result;
  }, [activeAccountTrades, searchTerm, filterPair, filterSession, filterStrategy, filterOutcome]);

  const paginatedTrades = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPair, filterSession, filterStrategy, filterOutcome]);

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
      showToast(editingAccount ? 'Informasi akun berhasil diubah!' : 'Akun trading baru telah didaftarkan!', 'success');
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      
      if (!activeAccountId || activeAccountId === '') {
        setActiveAccountId(id);
      }
    } catch (e) {
      showToast('Gagal menyimpan akun.', 'error');
    }
  };

  const handleDeleteAccount = (id: string) => {
    if (!currentUser) return;
    const accToRemove = accounts.find(a => a.id === id);
    if (!accToRemove) return;

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun Jurnal',
      message: `Yakin ingin menghapus secara permanen akun "${accToRemove.name}" beserta seluruh histori transaksi & riwayat dananya dari penyimpanan lokal? Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Ya, Hapus Permanen',
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

          showToast(`Akun "${accToRemove.name}" beserta datanya berhasil dihapus.`, 'info');
          if (activeAccountId === id) {
            setActiveAccountId(updatedAccs[0]?.id || '');
          }
        } catch (e) {
          showToast('Gagal menghapus akun.', 'error');
        }
      }
    });
  };

  const handleOpenTradeModal = (trade: Trade | null = null) => {
    if (!activeAccount) {
      alert('Silakan buat akun trading terlebih dahulu sebelum mencatat transaksi!');
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
        strategy: form.strategy,
        notes: form.notes || '',
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        rrRatio: form.rrRatio,
        rMultiple: form.rMultiple
      };

      const updatedTrades = editingTrade
        ? trades.map(t => t.id === id ? payload : t)
        : [...trades, payload];
      setTrades(updatedTrades);
      localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
      showToast(editingTrade ? 'Transaksi berhasil diperbarui!' : 'Transaksi baru berhasil disimpan di jurnal!', 'success');
      setIsTradeModalOpen(false);
      setEditingTrade(null);
    } catch (e) {
      showToast('Gagal menyimpan transaksi.', 'error');
    }
  };

  const handleDeleteTrade = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Transaksi',
      message: 'Hapus transaksi ini dari jurnal Anda secara permanen?',
      confirmText: 'Ya, Hapus',
      isDanger: true,
      onConfirm: () => {
        try {
          const updatedTrades = trades.filter(t => t.id !== id);
          setTrades(updatedTrades);
          localStorage.setItem('tj_local_trades', JSON.stringify(updatedTrades));
          showToast('Transaksi berhasil dihapus dari jurnal.', 'info');
        } catch (e) {
          showToast('Gagal menghapus transaksi.', 'error');
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
        notes: notes.trim() || (type === 'DEPOSIT' ? 'Deposit saldo' : 'Withdraw saldo')
      };

      const updatedTx = [...balanceTransactions, payload];
      setBalanceTransactions(updatedTx);
      localStorage.setItem('tj_local_tx', JSON.stringify(updatedTx));
      showToast('Transaksi mutasi saldo berhasil disimpan!', 'success');
    } catch (e) {
      showToast('Gagal mutasi saldo.', 'error');
    }
  };

  const handleDeleteBalanceTransaction = (id: string) => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Batalkan Mutasi',
      message: 'Batal mutasi transaksi ini? Saldo Anda akan disesuaikan secara otomatis.',
      confirmText: 'Ya, Batalkan',
      isDanger: true,
      onConfirm: () => {
        try {
          const updatedTx = balanceTransactions.filter(tx => tx.id !== id);
          setBalanceTransactions(updatedTx);
          localStorage.setItem('tj_local_tx', JSON.stringify(updatedTx));
          showToast('Transaksi mutasi berhasil dibatalkan.', 'info');
        } catch (e) {
          showToast('Gagal membatalkan mutasi.', 'error');
        }
      }
    });
  };

  const clearAllData = () => {
    if (!currentUser) return;
    setConfirmModal({
      isOpen: true,
      title: 'Reset Seluruh Jurnal',
      message: 'Apakah Anda yakin ingin menghapus seluruh data jurnal, transaksi, & akun Anda secara permanen? Data yang di-reset tidak dapat dipulihkan kembali.',
      confirmText: 'Ya, Reset Semua',
      isDanger: true,
      onConfirm: () => {
        try {
          setAccounts([]);
          setTrades([]);
          setBalanceTransactions([]);
          localStorage.removeItem('tj_local_accounts');
          localStorage.removeItem('tj_local_trades');
          localStorage.removeItem('tj_local_tx');
          showToast('Seluruh data lokal berhasil dibersihkan.', 'info');
          setActiveAccountId('');
        } catch (e) {
          showToast('Gagal membersihkan data.', 'error');
        }
      }
    });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('tj_local_user');
      setCurrentUser(null);
      showToast('Anda berhasil keluar dari sesi lokal.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal keluar sesi.', 'error');
    }
  };

  // --- RENDER PORTALS ---

  // Auth Guard
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-cat-crust text-cat-text flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-cat-lavender border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] text-cat-subtext uppercase tracking-widest font-black">Menghubungkan Jurnal Cloud...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} showToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-cat-crust text-cat-text flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background Decorative Ambient Radial Pastels */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cat-blue/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cat-pink/15 blur-[100px] pointer-events-none" />

      {/* Main Container - Full Screen display */}
      <div className="w-full min-h-screen bg-cat-base relative flex flex-col">
        
        {/* Dynamic Top App Header */}
        <header className="bg-cat-mantle/85 border-b border-cat-surface0/60 sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-cat-mauve/20 flex items-center justify-center font-extrabold text-cat-mauve text-xs">
                {activeAccount?.name ? activeAccount.name.charAt(0).toUpperCase() : '➕'}
              </div>
              <div className="text-left">
                <span className="text-[9px] text-cat-subtext font-bold uppercase tracking-wider block leading-none">
                  TRADING ACCOUNT
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs font-extrabold text-cat-lavender hover:text-cat-pink transition flex items-center gap-1 mt-0.5 leading-none cursor-pointer"
                >
                  {activeAccount?.name || 'Buat Akun'} ▾
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Theme switcher */}
              <button
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                className="px-2.5 py-1.5 border border-cat-surface1 hover:border-cat-surface2 hover:bg-cat-surface0 bg-cat-base/40 text-cat-lavender hover:text-cat-text rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                title="Ganti Tema (Gelap Catppuccin / Terang Brutalism)"
              >
                <span className="text-[10px] uppercase tracking-wider font-black shrink-0 select-none">
                  {theme === 'dark' ? '🐈‍⬛ Catppuccin' : '⚡ Brutalism'}
                </span>
              </button>

              {/* Quick Add Trade button */}
              {accounts.length > 0 && (
                <button
                  onClick={() => handleOpenTradeModal(null)}
                  title="Catat Transaksi Baru"
                  className="bg-cat-peach hover:bg-cat-yellow text-cat-crust p-2 rounded-xl transition-all shadow-md shadow-cat-peach/10 cursor-pointer"
                >
                  <Plus className="h-4 w-4 font-black" />
                </button>
              )}

              {/* Quick settings gear drawer */}
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="p-2 border border-cat-surface1 hover:border-cat-surface2 hover:bg-cat-surface0 bg-cat-base/40 text-cat-lavender hover:text-cat-text rounded-xl transition cursor-pointer"
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
              className={`absolute top-12 left-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold leading-relaxed ${
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
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 mb-24 relative">
          
          {/* ONBOARDING MANDATE SCREEN */}
          {accounts.length === 0 ? (
            <div className="absolute inset-0 bg-cat-base z-30 flex flex-col items-center justify-center px-6 py-8 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-cat-mantle border border-cat-surface0 rounded-[32px] p-6 space-y-5 shadow-xl max-w-xs"
              >
                <div className="w-12 h-12 bg-cat-mauve/15 rounded-2xl flex items-center justify-center text-cat-mauve mx-auto">
                  <Award className="h-6 w-6 stroke-[2]" />
                </div>
                
                <div className="space-y-1.5">
                  <h2 className="text-sm font-black text-cat-text uppercase tracking-wide">Akun Pertama Anda</h2>
                  <p className="text-[11px] text-cat-subtext leading-relaxed font-semibold">
                    Selamat bergabung! Untuk mulai menjurnal & mengevaluasi performa transaksi Anda, daftarkan akun portofolio pertama Anda terlebih dahulu.
                  </p>
                </div>

                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="w-full py-3.5 bg-cat-peach hover:bg-cat-yellow text-cat-crust text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cat-peach/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Daftarkan Akun Baru</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button 
                  onClick={handleLogout}
                  className="block mx-auto text-[10px] text-cat-subtext hover:text-cat-text font-bold uppercase transition"
                >
                  Log Out Akun
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
                  filterStrategy={filterStrategy}
                  setFilterStrategy={setFilterStrategy}
                  filterOutcome={filterOutcome}
                  setFilterOutcome={setFilterOutcome}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalPages={totalPages}
                  paginatedTrades={paginatedTrades}
                  customPairs={customPairs}
                  onEditTrade={handleOpenTradeModal}
                  onDeleteTrade={handleDeleteTrade}
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
            </>
          )}
        </main>

        {/* Fixed Mobile Bottom Custom Dock Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-cat-mantle/95 border-t border-cat-surface0/60 p-1 z-40 flex justify-center shadow-lg backdrop-blur-xs">
          <div className="flex flex-row justify-around w-full max-w-md px-1 pt-1.5 pb-2">
            {/* Overview Tab Button */}
            <button
              onClick={() => setActiveTab('overview')}
              disabled={accounts.length === 0}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl cursor-pointer disabled:opacity-30 ${
                activeTab === 'overview'
                  ? 'text-cat-mauve text-semibold bg-cat-surface0/20'
                  : 'text-cat-subtext hover:text-cat-text'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-[8px] font-bold mt-1 uppercase tracking-wider">Dashboard</span>
            </button>

            {/* Trades Tab Button */}
            <button
              onClick={() => setActiveTab('trades')}
              disabled={accounts.length === 0}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl cursor-pointer disabled:opacity-30 ${
                activeTab === 'trades'
                  ? 'text-cat-mauve text-semibold bg-cat-surface0/20'
                  : 'text-cat-subtext hover:text-cat-text'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Database className="h-4 w-4" />
                {activeAccountTrades.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-cat-peach text-cat-crust text-[8px] font-black px-1 leading-none shadow-sm">
                    {activeAccountTrades.length}
                  </span>
                )}
              </div>
              <span className="text-[8px] font-bold mt-1 uppercase tracking-wider">Jurnal</span>
            </button>

            {/* Calendar Tab Button */}
            <button
              onClick={() => setActiveTab('calendar')}
              disabled={accounts.length === 0}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-2xl cursor-pointer disabled:opacity-30 ${
                activeTab === 'calendar'
                  ? 'text-cat-mauve text-semibold bg-cat-surface0/20'
                  : 'text-cat-subtext hover:text-cat-text'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="text-[8px] font-bold mt-1 uppercase tracking-wider">Kalender</span>
            </button>
          </div>
        </nav>
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
            onLogout={handleLogout}
            onOpenPairsModal={() => setIsPairsModalOpen(true)}
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
