import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { Account, TradingPair } from '../types';
import { formatCurrency, AccountStatistics } from '../utils';

interface CalculatorTabProps {
  accounts: Account[];
  activeAccountId: string;
  stats: AccountStatistics;
  customPairs: TradingPair[];
}

export default function CalculatorTab({
  accounts,
  activeAccountId,
  stats,
  customPairs
}: CalculatorTabProps) {
  const currentAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const currentCurrency = currentAccount?.currency || 'USD';

  // --- CALCULATOR STATES ---
  const [calcPair, setCalcPair] = useState('EURUSD');
  const [calcTradeAction, setCalcTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [calcCapital, setCalcCapital] = useState('');
  const [calcEntry, setCalcEntry] = useState('1.08200');
  const [calcSl, setCalcSl] = useState('1.07900');
  const [calcTp, setCalcTp] = useState('1.08800');
  const [calcRiskPct, setCalcRiskPct] = useState('1');

  // Pair Defaults to streamline user experience
  const getPairDefaults = (pairAlias: string) => {
    switch (pairAlias) {
      case 'EURUSD': return { entry: '1.08200', sl: '1.07900', tp: '1.08800' };
      case 'GBPUSD': return { entry: '1.26500', sl: '1.26100', tp: '1.27300' };
      case 'XAUUSD': return { entry: '2400.00', sl: '2390.00', tp: '2420.00' };
      case 'USDJPY': return { entry: '155.50', sl: '155.00', tp: '156.50' };
      case 'GBPJPY': return { entry: '195.00', sl: '194.50', tp: '196.00' };
      case 'BTCUSD': return { entry: '68500.00', sl: '67500.00', tp: '70500.00' };
      case 'ETHUSD': return { entry: '3500.00', sl: '3450.00', tp: '3600.00' };
      default: return { entry: '100.00', sl: '95.00', tp: '110.00' };
    }
  };

  // Sync defaults when pair changes
  useEffect(() => {
    const defs = getPairDefaults(calcPair);
    setCalcEntry(defs.entry);
    setCalcSl(defs.sl);
    setCalcTp(defs.tp);
  }, [calcPair]);

  // Sync starting capital on mount or whenever activeAccountId changes
  useEffect(() => {
    if (stats && stats.currentBalance !== undefined) {
      setCalcCapital(String(stats.currentBalance));
    }
  }, [stats, activeAccountId]);

  // Unified calculations
  const calcResults = useMemo(() => {
    const pairObj = customPairs.find(p => p.alias === calcPair) || { contractSize: 100000 };
    const capital = parseFloat(calcCapital) || 0;
    const riskPct = parseFloat(calcRiskPct) || 0;
    const entry = parseFloat(calcEntry) || 0;
    const sl = parseFloat(calcSl) || 0;
    const tp = parseFloat(calcTp) || 0;

    const riskAmount = capital * (riskPct / 100);

    const slDistance = Math.abs(entry - sl);
    const tpDistance = Math.abs(entry - tp);

    let requiredLots = 0;
    if (slDistance > 0 && pairObj.contractSize > 0) {
      requiredLots = riskAmount / (slDistance * pairObj.contractSize);
    }

    const rewardAmount = requiredLots * tpDistance * pairObj.contractSize;
    const rrRatio = slDistance > 0 ? tpDistance / slDistance : 0;

    // Is risk logical with action?
    // Buy: Entry > SL and TP > Entry
    // Sell: Entry < SL and TP < Entry
    let warning = '';
    if (calcTradeAction === 'BUY') {
      if (sl >= entry) warning = 'For a BUY position, Stop Loss (SL) must be lower than the Entry price.';
      else if (tp <= entry) warning = 'For a BUY position, Take Profit (TP) must be higher than the Entry price.';
    } else {
      if (sl <= entry) warning = 'For a SELL position, Stop Loss (SL) must be higher than the Entry price.';
      else if (tp >= entry) warning = 'For a SELL position, Take Profit (TP) must be lower than the Entry price.';
    }

    return {
      riskAmount,
      requiredLots: isNaN(requiredLots) || !isFinite(requiredLots) ? 0 : requiredLots,
      rewardAmount: isNaN(rewardAmount) || !isFinite(rewardAmount) ? 0 : rewardAmount,
      rrRatio: isNaN(rrRatio) || !isFinite(rrRatio) ? 0 : rrRatio,
      slDistance,
      tpDistance,
      contractSize: pairObj.contractSize,
      warning
    };
  }, [calcPair, calcTradeAction, calcCapital, calcRiskPct, calcEntry, calcSl, calcTp, customPairs]);

  return (
    <div className="space-y-4 pb-6">
      <div className="text-left bg-cat-mantle border-2 border-cat-surface0 p-5 rounded-3xl brut-shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-cat-text tracking-tight flex items-center gap-2">
            <Calculator className="h-5 w-5 text-cat-lavender" />
            Risk & Position Size Calculator
          </h2>
          <p className="text-xs text-cat-subtext mt-1">
            Accurately calculate your ideal lot size based on risk level (%), Stop Loss distance, and your trading capital.
          </p>
        </div>
        <div className="bg-cat-base px-3.5 py-1.5 rounded-2xl border border-cat-surface0 flex flex-col font-mono text-right shrink-0">
          <span className="text-[9px] text-cat-subtext font-black uppercase tracking-wider">Connected Balance</span>
          <strong className="text-sm font-black text-cat-text">
            {formatCurrency(stats?.currentBalance || 0, currentCurrency)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 columns: Inputs */}
        <div className="lg:col-span-2 bg-white border-2 border-zinc-150 p-4.5 rounded-2xl flex flex-col gap-4 text-left shadow-none">
          <div>
            <span className="text-[10px] font-black tracking-widest text-zinc-900 uppercase">PARAMETER INPUT</span>
            <hr className="mt-1.5 border-zinc-100" />
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pair & Direction */}
            <div className="space-y-1">
              <label className="block text-[9px] text-cat-subtext font-bold uppercase">
                Pair / Trading Symbol
              </label>
              <select
                value={calcPair}
                onChange={e => setCalcPair(e.target.value)}
                className="w-full text-xs p-3 font-semibold cursor-pointer rounded-xl bg-cat-base border border-cat-surface0 text-cat-text focus:outline-none"
              >
                {customPairs.map(p => (
                  <option key={p.id} value={p.alias}>
                    {p.alias} ({p.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-cat-subtext font-bold uppercase">
                Position Order Direction
              </label>
              <div className="flex gap-2 bg-cat-base p-1 border border-cat-surface0 rounded-xl h-[40px] items-center">
                <button
                  type="button"
                  onClick={() => setCalcTradeAction('BUY')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition ${
                    calcTradeAction === 'BUY'
                      ? 'bg-cat-green text-white font-semibold'
                      : 'text-cat-subtext hover:text-cat-text hover:bg-cat-surface0/30'
                  }`}
                >
                  🟢 Buy
                </button>
                <button
                  type="button"
                  onClick={() => setCalcTradeAction('SELL')}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition ${
                    calcTradeAction === 'SELL'
                      ? 'bg-cat-red text-white font-semibold'
                      : 'text-cat-subtext hover:text-cat-text hover:bg-cat-surface0/30'
                  }`}
                >
                  🔴 Sell
                </button>
              </div>
            </div>

            {/* Trading Capital */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] text-cat-subtext font-bold uppercase">
                  Trading Capital
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (stats && stats.currentBalance) {
                      setCalcCapital(String(stats.currentBalance));
                    }
                  }}
                  className="text-[9px] font-bold uppercase text-cat-lavender hover:underline flex items-center gap-0.5 pointer-events-auto"
                >
                  <RefreshCw className="h-2.5 w-2.5 text-cat-lavender shrink-0" /> Reset to Balance
                </button>
              </div>
              <div className="relative">
                {/* Fixed position with sufficient padding so text/icon never overlaps with input values */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-cat-subtext select-none">
                  {currentCurrency}
                </div>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={calcCapital}
                  onChange={e => setCalcCapital(e.target.value)}
                  className="w-full text-xs py-3 font-mono font-semibold rounded-xl bg-cat-base border border-cat-surface0 text-cat-text focus:outline-none focus:ring-0 focus:shadow-none"
                  style={{ boxShadow: 'none', paddingLeft: '3.5rem', paddingRight: '1rem' }}
                />
              </div>
            </div>

            {/* Risk Percentage Input + Quick Presets */}
            <div className="space-y-1">
              <label className="block text-[9px] text-cat-subtext font-black uppercase">
                Limit Risk (% Capital) : <span className="text-cat-lavender font-mono font-black">{calcRiskPct}%</span>
              </label>
              <div className="flex bg-cat-base border border-cat-surface0 p-1 rounded-xl items-center h-[40px]">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  placeholder="1.0"
                  value={calcRiskPct}
                  onChange={e => setCalcRiskPct(e.target.value)}
                  className="w-16 text-center text-xs p-1 bg-transparent border-0 font-mono font-bold text-cat-text focus:outline-none border-r border-cat-surface0/50"
                />
                <div className="flex-1 flex gap-1 justify-around pl-1 overflow-x-auto">
                  {[0.5, 1, 1.5, 2, 3, 5].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCalcRiskPct(String(pct))}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition ${
                        parseFloat(calcRiskPct) === pct
                          ? 'bg-cat-lavender text-white'
                          : 'text-cat-subtext hover:bg-cat-surface0'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Price Metrics: Entry, SL & TP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-2">
            <div className="space-y-1">
              <label className="block text-[9px] text-cat-subtext font-black uppercase">
                Entry Price
              </label>
              <input
                type="number"
                step="any"
                placeholder="1.08200"
                value={calcEntry}
                onChange={e => setCalcEntry(e.target.value)}
                className="w-full text-xs p-3 font-mono font-bold rounded-xl bg-cat-base border border-cat-surface0 text-cat-text focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-cat-red font-black uppercase">
                Stop Loss (SL)
              </label>
              <input
                type="number"
                step="any"
                placeholder="1.07900"
                value={calcSl}
                onChange={e => setCalcSl(e.target.value)}
                className="w-full text-xs p-3 font-mono font-black rounded-xl bg-cat-base border-2 border-dashed border-cat-red bg-cat-red/5 text-cat-red focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] text-cat-green font-black uppercase">
                Take Profit (TP)
              </label>
              <input
                type="number"
                step="any"
                placeholder="1.08800"
                value={calcTp}
                onChange={e => setCalcTp(e.target.value)}
                className="w-full text-xs p-3 font-mono font-black rounded-xl bg-cat-base border-2 border-dashed border-cat-green bg-cat-green/5 text-cat-green focus:outline-none"
              />
            </div>
          </div>

          {/* Logic warnings if parameters do not match direction */}
          {calcResults.warning && (
            <div className="flex items-center gap-2 bg-cat-yellow/10 border-2 border-cat-yellow/30 text-cat-yellow p-3 rounded-xl text-xs font-semibold">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{calcResults.warning}</span>
            </div>
          )}
        </div>

        {/* Right column: Results Panel */}
        <div className="bg-cat-mantle border-2 border-cat-surface0 p-5 rounded-2xl flex flex-col justify-between text-left shadow-sm">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black tracking-widest text-[#4f46e5] uppercase">ESTIMATED OUTPUT</span>
              <hr className="mt-1.5 border-zinc-150" />
            </div>

            {/* LOT SIZE HIGHLIGHT */}
            <div className="bg-cat-base border-2 border-[#4f46e5]/30 p-4.5 rounded-2xl text-center shadow-xs">
              <span className="text-[9px] text-[#4f46e5] font-black uppercase tracking-widest block">
                RECOMMENDED LOT SIZE
              </span>
              <strong className="text-2xl font-black font-mono text-[#4f46e5] block mt-1.5 tracking-tight">
                {calcResults.requiredLots > 0 ? calcResults.requiredLots.toFixed(3) : '0.000'} <span className="text-xs font-bold font-sans">Lots</span>
              </strong>
              <span className="text-[9px] text-cat-subtext font-mono font-bold block mt-1">
                Contract Size: {calcResults.contractSize.toLocaleString()} unit / Lot
              </span>
            </div>

            {/* EXPECTED LOSS & REWARD */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-2 border-b border-cat-surface0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cat-red inline-block" />
                  <span className="font-bold text-cat-subtext">Expected Loss (Risk)</span>
                </div>
                <strong className="font-mono text-cat-red font-black">
                  -{formatCurrency(calcResults.riskAmount, currentCurrency)}
                </strong>
              </div>

              <div className="flex justify-between items-center text-xs py-2 border-b border-cat-surface0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cat-green inline-block" />
                  <span className="font-bold text-cat-subtext">Target Reward (Profit)</span>
                </div>
                <strong className="font-mono text-cat-green font-black">
                  +{formatCurrency(calcResults.rewardAmount, currentCurrency)}
                </strong>
              </div>

              <div className="flex justify-between items-center text-xs py-2 border-b border-cat-surface0">
                <span className="font-bold text-cat-subtext">Stop Loss Distance</span>
                <span className="font-mono text-cat-text font-black">{calcResults.slDistance.toFixed(5)} pips/points</span>
              </div>

              <div className="flex justify-between items-center text-xs py-2">
                <span className="font-bold text-cat-subtext">Risk/Reward (R:R) Ratio</span>
                <strong className="font-mono text-[#4f46e5] font-black">
                  1 : {calcResults.rrRatio > 0 ? calcResults.rrRatio.toFixed(1) : '0.0'}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cat-surface0 flex items-center gap-2">
            {calcResults.rrRatio >= 2 ? (
              <div className="w-full flex items-center gap-2 bg-cat-green/10 p-2.5 rounded-xl border border-cat-green/20">
                <ShieldCheck className="h-4.5 w-4.5 text-cat-green shrink-0" />
                <span className="text-[10px] text-cat-green font-bold">Excellent R:R! This setup is highly ideal for execution.</span>
              </div>
            ) : calcResults.rrRatio >= 1 ? (
              <div className="w-full flex items-center gap-2 bg-cat-blue/10 p-2.5 rounded-xl border border-cat-blue/20">
                <TrendingUp className="h-4.5 w-4.5 text-cat-blue shrink-0" />
                <span className="text-[10px] text-cat-blue font-bold">Balanced R:R. A ratio above 1.5R is recommended.</span>
              </div>
            ) : (
              <div className="w-full flex items-center gap-2 bg-cat-red/10 p-2.5 rounded-xl border border-cat-red/20">
                <AlertTriangle className="h-4.5 w-4.5 text-cat-red shrink-0" />
                <span className="text-[10px] text-cat-red font-bold">Bad R:R! Risk is higher than the potential reward.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
