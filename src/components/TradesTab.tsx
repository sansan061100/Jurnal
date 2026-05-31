import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Edit3, Trash2, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { Account, Trade, TradingPair } from '../types';
import { formatCurrency, formatDateEnglish } from '../utils';

interface TradesTabProps {
  accounts: Account[];
  activeAccountId: string;
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  filterPair: string;
  setFilterPair: (p: string) => void;
  filterSession: string;
  setFilterSession: (s: string) => void;
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

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterPair('ALL');
    setFilterSession('ALL');
    setFilterOutcome('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    filterPair !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterOutcome !== 'ALL';

  return (
    <div className="space-y-4 pb-6">
      {/* Search & Collapse Filter Trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1 bg-white border border-zinc-200/80 rounded-xl flex items-center px-3 shadow-xs">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search pair, notes..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-0 text-xs text-zinc-800 focus:outline-none w-full py-3 pl-2.5 placeholder:text-zinc-400 font-semibold"
          />
        </div>

        <button
          onClick={() => setShowCollapseFilters(prev => !prev)}
          className={`px-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
            showCollapseFilters || hasActiveFilters
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
          }`}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
        </button>
      </div>

      {/* Advanced Filter Collapse Box */}
      {showCollapseFilters && (
        <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between pb-2 mb-1 border-b-2 border-cat-surface0/30">
            <span className="text-[10px] font-black text-cat-text uppercase tracking-widest">
              Journal Search Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-[#dc2626] font-black hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Pair Switcher */}
            <div>
              <span className="block text-[8px] text-cat-text font-black uppercase mb-1">Symbol / Pair</span>
              <select
                value={filterPair}
                onChange={e => {
                  setFilterPair(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-2.5 cursor-pointer font-bold"
              >
                {uniquePairs.map(p => (
                  <option key={p} value={p}>{p === 'ALL' ? 'All Symbols' : p}</option>
                ))}
              </select>
            </div>

            {/* Session Switcher */}
            <div>
              <span className="block text-[8px] text-cat-text font-black uppercase mb-1">Trading Session</span>
              <select
                value={filterSession}
                onChange={e => {
                  setFilterSession(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-2.5 cursor-pointer font-bold"
              >
                <option value="ALL">All Sessions</option>
                <option value="Asian">Asian Session</option>
                <option value="London">London Session</option>
                <option value="New York">New York Session</option>
                <option value="Other">Weekend / Other</option>
              </select>
            </div>

            {/* Outcome Winner/Loss */}
            <div>
              <span className="block text-[8px] text-cat-text font-black uppercase mb-1">Trade Outcome</span>
              <select
                value={filterOutcome}
                onChange={e => {
                  setFilterOutcome(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-2.5 cursor-pointer font-bold"
              >
                <option value="ALL">All Outcomes</option>
                <option value="WIN">Win (Profit Only)</option>
                <option value="LOSS">Loss (Negative P&L)</option>
                <option value="BREAKEVEN">Breakeven Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Trades Card list */}
      <div className="space-y-3">
        {paginatedTrades.length === 0 ? (
          <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-3xl p-10 text-center text-cat-subtext italic">
            <p className="text-xs">No trades found in this journal.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-3 bg-cat-lavender text-cat-base border border-cat-surface0 text-[10px] font-black py-1.5 px-3 rounded-lg transition"
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
                className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 flex flex-col justify-between hover:border-cat-surface1 transition-all brut-shadow-sm"
              >
                {/* 1. Header Row (Action, Lot Size, Pair, Date & Net P&L) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${
                      trade.action === 'BUY'
                        ? 'bg-cat-green/10 text-cat-green'
                        : 'bg-cat-red/10 text-cat-red'
                    }`}>
                      {trade.action}
                    </span>
                    <span className="font-black text-sm text-cat-text tracking-tight">{trade.pair}</span>
                    <span className="text-[10px] text-cat-subtext font-mono font-bold">
                      {trade.lotSize.toFixed(2)} Lots
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
                        ? 'bg-cat-green text-cat-base' 
                        : isLoss 
                        ? 'bg-cat-red text-cat-base' 
                        : 'bg-cat-surface2 text-cat-text'
                    }`}>
                      {isProfit ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
                    </span>
                  </div>
                </div>

                {/* Date indicator */}
                <div className="text-[9px] text-cat-subtext font-bold mt-1">
                  📆 Date: {formatDateEnglish(trade.entryDate)}
                </div>

                {/* 2. Technical Prices Grid: entry, sl, tp & exit */}
                <div className="grid grid-cols-4 gap-1.5 mt-3 p-2 rounded-xl bg-cat-base border border-cat-surface0/70 text-[10px] font-semibold text-center divide-x divide-cat-surface0/30 text-cat-subtext font-mono">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-cat-subtext uppercase font-bold tracking-wider mb-0.5">Entry</span>
                    <span className="text-cat-text font-black">{trade.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-subtext uppercase font-bold tracking-wider mb-0.5">SL</span>
                    <span className="text-cat-red font-black">{trade.stopLoss ? trade.stopLoss.toFixed(2) : '-'}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-subtext uppercase font-bold tracking-wider mb-0.5">TP</span>
                    <span className="text-cat-green font-black">{trade.takeProfit ? trade.takeProfit.toFixed(2) : '-'}</span>
                  </div>
                  <div className="flex flex-col pl-1">
                    <span className="text-[8px] text-cat-subtext uppercase font-bold tracking-wider mb-0.5">Exit</span>
                    <span className="text-cat-text font-black">{trade.exitPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* 3. Risk Management Info: Planned R-to-R and Realized R-Multiple */}
                <div className="flex items-center justify-between text-[11px] font-medium mt-3 bg-cat-base border border-cat-surface0 p-2 rounded-xl">
                  {/* Setup RR */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-cat-subtext uppercase font-black tracking-wide">Setup RR:</span>
                    <span className="font-mono text-cat-lavender font-black">
                      {setupRRValue > 0 ? `1 : ${setupRRValue.toFixed(2)}` : 'N/A'}
                    </span>
                  </div>

                  {/* Realized R Multiple */}
                  <div className="flex items-center gap-1.5 border-l-2 border-cat-surface0 pl-3">
                    <span className="text-[9px] text-cat-subtext uppercase font-black tracking-wide">Realized R:</span>
                    <span className={`font-mono font-black ${realizedRMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                      {realizedRMultiple >= 0 ? '+' : ''}{realizedRMultiple.toFixed(2)} R
                    </span>
                  </div>

                  {/* Session Indicator */}
                  <div className="text-[8px] font-black bg-cat-surface0 px-2 py-0.5 rounded text-cat-text uppercase tracking-wider select-none">
                    {trade.session || 'Other'}
                  </div>
                </div>

                {/* 4. Notes and Action Buttons Row */}
                <div className="mt-3 pt-2.5 flex items-center justify-between gap-3 text-xs text-cat-subtext border-t border-cat-surface0/30">
                  <div className="truncate flex-1 font-medium italic text-[11px] text-cat-subtext">
                    {trade.notes ? `📝 "${trade.notes}"` : 'No comments provided'}
                  </div>

                  {/* Actions (Edit and Delete) */}
                  <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-cat-surface0/30">
                    <button
                      onClick={() => onEditTrade(trade)}
                      title="Edit Trade record"
                      className="p-1 hover:bg-cat-surface0 rounded-lg text-cat-subtext hover:text-cat-text transition"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTrade(trade.id)}
                      title="Delete Trade record"
                      className="p-1 hover:bg-cat-red/10 rounded-lg text-cat-red transition"
                    >
                      <Trash2 className="h-4 w-4" />
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
        <div className="flex items-center justify-between bg-cat-mantle border-2 border-cat-surface0 p-3 rounded-2xl shadow-xs">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border-2 border-cat-surface0 rounded-xl bg-cat-base hover:bg-cat-surface0 text-cat-text transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-cat-text text-[10px] font-black uppercase">
            Page <strong className="text-cat-lavender">{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border-2 border-cat-surface0 rounded-xl bg-cat-base hover:bg-cat-surface0 text-cat-text transition-all disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
