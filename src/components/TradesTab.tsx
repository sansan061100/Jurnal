import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Edit3, Trash2, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { Account, Trade, TradingPair } from '../types';
import { formatCurrency, formatDateIndonesia } from '../utils';

interface TradesTabProps {
  accounts: Account[];
  activeAccountId: string;
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  filterPair: string;
  setFilterPair: (p: string) => void;
  filterSession: string;
  setFilterSession: (s: string) => void;
  filterStrategy: string;
  setFilterStrategy: (st: string) => void;
  filterOutcome: string;
  setFilterOutcome: (o: string) => void;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  totalPages: number;
  paginatedTrades: Trade[];
  customPairs: TradingPair[];
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
}

export default function TradesTab({
  accounts,
  activeAccountId,
  searchTerm,
  setSearchTerm,
  filterPair,
  setFilterPair,
  filterSession,
  setFilterSession,
  filterStrategy,
  setFilterStrategy,
  filterOutcome,
  setFilterOutcome,
  currentPage,
  setCurrentPage,
  totalPages,
  paginatedTrades,
  customPairs,
  onEditTrade,
  onDeleteTrade
}: TradesTabProps) {
  const currentAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const currentCurrency = currentAccount?.currency || 'USD';
  const [showCollapseFilters, setShowCollapseFilters] = useState(false);

  // Dynamic values based on custom pairs list plus any existing items
  const uniquePairs = ['ALL', ...customPairs.map(p => p.alias)];
  const uniqueStrategies = [
    'ALL',
    'Order Block SMC',
    'Liquidity Grab',
    'Fair Value Gap (FVG)',
    'Breakout',
    'Support & Resistance (S/R)',
    'ICT Killzone'
  ];

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPair('ALL');
    setFilterSession('ALL');
    setFilterStrategy('ALL');
    setFilterOutcome('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    filterPair !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterStrategy !== 'ALL' ||
    filterOutcome !== 'ALL';

  return (
    <div className="space-y-4 pb-6">
      {/* Search & Collapse Filter Trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1 bg-cat-mantle border border-cat-surface0/80 rounded-2xl flex items-center px-3 shadow-xs">
          <Search className="h-4 w-4 text-cat-subtext" />
          <input
            type="text"
            placeholder="Cari pair, catatan..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-0 text-xs text-cat-text focus:outline-none w-full py-3.5 pl-2 placeholder:text-cat-surface2 font-medium"
          />
        </div>

        <button
          onClick={() => setShowCollapseFilters(prev => !prev)}
          className={`px-3.5 rounded-2xl border transition-all flex items-center justify-center gap-1.5 text-xs font-bold ${
            showCollapseFilters || hasActiveFilters
              ? 'bg-cat-lavender text-cat-crust border-cat-lavender'
              : 'bg-cat-mantle border-cat-surface0/80 text-cat-text'
          }`}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-cat-peach inline-block" />}
        </button>
      </div>

      {/* Advanced Filter Collapse Box */}
      {showCollapseFilters && (
        <div className="bg-cat-mantle/70 border border-cat-surface0/80 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-cat-surface0/40 pb-2 mb-1">
            <span className="text-[10px] font-bold text-cat-subtext uppercase tracking-wider">
              Filter Pencarian Jurnal
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-cat-red font-bold hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Pair Switcher */}
            <div>
              <span className="block text-[10px] text-cat-subtext font-bold uppercase mb-1">Symbol / Pair</span>
              <select
                value={filterPair}
                onChange={e => {
                  setFilterPair(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-2.5 py-2.5 rounded-xl focus:border-cat-lavender focus:outline-none font-bold cursor-pointer"
              >
                {uniquePairs.map(p => (
                  <option key={p} value={p}>{p === 'ALL' ? 'Semua Pair' : p}</option>
                ))}
              </select>
            </div>

            {/* Session Switcher */}
            <div>
              <span className="block text-[10px] text-cat-subtext font-bold uppercase mb-1">Sesi Trading</span>
              <select
                value={filterSession}
                onChange={e => {
                  setFilterSession(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-2.5 py-2.5 rounded-xl focus:border-cat-lavender focus:outline-none font-bold cursor-pointer"
              >
                <option value="ALL">Semua Sesi</option>
                <option value="Asian">Asian Session</option>
                <option value="London">London Session</option>
                <option value="New York">New York Session</option>
                <option value="Other">Weekend / Other</option>
              </select>
            </div>

            {/* Outcome Winner/Loss */}
            <div>
              <span className="block text-[10px] text-cat-subtext font-bold uppercase mb-1">Hasil (Outcome)</span>
              <select
                value={filterOutcome}
                onChange={e => {
                  setFilterOutcome(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-2.5 py-2.5 rounded-xl focus:border-cat-lavender focus:outline-none font-bold cursor-pointer"
              >
                <option value="ALL">Semua Hasil</option>
                <option value="WIN">Win (Profit Only)</option>
                <option value="LOSS">Loss (Kerugian Only)</option>
                <option value="BREAKEVEN">Breakeven Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Trades Card list */}
      <div className="space-y-3">
        {paginatedTrades.length === 0 ? (
          <div className="bg-cat-mantle/70 border border-cat-surface0/80 rounded-3xl p-10 text-center text-cat-subtext italic shadow-sm">
            <p className="text-xs">Tidak ada data transaksi di jurnal ini.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-3 bg-cat-lavender/10 text-cat-lavender text-[10px] font-bold py-1.5 px-3 rounded-lg hover:bg-cat-lavender/20"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          paginatedTrades.map(trade => {
            const isProfit = trade.pnl >= 0.01;
            const isLoss = trade.pnl <= -0.01;
            const isBE = !isProfit && !isLoss;

            // Target Setup Risk reward layout
            const setupRRValue = trade.rrRatio !== undefined ? trade.rrRatio : 0;
            const realizedRMultiple = trade.rMultiple !== undefined ? trade.rMultiple : 0;

            return (
              <div
                key={trade.id}
                className="bg-cat-mantle border border-cat-surface0/70 hover:border-cat-surface1 rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:shadow-xs"
              >
                {/* 1. Header Row (Action, Lot Size, Pair, Date & Net P&L) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${
                      trade.action === 'BUY'
                        ? 'bg-cat-green/10 text-cat-green border border-cat-green/20'
                        : 'bg-cat-red/10 text-cat-red border border-cat-red/20'
                    }`}>
                      {trade.action}
                    </span>
                    <span className="font-extrabold text-sm text-cat-text tracking-tight">{trade.pair}</span>
                    <span className="text-[10px] text-cat-overlay1 font-mono font-bold">
                      {trade.lotSize.toFixed(2)} Lot
                    </span>
                  </div>

                  {/* Profit Win/Loss Badge & Value */}
                  <div className="text-right flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <strong className={`font-mono text-sm tracking-tight leading-none ${isProfit ? 'text-cat-green' : isLoss ? 'text-cat-red' : 'text-cat-text'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(trade.pnl, currentCurrency)}
                      </strong>
                    </div>
                    {/* Win/Loss Status Column */}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded leading-none uppercase ${
                      isProfit 
                        ? 'bg-cat-green text-cat-crust' 
                        : isLoss 
                        ? 'bg-cat-red text-cat-crust' 
                        : 'bg-cat-overlay0 text-cat-crust'
                    }`}>
                      {isProfit ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                    </span>
                  </div>
                </div>

                {/* Date indicator */}
                <div className="text-[9px] text-cat-overlay1 font-medium mt-1">
                  📆 Entry: {formatDateIndonesia(trade.entryDate)}
                </div>

                {/* 2. Technical Prices Grid: entry, sl, tp & exit */}
                <div className="grid grid-cols-4 gap-2 mt-3 p-2 rounded-xl bg-cat-base/40 border border-cat-surface0/50 text-[10px] font-semibold text-center divide-x divide-cat-surface0/60 text-cat-subtext font-mono">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-cat-overlay2 uppercase font-bold tracking-wider mb-0.5">Entry</span>
                    <span className="text-cat-text font-bold">{trade.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-overlay2 uppercase font-bold tracking-wider mb-0.5">SL (Stop)</span>
                    <span className="text-cat-red font-bold">{trade.stopLoss ? trade.stopLoss.toFixed(2) : '-'}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-overlay2 uppercase font-bold tracking-wider mb-0.5">TP (Target)</span>
                    <span className="text-cat-green font-bold">{trade.takeProfit ? trade.takeProfit.toFixed(2) : '-'}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-overlay2 uppercase font-bold tracking-wider mb-0.5">Exit</span>
                    <span className="text-cat-text font-bold">{trade.exitPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* 3. Risk Management Info: Planned R-to-R and Realized R-Multiple */}
                <div className="flex items-center justify-between text-[11px] font-medium mt-3 bg-cat-mantle border border-cat-surface0/45 p-2 rounded-xl">
                  {/* Target Setup RR */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-cat-overlay2 uppercase font-bold tracking-wide">Target RR:</span>
                    <span className="font-mono text-cat-lavender font-black">
                      {setupRRValue > 0 ? `1 : ${setupRRValue.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>

                  {/* Realized R Multiple */}
                  <div className="flex items-center gap-1.5 border-l border-cat-surface0/65 pl-3">
                    <span className="text-[9px] text-cat-overlay2 uppercase font-bold tracking-wide">Realized R:</span>
                    <span className={`font-mono font-black ${realizedRMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                      {realizedRMultiple >= 0 ? '+' : ''}{realizedRMultiple.toFixed(2)} R
                    </span>
                  </div>

                  {/* Sesi Indicator */}
                  <div className="text-[9px] font-black bg-cat-surface0 px-2 py-0.5 border border-cat-surface1 rounded-md text-cat-subtext select-none">
                    Session: {trade.session || 'Other'}
                  </div>
                </div>

                {/* 4. Strategy, Notes, and Action Buttons Row */}
                <div className="mt-3 pt-2.5 border-t border-cat-surface0/35 flex items-center justify-between gap-3 text-xs text-cat-subtext">
                  <div className="truncate flex-1 font-medium italic text-[11px] text-cat-overlay2">
                    🧠 <span className="font-black text-cat-text not-italic uppercase tracking-wide">{trade.strategy}</span>
                    {trade.notes && ` - "${trade.notes}"`}
                  </div>

                  {/* Actions (Edit and Delete) */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-cat-surface0/50">
                    <button
                      onClick={() => onEditTrade(trade)}
                      title="Ubah Log Jurnal"
                      className="p-1.5 hover:bg-cat-surface0 rounded-lg text-cat-subtext hover:text-cat-text transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTrade(trade.id)}
                      title="Hapus Log Jurnal"
                      className="p-1.5 hover:bg-cat-red/10 rounded-lg text-cat-red transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination control box */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-cat-mantle/70 border border-cat-surface0/70 p-3 rounded-2xl shadow-xs">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border border-cat-surface0 rounded-xl bg-cat-base hover:bg-cat-surface0 text-cat-text transition-all disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-cat-subtext text-[10px] font-bold uppercase">
            Halaman <strong className="text-cat-lavender">{currentPage}</strong> dari <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border border-cat-surface0 rounded-xl bg-cat-base hover:bg-cat-surface0 text-cat-text transition-all disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
