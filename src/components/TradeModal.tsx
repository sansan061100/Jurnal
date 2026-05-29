import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator, Settings, Plus, Trash2, HelpCircle, RefreshCw } from 'lucide-react';
import { Account, Trade, TradeAction, TradeSession, TradingPair } from '../types';
import { detectTradingSession } from '../utils';

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
    strategy: string;
    notes: string;
    rrRatio?: number;
    rMultiple?: number;
  }) => void;
}

export default function TradeModal({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  editingTrade,
  customPairs,
  onSavePairs,
  onSave
}: TradeModalProps) {
  // Real-time live price state
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

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
    lotSize: 0.1,
    entryPrice: 1.12000,
    stopLoss: '' as string | number,
    takeProfit: '' as string | number,
    exitPrice: 1.12500,
    pnl: 50.00,
    entryDate: '',
    exitDate: '',
    session: 'London' as TradeSession,
    strategy: 'Order Block SMC',
    notes: '',
    rrRatio: 0,
    rMultiple: 0
  });

  // Fetch live price when pair changes or manual trigger
  const fetchLivePriceForPair = async (targetPair: string) => {
    setIsLivePriceLoading(true);
    setLivePriceFetchError(false);
    try {
      const cleanPair = targetPair.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let price: number | null = null;

      // 0. Dedicated Gold (XAUUSD / GOLD) fetches for ultimate reliability!
      if (cleanPair === 'XAUUSD' || cleanPair === 'GOLD') {
        // Source A: Try Binance PAXGUSDT which tracks XAUUSD extremely accurately 24/7 with zero CORS and zero downtime
        try {
          const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
          if (binanceRes.ok) {
            const bData = await binanceRes.json();
            if (bData && bData.price) {
              price = parseFloat(parseFloat(bData.price).toFixed(2));
              console.log('Fetched Gold price from PAXGUSDT:', price);
            }
          }
        } catch (err) {
          console.warn('PAXGUSDT sync failed, trying next gold source...', err);
        }

        // Source B: Try free Gold API (api.gold-api.com/v1/gold)
        if (price === null) {
          try {
            const goldRes = await fetch('https://api.gold-api.com/v1/gold');
            if (goldRes.ok) {
              const gData = await goldRes.json();
              if (gData && gData.price) {
                price = parseFloat(parseFloat(gData.price).toFixed(2));
                console.log('Fetched Gold price from gold-api:', price);
              }
            }
          } catch (err) {
            console.warn('Gold API sync failed, trying next source...', err);
          }
        }
      }

      // Dedicated Silver (XAGUSD / SILVER / XAG) fetches for ultimate reliability!
      if (cleanPair === 'XAGUSD' || cleanPair === 'XAG' || cleanPair === 'SILVER') {
        try {
          const res = await fetch('https://open.er-api.com/v6/latest/USD');
          if (res.ok) {
            const data = await res.json();
            const rates = data?.rates;
            if (rates && rates['XAG']) {
              price = parseFloat((1 / parseFloat(rates['XAG'])).toFixed(3));
              console.log('Fetched Silver price from ExchangeRate-API:', price);
            }
          }
        } catch (err) {
          console.warn('Silver ExchangeRate-API sync failed, trying fallback...', err);
        }

        if (price === null) {
          try {
            const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD');
            if (res.ok) {
              const data = await res.json();
              const rates = data?.data?.rates;
              if (rates && rates['XAG']) {
                price = parseFloat((1 / parseFloat(rates['XAG'])).toFixed(3));
                console.log('Fetched Silver price from Coinbase:', price);
              }
            }
          } catch (err) {
            console.warn('Silver Coinbase sync failed...', err);
          }
        }
      }

      // 1. If it's a crypto pair (BTCUSD, ETHUSD, etc.), try Binance public ticker API first!
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

      // 2. Try ExchangeRate-API (open.er-api.com) as primary source for Forex & Metals!
      if (price === null) {
        try {
          const res = await fetch('https://open.er-api.com/v6/latest/USD');
          if (res.ok) {
            const data = await res.json();
            const rates = data?.rates;
            if (rates) {
              // Case 1: Standard 6-letter currency pairs (e.g. EURUSD, GBPJPY)
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

              // Case 2: Special Gold Commodities (XAUUSD)
              if (price === null && (cleanPair === 'XAUUSD' || cleanPair === 'GOLD')) {
                const xau = rates['XAU'];
                if (xau) {
                  price = parseFloat((1 / parseFloat(xau)).toFixed(2));
                }
              }

              // Case 3: Directly mapped symbols
              if (price === null && rates[cleanPair]) {
                price = parseFloat((1 / parseFloat(rates[cleanPair])).toFixed(5));
              }

              // Case 4: Crypto backup
              if (price === null && cleanPair.endsWith('USD')) {
                const baseCrypto = cleanPair.replace('USD', '');
                if (rates[baseCrypto]) {
                  price = parseFloat((1 / parseFloat(rates[baseCrypto])).toFixed(5));
                }
              }

              // Case 5: Generic matching for any custom-added pair containing USD/USDT
              if (price === null) {
                for (const key of Object.keys(rates)) {
                  if (key.length >= 3 && cleanPair.includes(key)) {
                    const rateVal = parseFloat(rates[key]);
                    if (rateVal > 0) {
                      if (cleanPair.endsWith('USD') || cleanPair.endsWith('USDT')) {
                        price = parseFloat((1 / rateVal).toFixed(5));
                        break;
                      } else if (cleanPair.startsWith('USD')) {
                        price = parseFloat(rateVal.toFixed(5));
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (erApiErr) {
          console.warn('ExchangeRate-API fetch failed, falling back...', erApiErr);
        }
      }

      // 3. Fallback to Coinbase API
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

              if (price === null && rates[cleanPair]) {
                price = parseFloat((1 / parseFloat(rates[cleanPair])).toFixed(5));
              }

              if (price === null && cleanPair.endsWith('USD')) {
                const baseCrypto = cleanPair.replace('USD', '');
                if (rates[baseCrypto]) {
                  price = parseFloat((1 / parseFloat(rates[baseCrypto])).toFixed(5));
                }
              }

              if (price === null && (cleanPair === 'XAUUSD' || cleanPair === 'GOLD')) {
                const xau = rates['XAU'] || rates['XAUUSD'];
                if (xau) {
                  price = parseFloat((1 / parseFloat(xau)).toFixed(2));
                }
              }

              if (price === null && (cleanPair === 'XAGUSD' || cleanPair === 'XAG' || cleanPair === 'SILVER')) {
                const xag = rates['XAG'] || rates['XAGUSD'] || rates['SILVER'];
                if (xag) {
                  price = parseFloat((1 / parseFloat(xag)).toFixed(3));
                }
              }

              // Generic matching for custom-added pairs containing USD/USDT on Coinbase rates
              if (price === null) {
                for (const key of Object.keys(rates)) {
                  if (key.length >= 3 && cleanPair.includes(key)) {
                    const rateVal = parseFloat(rates[key]);
                    if (rateVal > 0) {
                      if (cleanPair.endsWith('USD') || cleanPair.endsWith('USDT')) {
                        price = parseFloat((1 / rateVal).toFixed(5));
                        break;
                      } else if (cleanPair.startsWith('USD')) {
                        price = parseFloat(rateVal.toFixed(5));
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (coinbaseErr) {
          console.warn('Coinbase API fetch failed...', coinbaseErr);
        }
      }

      // Fallback estimate for Stock Market Indices (NAS100 / US30) if still null
      if (price === null) {
        if (cleanPair === 'NAS100') {
          price = 18550.00; // standard fallback approximate
        } else if (cleanPair === 'US30') {
          price = 39100.00; // standard fallback approximate
        }
      }

      if (price !== null) {
        setLivePrice(price);
        
        // Auto update prices during creation of *new* trades only
        if (!editingTrade) {
          setForm(prev => {
            const distance = targetPair === 'XAUUSD' ? 5.0 : (cleanPair.includes('JPY') ? 0.30 : (cleanPair.includes('USD') && !cleanPair.startsWith('BTC') && !cleanPair.startsWith('ETH') ? 0.0020 : 0));
            const slDir = prev.action === 'BUY' ? -1 : 1;
            const tpDir = prev.action === 'BUY' ? 1 : -1;
            
            const newSL = distance > 0 ? parseFloat((price! + (slDir * distance)).toFixed(5)) : '';
            const newTP = distance > 0 ? parseFloat((price! + (tpDir * distance * 2.5)).toFixed(5)) : '';
            
            return {
              ...prev,
              entryPrice: price!,
              exitPrice: price!,
              stopLoss: newSL,
              takeProfit: newTP
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

  // Calculate default entry dates (UTC 2026-05-20/21)
  useEffect(() => {
    if (editingTrade) {
      setForm({
        accountId: editingTrade.accountId,
        pair: editingTrade.pair,
        action: editingTrade.action,
        lotSize: editingTrade.lotSize,
        entryPrice: editingTrade.entryPrice,
        stopLoss: editingTrade.stopLoss !== undefined ? editingTrade.stopLoss : '',
        takeProfit: editingTrade.takeProfit !== undefined ? editingTrade.takeProfit : '',
        exitPrice: editingTrade.exitPrice,
        pnl: editingTrade.pnl,
        entryDate: editingTrade.entryDate,
        exitDate: editingTrade.exitDate,
        session: editingTrade.session,
        strategy: editingTrade.strategy,
        notes: editingTrade.notes || '',
        rrRatio: editingTrade.rrRatio || 0,
        rMultiple: editingTrade.rMultiple || 0
      });
    } else {
      const defaultDate = '2026-05-21T10:00';
      const initialAccountId = activeAccountId && activeAccountId !== 'all_accounts' 
        ? activeAccountId 
        : (accounts[0]?.id || '');

      setForm({
        accountId: initialAccountId,
        pair: customPairs[0]?.alias || 'EURUSD',
        action: 'BUY',
        lotSize: 0.1,
        entryPrice: 1.12000,
        stopLoss: 1.11500,
        takeProfit: 1.13500,
        exitPrice: 1.12500,
        pnl: 50.00,
        entryDate: defaultDate,
        exitDate: defaultDate,
        session: 'London',
        strategy: 'Order Block SMC',
        notes: '',
        rrRatio: 3.0,
        rMultiple: 1.0
      });
    }
  }, [editingTrade, activeAccountId, accounts, isOpen, customPairs]);

  // Handle auto calculations dynamically
  useEffect(() => {
    const selectedPair = customPairs.find(p => p.alias === form.pair) || { contractSize: 100000 };
    const contract = selectedPair.contractSize;

    // 1. Calculate P&L
    let calculatedPnl = 0;
    if (form.action === 'BUY') {
      calculatedPnl = (form.exitPrice - form.entryPrice) * form.lotSize * contract;
    } else {
      calculatedPnl = (form.entryPrice - form.exitPrice) * form.lotSize * contract;
    }
    calculatedPnl = parseFloat(calculatedPnl.toFixed(2));

    // 2. Calculate Setup Risk Reward (Target RR)
    let calculatedRr = 0;
    const numSl = Number(form.stopLoss);
    const numTp = Number(form.takeProfit);
    if (form.stopLoss !== '' && form.takeProfit !== '' && !isNaN(numSl) && !isNaN(numTp) && numSl !== form.entryPrice) {
      const risk = Math.abs(form.entryPrice - numSl);
      const reward = Math.abs(numTp - form.entryPrice);
      if (risk > 0) {
        calculatedRr = parseFloat((reward / risk).toFixed(2));
      }
    }

    // 3. Calculate Realized R-Multiple
    let calculatedRMultiple = 0;
    if (form.stopLoss !== '' && !isNaN(numSl) && numSl !== form.entryPrice) {
      const riskPerUnit = Math.abs(form.entryPrice - numSl);
      if (riskPerUnit > 0) {
        const riskAmount = riskPerUnit * form.lotSize * contract;
        if (riskAmount > 0) {
          calculatedRMultiple = parseFloat((calculatedPnl / riskAmount).toFixed(2));
        }
      }
    }

    setForm(prev => {
      if (
        prev.pnl !== calculatedPnl ||
        prev.rrRatio !== calculatedRr ||
        prev.rMultiple !== calculatedRMultiple
      ) {
        return {
          ...prev,
          pnl: calculatedPnl,
          rrRatio: calculatedRr,
          rMultiple: calculatedRMultiple
        };
      }
      return prev;
    });
  }, [form.pair, form.action, form.lotSize, form.entryPrice, form.exitPrice, form.stopLoss, form.takeProfit, customPairs]);

  // Auto detect session on Entry Date change
  const handleEntryDateChange = (dateStr: string) => {
    const session = detectTradingSession(dateStr);
    setForm(prev => ({
      ...prev,
      entryDate: dateStr,
      session: session
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    if (!form.accountId) {
      alert('Silakan pilih akun trading terlebih dahulu!');
      return;
    }
    if (!form.pair) {
      alert('Pair / Symbol wajib diisi!');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    // Prepare clean parameters to pass upwards
    const slVal = form.stopLoss !== '' ? Number(form.stopLoss) : undefined;
    const tpVal = form.takeProfit !== '' ? Number(form.takeProfit) : undefined;

    try {
      await onSave({
        ...form,
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

  // Derive extra details
  const selectedPairObj = customPairs.find(p => p.alias === form.pair) || { id: 'fallback', alias: form.pair || 'EURUSD', name: 'Standard Forex', contractSize: 100000 };
  const currentMultiplier = selectedPairObj.contractSize;
  const unitRisk = form.stopLoss !== '' ? Math.abs(form.entryPrice - Number(form.stopLoss)) : 0;
  const cashRisk = unitRisk * form.lotSize * currentMultiplier;
  const unitReward = form.takeProfit !== '' ? Math.abs(Number(form.takeProfit) - form.entryPrice) : 0;
  const cashReward = unitReward * form.lotSize * currentMultiplier;

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
        className="bg-cat-mantle border border-cat-surface1 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl z-50 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-cat-surface0 flex items-center justify-between bg-cat-base/30">
          <h3 className="text-sm font-bold text-cat-text flex items-center gap-2">
            <Calculator className="h-4.5 w-4.5 text-cat-lavender" />
            {editingTrade ? 'Ubah Jurnal Transaksi' : 'Catat Transaksi Professional'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext transition-all cursor-pointer"
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
            {/* Account selector inside Modal */}
            <div>
              <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                    Akun Trading *
                  </label>
                  <select
                    value={form.accountId}
                    onChange={e => setForm(prev => ({ ...prev, accountId: e.target.value }))}
                    required
                    className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none transition-all cursor-pointer font-bold"
                  >
                    <option value="" disabled>--- Pilih Akun ---</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        💼 {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pair & Action (Side-by-side) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pair selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>Pair / Symbol *</span>
                      {isLivePriceLoading && (
                        <span className="text-[9px] text-cat-lavender animate-pulse font-mono lowercase tracking-normal">memuat rate...</span>
                      )}
                    </label>
                    <select
                      value={form.pair}
                      onChange={e => setForm(prev => ({ ...prev, pair: e.target.value }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none transition-all font-mono font-bold cursor-pointer"
                    >
                      {customPairs.map(p => (
                        <option key={p.alias} value={p.alias}>{p.alias} ({p.name})</option>
                      ))}
                    </select>

                    {/* Live Price Feedback Area */}
                    <div className="mt-1.5 flex items-center justify-between px-1">
                      {livePrice !== null ? (
                        <div className="flex items-center gap-1.5 select-none">
                          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-cat-green animate-ping" />
                          <span className="text-[10px] font-mono font-extrabold text-cat-green">
                            Live: {livePrice.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                          </span>
                        </div>
                      ) : livePriceFetchError ? (
                        <span className="text-[10px] font-bold text-cat-red select-none">⚠️ Gagal sync live</span>
                      ) : (
                        <span className="text-[10px] text-cat-overlay2 font-medium select-none anim-pulse">Lacak live...</span>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => fetchLivePriceForPair(form.pair)}
                        disabled={isLivePriceLoading}
                        className="text-[9px] font-black uppercase text-cat-peach hover:text-cat-yellow transition-all flex items-center gap-1 cursor-pointer select-none"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isLivePriceLoading ? 'animate-spin' : ''}`} />
                        Sync Manual
                      </button>
                    </div>
                  </div>

                  {/* Action */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Tipe Eksekusi *
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-cat-base p-1 rounded-xl border border-cat-surface1">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, action: 'BUY' }))}
                        className={`py-2 rounded-lg text-xs font-black transition-all ${
                          form.action === 'BUY'
                            ? 'bg-cat-green text-cat-crust shadow-sm shadow-cat-green/10'
                            : 'text-cat-subtext hover:text-cat-text'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, action: 'SELL' }))}
                        className={`py-2 rounded-lg text-xs font-black transition-all ${
                          form.action === 'SELL'
                            ? 'bg-cat-red text-cat-crust shadow-sm shadow-cat-red/10'
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
                    <div className="flex items-center justify-between mb-1 select-none">
                      <label className="block text-[10px] font-bold text-cat-subtext uppercase tracking-wider">
                        Harga Entry *
                      </label>
                      {livePrice !== null && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, entryPrice: livePrice }))}
                          className="text-[9px] text-cat-peach hover:text-cat-yellow font-black uppercase tracking-wider"
                        >
                          Gunakan Live
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.entryPrice}
                      onChange={e => setForm(prev => ({ ...prev, entryPrice: Number(e.target.value) }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none font-mono font-bold"
                    />
                  </div>

                  {/* Lot Size */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Ukuran Lot *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={form.lotSize}
                      onChange={e => setForm(prev => ({ ...prev, lotSize: Number(e.target.value) }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Stop Loss & Take Profit */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Stop Loss */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Stop Loss (SL) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Batas Stop Loss"
                      value={form.stopLoss}
                      onChange={e => setForm(prev => ({ ...prev, stopLoss: e.target.value }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none font-mono font-bold text-cat-red"
                    />
                  </div>

                  {/* Take Profit */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Take Profit (TP) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Target Profit"
                      value={form.takeProfit}
                      onChange={e => setForm(prev => ({ ...prev, takeProfit: e.target.value }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none font-mono font-bold text-cat-green"
                    />
                  </div>
                </div>

                {/* Exit Price */}
                <div>
                  <div className="flex items-center justify-between mb-1 select-none">
                    <label className="block text-[10px] font-bold text-cat-subtext uppercase tracking-wider">
                      Harga Exit / Tutup Posisi *
                    </label>
                    {livePrice !== null && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, exitPrice: livePrice }))}
                        className="text-[9px] text-cat-peach hover:text-cat-yellow font-black uppercase tracking-wider"
                      >
                        Gunakan Live
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.exitPrice}
                    onChange={e => setForm(prev => ({ ...prev, exitPrice: Number(e.target.value) }))}
                    className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none font-mono font-bold"
                  />
                </div>

                {/* ================== LIVE ANALYTICS PRO DISPLAY ================== */}
                <div className="bg-cat-base/70 p-4 rounded-2xl border border-cat-surface0 space-y-3.5">
                  <div className="text-[10px] font-black text-cat-lavender uppercase tracking-widest flex items-center justify-between border-b border-cat-surface1 pb-2">
                    <span>⚡ PRO RISK ENGINE (KALKULASI OTOMATIS)</span>
                    <span className="bg-cat-surface0 px-1.5 py-0.5 rounded text-[9px] text-cat-overlay2 border border-cat-surface1">
                      Multiplier: {selectedPairObj.alias} x{currentMultiplier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                    {/* Planned Risk */}
                    <div className="bg-cat-mantle/50 p-2.5 rounded-xl border border-cat-surface1/60 flex flex-col">
                      <span className="text-[10px] text-cat-overlay2 font-bold mb-0.5">RISIKO SETUP (1R)</span>
                      <span className="text-cat-red font-mono font-black text-xs">
                        -${cashRisk.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-cat-subtext mt-0.5 font-mono">
                        ({unitRisk.toFixed(2)} unit)
                      </span>
                    </div>

                    {/* Planned Reward */}
                    <div className="bg-cat-mantle/50 p-2.5 rounded-xl border border-cat-surface1/60 flex flex-col">
                      <span className="text-[10px] text-cat-overlay2 font-bold mb-0.5">REWARD TARGET</span>
                      <span className="text-cat-green font-mono font-black text-xs">
                        +${cashReward.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-cat-subtext mt-0.5 font-mono">
                        ({unitReward.toFixed(2)} unit)
                      </span>
                    </div>

                    {/* RR Setup Ratio */}
                    <div className="bg-cat-mantle/50 p-2.5 rounded-xl border border-cat-surface1/60 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] text-cat-overlay2 font-bold mb-0.5">RR SETUP</span>
                        <span className="font-mono text-cat-lavender font-black">
                          1 : {form.rrRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-cat-lavender/10 border border-cat-lavender/20 rounded-lg px-2 py-1 text-[9px] font-bold text-cat-lavender">
                        Setup RR
                      </div>
                    </div>

                    {/* Realized R Multiple */}
                    <div className="bg-cat-mantle/50 p-2.5 rounded-xl border border-cat-surface1/60 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] text-cat-overlay2 font-bold mb-0.5">PEROLEHAN R</span>
                        <span className={`font-mono font-black ${form.rMultiple >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                          {form.rMultiple >= 0 ? '+' : ''}{form.rMultiple.toFixed(2)} R
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-bold border ${pnlColClass(form.pnl)}`}>
                        {form.pnl >= 0 ? 'WIN' : 'LOSS'}
                      </div>
                    </div>
                  </div>

                  {/* Calculated PNL Output Display */}
                  <div className="flex items-center justify-between p-3.5 bg-cat-mantle rounded-xl border border-cat-surface1/90">
                    <span className="text-[11px] font-black text-cat-text uppercase tracking-wider">Automated Net P&L:</span>
                    <span className={`text-base font-mono font-black tracking-tight ${form.pnl >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                      {form.pnl >= 0 ? '+' : ''}${parseFloat(form.pnl.toFixed(2)).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Entry & Exit Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Entry Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Waktu Entry *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.entryDate}
                      onChange={e => handleEntryDateChange(e.target.value)}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-2.5 rounded-xl focus:border-cat-lavender focus:outline-none font-medium text-center"
                    />
                  </div>

                  {/* Exit Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                      Waktu Exit *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.exitDate}
                      onChange={e => setForm(prev => ({ ...prev, exitDate: e.target.value }))}
                      className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-2.5 rounded-xl focus:border-cat-lavender focus:outline-none font-medium text-center"
                    />
                  </div>
                                {/* Session */}
                 <div>
                   <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                     Sesi Trading
                   </label>
                   <select
                     value={form.session}
                     onChange={e => setForm(prev => ({ ...prev, session: e.target.value as TradeSession }))}
                     className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-lavender focus:outline-none transition-all cursor-pointer font-black"
                   >
                     <option value="Asian">🇲🇨 Asian Session</option>
                     <option value="London">🇬🇧 London Session</option>
                     <option value="New York">🇺🇸 New York Session</option>
                     <option value="Other">🌍 Other / Weekend</option>
                   </select>
                 </div>

                 {/* Notes */}
                 <div>
                   <label className="block text-[10px] font-bold text-cat-subtext mb-1 uppercase tracking-wider">
                     Catatan / Analisa Psikologi Emosi
                   </label>
                   <textarea
                     rows={2.5}
                     value={form.notes}
                     onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                     placeholder="Kenapa trading ini diambil? Bagaimana kondisi emosional? Hambatan psikologi? (Opsional)"
                     className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-4 py-3 rounded-xl focus:border-cat-lavender focus:outline-none placeholder:text-cat-surface2 leading-relaxed"
                   />
                 </div>
                </div>

                {/* Submition Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-cat-surface0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="border border-cat-surface1 hover:bg-cat-surface0 text-cat-subtext hover:text-cat-text font-black px-5 py-3 rounded-xl text-xs transition-all uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-cat-lavender hover:bg-cat-mau text-cat-crust font-black px-6 py-3 rounded-xl text-xs transition-all shadow-md shadow-cat-lavender/10 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Jurnal Transaksi'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
  );
}

// Helpers
function pnlColClass(pnl: number): string {
  if (pnl > 0.01) return 'bg-cat-green/10 border-cat-green/20 text-cat-green';
  if (pnl < -0.01) return 'bg-cat-red/10 border-cat-red/20 text-cat-red';
  return 'bg-cat-subtext/10 border-cat-subtext/20 text-cat-subtext';
}
