import React from 'react';
import {
  TrendingUp,
  Award,
  Shield,
  Percent,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle
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
  Cell
} from 'recharts';
import { Account, Trade, BalanceTransaction } from '../types';
import { AccountStatistics, formatCurrency, formatPercent } from '../utils';

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

  // Funding Modal states
  const [isFundingModalOpen, setIsFundingModalOpen] = React.useState(false);
  const [fundingType, setFundingType] = React.useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [fundingAmount, setFundingAmount] = React.useState('');
  const [fundingNotes, setFundingNotes] = React.useState('');
  const [showFundingHistory, setShowFundingHistory] = React.useState(false);

  // Filter transactions for this specific active account only
  const activeTxList = React.useMemo(() => {
    return balanceTransactions.filter(tx => tx.accountId === currentAccountSelected?.id);
  }, [balanceTransactions, currentAccountSelected]);

  const handleFundingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Masukkan nominal dana yang valid!');
      return;
    }
    if (fundingType === 'WITHDRAWAL' && amount > stats.currentBalance) {
      alert(`Saldo tidak mencukupi! Maksimal penarikan: ${formatCurrency(stats.currentBalance, currentCurrency)}`);
      return;
    }

    onAddBalanceTransaction(fundingType, amount, fundingNotes);
    setIsFundingModalOpen(false);
    setFundingAmount('');
    setFundingNotes('');
  };

  // Helper to get status pill for R-Multiple
  const getRMultipleStatus = (r: number) => {
    if (r >= 10) return { label: '🏆 Elite TR', color: 'text-cat-green bg-cat-green/10 border-cat-green/20' };
    if (r >= 5) return { label: '⚡ Profitable TR', color: 'text-cat-teal bg-cat-teal/10 border-cat-teal/20' };
    if (r > 0) return { label: '📈 Positive R', color: 'text-cat-blue bg-cat-blue/10 border-cat-blue/20' };
    if (r === 0) return { label: '⚖️ No Trade', color: 'text-cat-subtext bg-cat-surface0 border-cat-surface1' };
    return { label: '📉 Recovering', color: 'text-cat-red bg-cat-red/10 border-cat-red/20' };
  };

  const rStatus = getRMultipleStatus(stats.totalRMultiple);

  return (
    <div className="space-y-4 pb-6">
      
      {/* Account Tag info */}
      <div className="bg-cat-mantle border border-cat-surface0 p-3.5 rounded-2xl flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs shrink-0">💼</span>
            <span className="text-[10px] font-black tracking-widest text-cat-lavender uppercase">
              TRADING PORTFOLIO
            </span>
          </div>
          <span className="text-[9px] bg-cat-green/10 text-cat-green border border-cat-green/20 px-2 py-0.5 rounded-lg font-black uppercase">
            {currentAccountSelected?.leverage || '1:100'} Leverage
          </span>
        </div>
        <div className="text-left mt-0.5">
          <h4 className="text-sm font-black text-cat-text leading-tight">{currentAccountSelected?.name}</h4>
          <p className="text-[10px] text-cat-subtext font-medium mt-0.5 mt-1 font-mono">
            {currentAccountSelected?.broker || 'Demo Broker'} • {currentAccountSelected?.currency} • Terdaftar sejak {new Date(currentAccountSelected?.createdAt || '').toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Deposit & Withdrawal Pro Panel */}
      <div className="bg-cat-mantle border border-cat-surface0 p-3.5 rounded-2xl flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🪙</span>
            <span className="text-[10px] font-black tracking-widest text-cat-peach uppercase">Manajemen Dana Akun</span>
          </div>
          <span className="text-[10px] text-cat-subtext font-bold">
            Saldo: {formatCurrency(stats.currentBalance, currentCurrency)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => {
              setFundingType('DEPOSIT');
              setIsFundingModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-cat-green/10 hover:bg-cat-green/25 text-cat-green border border-cat-green/20 hover:border-cat-green/40 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            📥 Deposit Dana
          </button>
          <button
            onClick={() => {
              setFundingType('WITHDRAWAL');
              setIsFundingModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-cat-red/10 hover:bg-cat-red/25 text-cat-red border border-cat-red/20 hover:border-cat-red/40 rounded-xl text-xs font-black transition-all cursor-pointer"
          >
            📤 Withdraw Dana
          </button>
        </div>

        {/* Dynamic transaction log expander */}
        {activeTxList.length > 0 && (
          <div className="mt-2.5 border-t border-cat-surface0/35 pt-2.5">
            <button
              onClick={() => setShowFundingHistory(prev => !prev)}
              className="w-full flex justify-between items-center text-[10px] font-bold text-cat-subtext hover:text-cat-text transition focus:outline-none"
            >
              <span>📜 RIWAYAT MUTASI DANA ({activeTxList.length})</span>
              <span>{showFundingHistory ? 'Sembunyikan ▲' : 'Tampilkan ▼'}</span>
            </button>

            {showFundingHistory && (
              <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1.5 pr-1 font-sans">
                {activeTxList.map(tx => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-cat-base/40 border border-cat-surface0/30 text-[10px]"
                  >
                    <div>
                      <div className="flex items-center gap-1">
                        <span className={`font-black uppercase tracking-wider ${tx.type === 'DEPOSIT' ? 'text-cat-green' : 'text-cat-red'}`}>
                          {tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}
                        </span>
                        <span className="text-[8px] text-cat-overlay1">
                          {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[9px] text-cat-subtext italic truncate max-w-[140px] mt-0.5">"{tx.notes}"</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <strong className={`font-mono ${tx.type === 'DEPOSIT' ? 'text-cat-green' : 'text-cat-red'}`}>
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount, currentCurrency)}
                      </strong>
                      <button
                        onClick={() => onDeleteBalanceTransaction(tx.id)}
                        title="Batal Mutasi"
                        className="text-cat-red hover:bg-cat-red/10 px-1 py-0.5 rounded transition font-bold"
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

      {/* Funding Modal (Deposit / Withdraw dialog) */}
      {isFundingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsFundingModalOpen(false)}
            className="fixed inset-0 bg-cat-crust/85 backdrop-blur-xs cursor-pointer"
          />
          <div className="w-full max-w-xs bg-cat-mantle border border-cat-surface0 p-5 rounded-3xl shadow-2xl relative z-50 text-left">
            <h3 className="text-sm font-black text-cat-text mb-3 flex items-center gap-2">
              {fundingType === 'DEPOSIT' ? '📥 FORM DEPOSIT DANA' : '📤 FORM WITHDRAW DANA'}
            </h3>
            <p className="text-[10px] text-cat-subtext mb-4 leading-relaxed">
              {fundingType === 'DEPOSIT' 
                ? 'Tambahkan modal tambahan untuk memperbesar kapasitas peluru lot trading Anda.' 
                : 'Tarik modal berjalan dari akun trading Anda ke rekening bank atau wallet.'}
            </p>

            <form onSubmit={handleFundingSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[9px] text-cat-overlay2 font-bold uppercase mb-1">
                  Nominal ({currentCurrency})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="Contoh: 5000"
                  value={fundingAmount}
                  onChange={e => setFundingAmount(e.target.value)}
                  className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-xs p-3 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] text-cat-overlay2 font-bold uppercase mb-1">
                  Catatan Transaksi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tambah modal / Tarik profit"
                  value={fundingNotes}
                  onChange={e => setFundingNotes(e.target.value)}
                  className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-xs p-3 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(false)}
                  className="py-2.5 bg-cat-surface0 hover:bg-cat-surface1 text-cat-text text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`py-2.5 text-cat-crust text-xs font-black rounded-xl transition-all cursor-pointer ${
                    fundingType === 'DEPOSIT' ? 'bg-cat-green hover:bg-cat-teal' : 'bg-cat-red hover:bg-cat-pink'
                  }`}
                >
                  {fundingType === 'DEPOSIT' ? 'Setor Dana' : 'Tarik Dana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Pro-Trader Bento Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Saldo Berjalan */}
        <div className="bg-cat-mantle/70 p-3.5 border border-cat-surface0/70 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-blue/5 flex items-center justify-center">
            <Shield className="h-3 w-3 text-cat-blue/25" />
          </div>
          <span className="text-[9px] text-cat-overlay2 font-bold uppercase tracking-wider block">Modal Berjalan</span>
          <div className="mt-3">
            <span className="text-base font-black font-mono text-cat-text block tracking-tight leading-none">
              {formatCurrency(stats.currentBalance, currentCurrency)}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-mono">
              Initial: {formatCurrency(stats.startingBalance, currentCurrency)}
            </span>
          </div>
        </div>

        {/* Card 2: Laba/Rugi Net */}
        <div className="bg-cat-mantle/70 p-3.5 border border-cat-surface0/70 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-peach/5 flex items-center justify-center">
            <Activity className="h-3 w-3 text-cat-peach/25" />
          </div>
          <span className="text-[9px] text-cat-overlay2 font-bold uppercase tracking-wider block">Net Profit & Loss</span>
          <div className="mt-3">
            <span className={`text-base font-black font-mono block tracking-tight leading-none ${stats.netProfit >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{formatCurrency(stats.netProfit, currentCurrency)}
            </span>
            <span className="text-[9px] text-cat-subtext mt-1.5 block font-bold flex items-center gap-1">
              Gain: <span className={stats.netProfit >= 0 ? 'text-cat-green' : 'text-cat-red'}>
                {stats.startingBalance > 0 ? ((stats.netProfit / stats.startingBalance) * 100).toFixed(2) : 0}%
              </span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Realized R Multiple (Pro Pillar) */}
        <div className="bg-cat-mantle/70 p-3.5 border border-cat-surface0/70 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-lavender/5 flex items-center justify-center">
            <Award className="h-3 w-3 text-cat-lavender/25" />
          </div>
          <span className="text-[9px] text-cat-overlay2 font-bold uppercase tracking-wider block">Total Perolehan R</span>
          <div className="mt-3">
            <span className={`text-lg font-black font-mono block tracking-tight leading-none ${stats.totalRMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
              {stats.totalRMultiple >= 0 ? '+' : ''}{stats.totalRMultiple.toFixed(2)} R
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] text-cat-subtext font-medium font-mono">
                Avg: {stats.avgRMultiple > 0 ? '+' : ''}{stats.avgRMultiple.toFixed(2)}R/tx
              </span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider ${rStatus.color}`}>
                {rStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Strike Rate (Win Rate) & Count */}
        <div className="bg-cat-mantle/70 p-3.5 border border-cat-surface0/70 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-cat-pink/5 flex items-center justify-center">
            <Percent className="h-3 w-3 text-cat-pink/25" />
          </div>
          <span className="text-[9px] text-cat-overlay2 font-bold uppercase tracking-wider block">Strike Rate</span>
          <div className="mt-3">
            <span className="text-lg font-black font-mono text-cat-lavender block tracking-tight leading-none">
              {formatPercent(stats.winRate)}
            </span>
            <div className="flex items-center gap-1 mt-1.5 text-[9px] text-cat-subtext font-bold">
              <span className="text-cat-green flex items-center gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> {stats.wonTrades}W</span>
              <span>/</span>
              <span className="text-cat-red flex items-center gap-0.5"><XCircle className="h-2.5 w-2.5" /> {stats.lostTrades}L</span>
              <span>/</span>
              <span className="text-cat-overlay1 leading-none">{stats.breakevenTrades}BE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini KPIs Row: Profit Factor, Drawdowns, Average win/loss ratio */}
      <div className="bg-cat-mantle/50 border border-cat-surface1/55 p-3 rounded-2xl grid grid-cols-3 gap-1.5 text-center text-xs divide-x divide-cat-surface0/80">
        <div>
          <span className="text-[8px] text-cat-overlay1 font-bold uppercase tracking-widest block">Profit Factor</span>
          <span className="font-mono text-cat-peach font-black text-xs block mt-0.5">
            {stats.profitFactor.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[8px] text-cat-overlay1 font-bold uppercase tracking-widest block">Max Drawdown</span>
          <span className="font-mono text-cat-red font-black text-xs block mt-0.5">
            -{stats.maxDrawdown.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[8px] text-cat-overlay1 font-bold uppercase tracking-widest block">Avg Win / Loss</span>
          <span className="font-mono text-cat-emerald font-black text-xs block mt-0.5">
            {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : stats.avgWin > 0 ? '99.9' : '0.00'}
          </span>
        </div>
      </div>

      {/* Pro Explanation Indicator Widget */}
      <div className="bg-cat-base/35 p-3.5 border border-cat-surface1 rounded-2xl text-[10px] text-cat-subtext leading-relaxed">
        <p className="font-black text-xs text-cat-text mb-1 flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-cat-peach" /> Kenapa R-Multiple Penting bagi Pro Trader?
        </p>
        Bukan besarnya dollar, profitabilitas konsisten diukur dari <strong className="text-cat-lavender">R-Multiple (Perolehan Risiko)</strong>. Jika Anda merisikokan $50 per trade (1R), dan menghasilkan $150, Anda mendapatkan <strong className="text-cat-green">+3.0R</strong>. Pro trader mengedepankan rasio R positif akumulatif demi mengamankan compounding modal yang sehat tanpa bias lot size.
      </div>

      {/* Equity Curve Line Chart */}
      <div className="bg-cat-mantle/70 border border-cat-surface0/70 rounded-2xl p-4">
        <div className="mb-3.5">
          <h3 className="text-xs font-bold text-cat-text flex items-center gap-1.5">
            📈 Kurva Ekuitas Modal (Equity Curve)
          </h3>
          <p className="text-[10px] text-cat-subtext font-medium">Jejak grafis akumulasi saldo berjalan per transaksi</p>
        </div>

        {activeAccountTrades.length === 0 ? (
          <div className="h-[150px] flex items-center justify-center text-cat-subtext text-xs italic">
            Belum ada transaksi di jurnal ini.
          </div>
        ) : (
          <div className="h-[150px] w-full font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveDataset} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="pastelEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b4befe" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#b4befe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#313244" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', borderRadius: '12px' }}
                  labelStyle={{ color: '#cdd6f4', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#b4befe', fontSize: '11px' }}
                  formatter={(value: any) => [formatCurrency(Number(value), currentCurrency), 'Saldo']}
                />
                <Area type="monotone" dataKey="balance" stroke="#b4befe" strokeWidth={2.5} fillOpacity={1} fill="url(#pastelEquityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily P&L Bar Chart */}
      <div className="bg-cat-mantle/70 border border-cat-surface0/70 rounded-2xl p-4">
        <div className="mb-3.5">
          <h3 className="text-xs font-bold text-cat-text flex items-center gap-1.5">
            📊 Distribusi Laba Harian (Net P&L)
          </h3>
          <p className="text-[10px] text-cat-subtext font-medium">Keuntungan / kerugian harian terhitung secara harian</p>
        </div>

        {dailyPnlDataset.length === 0 ? (
          <div className="h-[135px] flex items-center justify-center text-cat-subtext text-xs italic">
            Belum ada transaksi di jurnal ini.
          </div>
        ) : (
          <div className="h-[135px] w-full font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnlDataset} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#313244" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181825', borderColor: '#313244', borderRadius: '12px' }}
                  labelStyle={{ color: '#cdd6f4', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '11px' }}
                  formatter={(value: any) => [formatCurrency(Number(value), currentCurrency), 'P&L']}
                />
                <Bar dataKey="pnl">
                  {dailyPnlDataset.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pnl >= 0 ? '#a6e3a1' : '#f38ba8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
