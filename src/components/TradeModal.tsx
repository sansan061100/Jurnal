import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Calculator } from 'lucide-react';
import { Account, Trade, TradeAction, TradeSession, TradingPair } from '../types';
import { detectTradingSession, parseNumericString } from '../utils';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccountId: string;
  editingTrade: Trade | null;
  customPairs: TradingPair[];
  onSavePairs: (newPairs: TradingPair[]) => void;
  onSave: (tradeData: {
    accountId: string;
    pair: string;
    action: TradeAction;
    lotSize: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    exitPrice: number;
    pnl: number;
    entryDate: string;
    exitDate: string;
    session: TradeSession;
    notes: string;
    rrRatio?: number;
    rMultiple?: number;
    disciplineRating?: 'MATCH' | 'PATIENT' | 'FOMO' | 'REVENGE' | 'OVERLEVERAGE';
  }) => void;
}

export default function TradeModal({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  editingTrade,
  customPairs,
  onSave: onSave
}: TradeModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [isManualPnl, setIsManualPnl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isOpen]);

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLivePriceLoading, setIsLivePriceLoading] = useState(false);
  const [livePriceFetchError, setLivePriceFetchError] = useState(false);

  const [form, setForm] = useState({
    accountId: '',
    pair: 'EURUSD',
    action: 'BUY' as TradeAction,
    lotSize: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    exitPrice: '',
    pnl: '',
    entryDate: '',
    exitDate: '',
    session: 'London' as TradeSession,
    notes: '',
    rrRatio: 0,
    rMultiple: 0,
    disciplineRating: 'MATCH' as 'MATCH' | 'PATIENT' | 'FOMO' | 'REVENGE' | 'OVERLEVERAGE'
  });

  // Fetch live price when pair changes or manual trigger
  const fetchLivePriceForPair = async (targetPair: string) => {
    setIsLivePriceLoading(true);
    setLivePriceFetchError(false);
    try {
      const cleanPair = targetPair.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let price: number | null = null;

      // Gold fetches
      if (cleanPair === 'XAUUSD' || cleanPair === 'GOLD') {
        try {
          const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
          if (binanceRes.ok) {
            const bData = await binanceRes.json();
            if (bData && bData.price) {
              price = parseFloat(parseFloat(bData.price).toFixed(2));
            }
          }
        } catch (err) {
          console.warn('PAXGUSDT fetch warning, trying exchange...', err);
        }

        if (price === null) {
          try {
            const goldRes = await fetch('https://api.gold-api.com/v1/gold');
            if (goldRes.ok) {
              const gData = await goldRes.json();
              if (gData && gData.price) {
                price = parseFloat(parseFloat(gData.price).toFixed(2));
              }
            }
          } catch (err) {
            console.warn('Gold API backup warning...', err);
          }
        }
      }

      // Silver fetches
      if (cleanPair === 'XAGUSD' || cleanPair === 'XAG' || cleanPair === 'SILVER') {
        try {
          const res = await fetch('https://open.er-api.com/v6/latest/USD');
          if (res.ok) {
            const data = await res.json();
            const rates = data?.rates;
            if (rates && rates['XAG']) {
              price = parseFloat((1 / parseFloat(rates['XAG'])).toFixed(3));
            }
          }
        } catch (err) {
          console.warn('Silver ExchangeRate fallback warning...', err);
        }
      }

      // Cryptos
      const isCrypto = cleanPair.startsWith('BTC') || cleanPair.startsWith('ETH') || cleanPair.startsWith('SOL') || cleanPair.startsWith('BNB') || cleanPair.startsWith('DOGE') || cleanPair.startsWith('XRP');
      if (isCrypto) {
        try {
          const baseCrypto = cleanPair.replace('USD', '');
          const binanceSym = `${baseCrypto}USDT`;
          const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSym}`);
          if (binanceRes.ok) {
            const bData = await binanceRes.json();
            if (bData && bData.price) {
              price = parseFloat(parseFloat(bData.price).toFixed(2));
            }
          }
        } catch (binanceErr) {
          console.warn('Binance fetch failed, falling back...', binanceErr);
        }
      }

      // Forex and Metals
      if (price === null) {
        try {
          const res = await fetch('https://open.er-api.com/v6/latest/USD');
          if (res.ok) {
            const data = await res.json();
            const rates = data?.rates;
            if (rates) {
              if (cleanPair.length === 6) {
                const base = cleanPair.substring(0, 3);
                const quote = cleanPair.substring(3, 6);
                const rateBase = rates[base] ? parseFloat(rates[base]) : null;
                const rateQuote = rates[quote] ? parseFloat(rates[quote]) : null;

                if (base === 'USD' && rateQuote) {
                  price = parseFloat(rateQuote.toFixed(5));
                } else if (quote === 'USD' && rateBase) {
                  price = parseFloat((1 / rateBase).toFixed(5));
                } else if (rateBase && rateQuote) {
                  price = parseFloat((rateQuote / rateBase).toFixed(5));
                }
              }

              if (price === null && (cleanPair === 'XAUUSD' || cleanPair === 'GOLD')) {
                const xau = rates['XAU'];
                if (xau) price = parseFloat((1 / parseFloat(xau)).toFixed(2));
              }

              if (price === null && rates[cleanPair]) {
                price = parseFloat((1 / parseFloat(rates[cleanPair])).toFixed(5));
              }
            }
          }
        } catch (erApiErr) {
          console.warn('ExchangeRate-API warning...', erApiErr);
        }
      }

      // Coinbase API
      if (price === null) {
        try {
          const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
          if (res.ok) {
            const data = await res.json();
            const rates = data?.data?.rates;
            if (rates) {
              if (cleanPair.length === 6) {
                const base = cleanPair.substring(0, 3);
                const quote = cleanPair.substring(3, 6);
                const rateBase = rates[base] ? parseFloat(rates[base]) : null;
                const rateQuote = rates[quote] ? parseFloat(rates[quote]) : null;

                if (base === 'USD' && rateQuote) {
                  price = parseFloat(rateQuote.toFixed(5));
                } else if (quote === 'USD' && rateBase) {
                  price = parseFloat((1 / rateBase).toFixed(5));
                } else if (rateBase && rateQuote) {
                  price = parseFloat((rateQuote / rateBase).toFixed(5));
                }
              }
            }
          }
        } catch (coinbaseErr) {
          console.warn('Coinbase API fallback warning...', coinbaseErr);
        }
      }

      // Indices
      if (price === null) {
        if (cleanPair === 'NAS100') {
          price = 18550.00;
        } else if (cleanPair === 'US30') {
          price = 39100.00;
        }
      }

      if (price !== null) {
        setLivePrice(price);
        
        if (!editingTrade) {
          setForm(prev => {
            const distance = targetPair === 'XAUUSD' ? 5.0 : (cleanPair.includes('JPY') ? 0.30 : (cleanPair.includes('USD') && !cleanPair.startsWith('BTC') && !cleanPair.startsWith('ETH') ? 0.0020 : 0));
            const slDir = prev.action === 'BUY' ? -1 : 1;
            const tpDir = prev.action === 'BUY' ? 1 : -1;
            
            const newSL = distance > 0 ? parseFloat((price! + (slDir * distance)).toFixed(5)) : '';
            const newTP = distance > 0 ? parseFloat((price! + (tpDir * distance * 2.5)).toFixed(5)) : '';
            
            return {
              ...prev,
              entryPrice: String(price!),
              exitPrice: String(price!),
              stopLoss: newSL !== '' ? String(newSL) : '',
              takeProfit: newTP !== '' ? String(newTP) : ''
            };
          });
        }
      } else {
        setLivePrice(null);
        setLivePriceFetchError(true);
      }
    } catch (e) {
      console.error('Error fetching live rates:', e);
      setLivePriceFetchError(true);
    } finally {
      setIsLivePriceLoading(false);
    }
  };

  // Trigger live price feed when pair is selected
  useEffect(() => {
    if (isOpen && form.pair) {
      fetchLivePriceForPair(form.pair);
    } else {
      setLivePrice(null);
    }
  }, [form.pair, isOpen]);

  // Setup form values
  useEffect(() => {
    if (editingTrade) {
      const selectedPair = customPairs.find(p => p.alias === editingTrade.pair) || { contractSize: 100000 };
      const contract = selectedPair.contractSize;
      let calculatedPnl = 0;
      if (editingTrade.action === 'BUY') {
        calculatedPnl = (editingTrade.exitPrice - editingTrade.entryPrice) * editingTrade.lotSize * contract;
      } else {
        calculatedPnl = (editingTrade.entryPrice - editingTrade.exitPrice) * editingTrade.lotSize * contract;
      }
      calculatedPnl = parseFloat(calculatedPnl.toFixed(2));
      
      const isCustomPnl = Math.abs(editingTrade.pnl - calculatedPnl) > 0.05;
      setIsManualPnl(isCustomPnl);

      setForm({
          accountId: editingTrade.accountId,
          pair: editingTrade.pair,
          action: editingTrade.action,
          lotSize: String(editingTrade.lotSize),
          entryPrice: String(editingTrade.entryPrice),
          stopLoss: editingTrade.stopLoss !== undefined ? String(editingTrade.stopLoss) : '',
          takeProfit: editingTrade.takeProfit !== undefined ? String(editingTrade.takeProfit) : '',
          exitPrice: String(editingTrade.exitPrice),
          pnl: String(editingTrade.pnl),
          entryDate: editingTrade.entryDate ? editingTrade.entryDate.substring(0, 10) : '',
          exitDate: editingTrade.exitDate ? editingTrade.exitDate.substring(0, 10) : '',
          session: editingTrade.session,
          notes: editingTrade.notes || '',
          rrRatio: editingTrade.rrRatio || 0,
          rMultiple: editingTrade.rMultiple || 0,
          disciplineRating: editingTrade.disciplineRating || 'MATCH'
      });
    } else {
      setIsManualPnl(false);
      const defaultDate = '2026-05-21';
      const initialAccountId = activeAccountId && activeAccountId !== 'all_accounts' 
        ? activeAccountId 
        : (accounts[0]?.id || '');

      setForm({
        accountId: initialAccountId,
        pair: customPairs[0]?.alias || 'EURUSD',
        action: 'BUY',
        lotSize: '',
        entryPrice: '',
        stopLoss: '',
        takeProfit: '',
        exitPrice: '',
        pnl: '',
        entryDate: defaultDate,
        exitDate: defaultDate,
        session: 'London',
        notes: '',
        rrRatio: 0,
        rMultiple: 0,
        disciplineRating: 'MATCH'
      });
    }
  }, [editingTrade, activeAccountId, accounts, isOpen, customPairs]);

  // Handle auto calculations dynamically
  useEffect(() => {
    const selectedPair = customPairs.find(p => p.alias === form.pair) || { contractSize: 100000 };
    const contract = selectedPair.contractSize;

    // 1. Calculate P&L
    let calculatedPnl = 0;
    const lotVal = parseNumericString(form.lotSize);
    const entryVal = parseNumericString(form.entryPrice);
    const exitVal = parseNumericString(form.exitPrice);

    if (form.action === 'BUY') {
      calculatedPnl = (exitVal - entryVal) * lotVal * contract;
    } else {
      calculatedPnl = (entryVal - exitVal) * lotVal * contract;
    }
    calculatedPnl = parseFloat(calculatedPnl.toFixed(2));

    const pnlVal = parseNumericString(form.pnl);
    const activePnl = isManualPnl ? pnlVal : calculatedPnl;

    // 2. Calculate Setup Risk Reward (Target RR)
    let calculatedRr = 0;
    const numSl = parseNumericString(form.stopLoss);
    const numTp = parseNumericString(form.takeProfit);
    if (form.stopLoss !== '' && form.takeProfit !== '' && !isNaN(numSl) && !isNaN(numTp) && numSl !== entryVal) {
      const risk = Math.abs(entryVal - numSl);
      const reward = Math.abs(numTp - entryVal);
      if (risk > 0) {
        calculatedRr = parseFloat((reward / risk).toFixed(2));
      }
    }

    // 3. Calculate Realized R-Multiple
    let calculatedRMultiple = 0;
    if (form.stopLoss !== '' && !isNaN(numSl) && numSl !== entryVal) {
      const riskPerUnit = Math.abs(entryVal - numSl);
      if (riskPerUnit > 0) {
        const riskAmount = riskPerUnit * lotVal * contract;
        if (riskAmount > 0) {
          calculatedRMultiple = parseFloat((activePnl / riskAmount).toFixed(2));
        }
      }
    }

    setForm(prev => {
      const targetPnlStr = isManualPnl ? prev.pnl : String(calculatedPnl);
      if (
        prev.pnl !== targetPnlStr ||
        prev.rrRatio !== calculatedRr ||
        prev.rMultiple !== calculatedRMultiple
      ) {
        return {
          ...prev,
          pnl: targetPnlStr,
          rrRatio: calculatedRr,
          rMultiple: calculatedRMultiple
        };
      }
      return prev;
    });
  }, [form.pair, form.action, form.lotSize, form.entryPrice, form.exitPrice, form.stopLoss, form.takeProfit, customPairs, isManualPnl, form.pnl]);

  // Auto detect session on Entry Date change
  const handleEntryDateChange = (dateStr: string) => {
    const session = detectTradingSession(dateStr);
    setForm(prev => ({
      ...prev,
      entryDate: dateStr,
      exitDate: dateStr,
      session: session
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    if (!form.accountId) {
      alert('Please select a trading account first!');
      return;
    }
    if (!form.pair) {
      alert('Symbol/Pair is required!');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    const slVal = form.stopLoss !== '' ? parseNumericString(form.stopLoss) : undefined;
    const tpVal = form.takeProfit !== '' ? parseNumericString(form.takeProfit) : undefined;

    try {
      await onSave({
        ...form,
        lotSize: parseNumericString(form.lotSize),
        entryPrice: parseNumericString(form.entryPrice),
        exitPrice: parseNumericString(form.exitPrice),
        pnl: parseNumericString(form.pnl),
        stopLoss: slVal,
        takeProfit: tpVal
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  if (!isOpen) return null;

  const selectedPairObj = customPairs.find(p => p.alias === form.pair) || { id: 'fallback', alias: form.pair || 'EURUSD', name: 'Standard Forex', contractSize: 100000 };
  const currentMultiplier = selectedPairObj.contractSize;
  const entryPriceNum = parseNumericString(form.entryPrice);
  const lotSizeNum = parseNumericString(form.lotSize);
  const stopLossNum = form.stopLoss !== '' ? parseNumericString(form.stopLoss) : 0;
  const takeProfitNum = form.takeProfit !== '' ? parseNumericString(form.takeProfit) : 0;

  const unitRisk = form.stopLoss !== '' ? Math.abs(entryPriceNum - stopLossNum) : 0;
  const cashRisk = unitRisk * lotSizeNum * currentMultiplier;
  const unitReward = form.takeProfit !== '' ? Math.abs(takeProfitNum - entryPriceNum) : 0;
  const cashReward = unitReward * lotSizeNum * currentMultiplier;
  
  const selectedAccount = accounts.find(acc => acc.id === form.accountId) || accounts[0];
  const activeCurrency = selectedAccount?.currency || 'USD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/90 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cat-mantle border-2 border-cat-surface0 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl z-50 flex flex-col max-h-[92vh] select-none"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b-2 border-cat-surface0">
          <h3 className="text-sm font-black text-cat-text flex items-center gap-2 uppercase tracking-wider">
            <Calculator className="h-4.5 w-4.5 text-cat-lavender" />
            {editingTrade ? 'Edit Trade Log' : 'Create Trade Log'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext transition-all cursor-pointer border border-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Account Selector */}
            <div>
              <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                Trading Account *
              </label>
              <select
                value={form.accountId}
                onChange={e => setForm(prev => ({ ...prev, accountId: e.target.value }))}
                required
                className="w-full text-xs p-3 font-bold cursor-pointer"
              >
                <option value="" disabled>--- Select Account ---</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    💼 {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Pair & Action */}
            <div className="grid grid-cols-2 gap-4">
              {/* Pair selection */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Symbol / Pair *
                </label>
                <select
                  value={form.pair}
                  onChange={e => setForm(prev => ({ ...prev, pair: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-bold cursor-pointer"
                >
                  {customPairs.map(p => (
                    <option key={p.alias} value={p.alias}>{p.alias} ({p.name})</option>
                  ))}
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Order Action *
                </label>
                <div className="grid grid-cols-2 gap-1 bg-cat-base p-1 border-2 border-cat-surface0 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, action: 'BUY' }))}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      form.action === 'BUY'
                        ? 'bg-cat-green text-cat-base shadow-sm'
                        : 'text-cat-subtext hover:text-cat-text'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, action: 'SELL' }))}
                    className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      form.action === 'SELL'
                        ? 'bg-cat-red text-cat-base shadow-sm'
                        : 'text-cat-subtext hover:text-cat-text'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
            </div>

            {/* Entry Price & Lot Size */}
            <div className="grid grid-cols-2 gap-4">
              {/* Entry Price */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Entry Price *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 1.12000"
                  value={form.entryPrice}
                  onChange={e => setForm(prev => ({ ...prev, entryPrice: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-black"
                />
              </div>

              {/* Lot Size */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Lot Size *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g. 0.10"
                  value={form.lotSize}
                  onChange={e => setForm(prev => ({ ...prev, lotSize: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-black"
                />
              </div>
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-4">
              {/* Stop Loss */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Stop Loss (SL) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Stop loss value"
                  value={form.stopLoss}
                  onChange={e => setForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-black text-cat-red"
                />
              </div>

              {/* Take Profit */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Take Profit (TP) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="Take profit target"
                  value={form.takeProfit}
                  onChange={e => setForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-black text-cat-green"
                />
              </div>
            </div>

            {/* Exit Price */}
            <div>
              <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                Exit Price / Close *
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                placeholder="e.g. 1.12500"
                value={form.exitPrice}
                onChange={e => setForm(prev => ({ ...prev, exitPrice: e.target.value }))}
                className="w-full text-xs p-3 font-mono font-black"
              />
            </div>

            {/* Risk Engine Automatic Calculated Metrics */}
            <div className="bg-cat-base/30 border-2 border-cat-surface0 p-4 rounded-2xl space-y-3.5">
              <div className="text-[10px] font-black text-cat-lavender uppercase tracking-widest flex items-center justify-between pb-2 border-b border-cat-surface0/30">
                <span>⚡ RISK ENGINE</span>
                <span className="bg-cat-surface0 px-1.5 py-0.5 rounded text-[8px] text-cat-subtext font-mono font-bold">
                  Multiplier: {selectedPairObj.alias} x{currentMultiplier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                {/* Planned Risk */}
                <div className="bg-cat-mantle border border-cat-surface0/50 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[9px] text-cat-subtext font-black uppercase mb-0.5">ESTIMATED RISK (1R)</span>
                  <span className="text-cat-red font-mono font-black text-xs">
                    {formatCurrencyExact(-cashRisk, activeCurrency)}
                  </span>
                  <span className="text-[8px] text-cat-subtext mt-0.5 font-mono">
                    ({unitRisk.toFixed(5)} units)
                  </span>
                </div>

                {/* Planned Reward */}
                <div className="bg-cat-mantle border border-cat-surface0/50 p-2.5 rounded-xl flex flex-col">
                  <span className="text-[9px] text-cat-subtext font-black uppercase mb-0.5">TARGET ESTIMATE</span>
                  <span className="text-cat-green font-mono font-black text-xs">
                    +{formatCurrencyExact(cashReward, activeCurrency)}
                  </span>
                  <span className="text-[8px] text-cat-subtext mt-0.5 font-mono">
                    ({unitReward.toFixed(5)} units)
                  </span>
                </div>

                {/* RR Setup Ratio */}
                <div className="bg-cat-mantle border border-cat-surface0/50 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] text-cat-subtext font-black uppercase mb-0.5">EST. RISK RATION (RR)</span>
                    <span className="font-mono text-cat-lavender font-black">
                      1 : {form.rrRatio.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Realized R Multiple */}
                <div className="bg-cat-mantle border border-cat-surface0/50 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[9px] text-cat-subtext font-black uppercase mb-0.5">REALIZED R VALUE</span>
                    <span className={`font-mono font-black ${form.rMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                      {form.rMultiple >= 0 ? '+' : ''}{form.rMultiple.toFixed(2)} R
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculated PNL Output Display & Manual Input Override */}
              <div className="p-3.5 bg-cat-mantle border border-cat-surface0 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-cat-text uppercase tracking-widest flex items-center gap-1">
                    💵 Net P&L ({activeCurrency}) :
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!isManualPnl}
                      onChange={(e) => {
                        const useAuto = e.target.checked;
                        setIsManualPnl(!useAuto);
                        if (useAuto) {
                          const selectedPair = customPairs.find(p => p.alias === form.pair) || { contractSize: 100000 };
                          const contract = selectedPair.contractSize;
                          let calculatedPnl = 0;
                          const entryVal = parseNumericString(form.entryPrice);
                          const exitVal = parseNumericString(form.exitPrice);
                          const lotVal = parseNumericString(form.lotSize);
                          if (form.action === 'BUY') {
                            calculatedPnl = (exitVal - entryVal) * lotVal * contract;
                          } else {
                            calculatedPnl = (entryVal - exitVal) * lotVal * contract;
                          }
                          calculatedPnl = parseFloat(calculatedPnl.toFixed(2));
                          setForm(prev => ({ ...prev, pnl: String(calculatedPnl) }));
                        }
                      }}
                      className="h-3.5 w-3.5 rounded bg-cat-base text-cat-lavender cursor-pointer border-2 border-cat-surface0"
                    />
                    <span className="text-[9px] font-black uppercase text-cat-text tracking-wider">
                      Auto Calculate
                    </span>
                  </label>
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono font-black text-[10px] text-cat-subtext">
                    {activeCurrency}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.pnl}
                    disabled={!isManualPnl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(prev => ({ ...prev, pnl: val }));
                    }}
                    className={`w-full bg-cat-base text-xs py-2.5 rounded-xl focus:outline-none font-mono font-black border-2 border-cat-surface0 ${
                      !isManualPnl 
                        ? 'text-cat-subtext/60 cursor-not-allowed opacity-80' 
                        : 'focus:ring-1 focus:ring-cat-lavender'
                    } ${parseNumericString(form.pnl) >= 0 ? 'text-cat-green' : 'text-cat-red'}`}
                    style={{ paddingLeft: '3.5rem', paddingRight: '4rem' }}
                    placeholder="0.00"
                  />
                  <span className="absolute right-3 text-[8px] font-black uppercase text-cat-text tracking-wider">
                    {!isManualPnl ? 'AUTO' : 'MANUAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Date & Session */}
            <div className="grid grid-cols-2 gap-4">
              {/* Single Date Date */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.entryDate}
                  onChange={e => handleEntryDateChange(e.target.value)}
                  className="w-full text-xs p-3 font-black text-center"
                />
              </div>

              {/* Session */}
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Trading Session
                </label>
                <select
                  value={form.session}
                  onChange={e => setForm(prev => ({ ...prev, session: e.target.value as TradeSession }))}
                  className="w-full text-xs p-3 cursor-pointer font-black"
                >
                  <option value="Asian">🇲🇨 Asian Session</option>
                  <option value="London">🇬🇧 London Session</option>
                  <option value="New York">🇺🇸 New York Session</option>
                  <option value="Other">🌍 Other / Weekend</option>
                </select>
              </div>
            </div>

            {/* Discipline & Psychology Rating (Gamified) */}
            <div className="bg-cat-base/30 border-2 border-cat-surface0 p-3 rounded-2xl space-y-2">
              <label className="block text-[9px] font-black text-cat-lavender uppercase tracking-widest text-left">
                🎯 DISIPLIN & PSIKOLOGI ENTRI (JOURNAL BADGE)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { key: 'MATCH', emoji: '🎯', title: 'Plan Aligned', color: 'text-cat-green bg-cat-green/10 border-cat-green', hover: 'hover:border-cat-green/60 hover:text-cat-green' },
                  { key: 'PATIENT', emoji: '🐢', title: 'Patient Entry', color: 'text-cat-teal bg-cat-teal/10 border-cat-teal', hover: 'hover:border-cat-teal/60 hover:text-cat-teal' },
                  { key: 'FOMO', emoji: '😡', title: 'FOMO Chase', color: 'text-cat-yellow bg-cat-yellow/10 border-cat-yellow', hover: 'hover:border-cat-yellow/60 hover:text-cat-yellow' },
                  { key: 'REVENGE', emoji: '🤯', title: 'Revenge Trade', color: 'text-cat-red bg-cat-red/10 border-[#e05f65]', hover: 'hover:border-[#e05f65]/60 hover:text-cat-red' },
                  { key: 'OVERLEVERAGE', emoji: '🐘', title: 'Big Lot / Risk', color: 'text-cat-peach bg-cat-peach/10 border-cat-peach', hover: 'hover:border-cat-peach/60 hover:text-cat-peach' },
                ].map(item => {
                  const isSelected = form.disciplineRating === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, disciplineRating: item.key as any }))}
                      className={`py-2 px-1 rounded-xl border-2 flex flex-col items-center justify-center text-center transition cursor-pointer select-none focus:outline-none ${
                        isSelected 
                          ? `${item.color} scale-[1.03] shadow-inner` 
                          : 'border-cat-surface0 bg-cat-mantle text-cat-subtext hover:bg-cat-surface0/50 ' + item.hover
                      }`}
                    >
                      <span className="text-base mb-1">{item.emoji}</span>
                      <span className="text-[8px] font-black uppercase tracking-tight leading-tight block">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                Trade Setup Notes / Psychological Remarks
              </label>
              <textarea
                rows={2.5}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Declare details, FVG tags, SMC setups, or checklist confirmations..."
                className="w-full text-xs p-3 leading-relaxed font-bold"
              />
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-cat-surface0/30">
              <button
                type="button"
                onClick={onClose}
                className="hover:bg-cat-surface0 text-cat-subtext font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition hover:text-cat-text cursor-pointer border border-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-cat-lavender hover:bg-cat-mau text-cat-base font-black px-6 py-3 rounded-xl text-xs border-2 border-cat-surface0 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {isSaving ? 'Saving...' : 'Save Journal Position'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// Helpers
function formatCurrencyExact(value: number, currency: string = 'USD'): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  let prefix = '';
  if (currency === 'USC') {
    prefix = '¢';
  } else if (currency === 'IDR') {
    prefix = 'Rp';
  } else {
    prefix = '$';
  }
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(absValue);
  return `${isNegative ? '-' : ''}${prefix}${formattedNum}`;
}
