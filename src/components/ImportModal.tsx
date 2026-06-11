import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Clipboard, ArrowDownToLine, Check, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { Trade, TradingPair } from '../types';
import { detectTradingSession } from '../utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccountId: string;
  userId: string;
  onImportSuccess: (importedTrades: Trade[]) => void;
  customPairs: TradingPair[];
}

export default function ImportModal({
  isOpen,
  onClose,
  activeAccountId,
  userId,
  onImportSuccess,
  customPairs
}: ImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Trade>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  if (!isOpen) return null;

  const exampleTemplate = `Date,Symbol,Action,Lots,Entry,Exit,PnL,SL,TP,Notes
2026-05-21,EURUSD,BUY,0.1,1.12000,1.12500,50.00,1.11500,1.13500,Aligned with plan
2026-05-22,XAUUSD,SELL,0.05,2010.50,2005.00,27.50,2015.00,1995.00,Gold scalp success`;

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setParsedPreview([]);
      setErrorMsg('');
      setWarningMsg('');
      return;
    }

    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        setParsedPreview([]);
        return;
      }

      // Check format separator
      const firstLine = lines[0];
      let separator = ',';
      if (firstLine.includes('\t')) {
        separator = '\t';
      } else if (firstLine.includes(';')) {
        separator = ';';
      }

      // Detect header row
      let hasHeader = false;
      let headers = ['date', 'symbol', 'action', 'lots', 'entry', 'exit', 'pnl', 'sl', 'tp', 'notes']; // fallback Order
      const lowerFirst = firstLine.toLowerCase();
      
      if (
        lowerFirst.includes('pair') || 
        lowerFirst.includes('pnl') || 
        lowerFirst.includes('action') || 
        lowerFirst.includes('side') ||
        lowerFirst.includes('date')
      ) {
        hasHeader = true;
        headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
      }

      const startIndex = hasHeader ? 1 : 0;
      const tradesList: Partial<Trade>[] = [];
      let skippedLines = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const cells = lines[i].split(separator).map(cell => cell.trim());
        if (cells.length < 5) {
          skippedLines++;
          continue; // Skip columns that are too short
        }

        const tradeObj: any = {
          id: `trade-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          accountId: activeAccountId,
          userId: userId,
          stopLoss: undefined,
          takeProfit: undefined,
          rrRatio: undefined,
          rMultiple: undefined,
        };

        if (hasHeader) {
          headers.forEach((hdr, idx) => {
            const val = cells[idx];
            if (val === undefined || val === null) return;

            if (hdr.includes('tanggal') || hdr.includes('date') || hdr.includes('time') || hdr.includes('waktu')) {
              tradeObj.entryDate = val;
            } else if (hdr.includes('pair') || hdr.includes('simbol') || hdr.includes('symbol')) {
              tradeObj.pair = val.toUpperCase();
            } else if (hdr.includes('aksi') || hdr.includes('action') || hdr.includes('side') || hdr.includes('type')) {
              const uVal = val.toUpperCase();
              tradeObj.action = uVal.includes('SELL') || uVal.includes('SHORT') ? 'SELL' : 'BUY';
            } else if (hdr.includes('lot') || hdr.includes('size') || hdr.includes('volume') || hdr.includes('qty')) {
              tradeObj.lotSize = parseFloat(val) || 0.1;
            } else if (hdr.includes('entry') || hdr.includes('open')) {
              tradeObj.entryPrice = parseFloat(val) || 0;
            } else if (hdr.includes('exit') || hdr.includes('close')) {
              tradeObj.exitPrice = parseFloat(val) || 0;
            } else if (hdr.includes('pnl') || hdr.includes('profit') || hdr.includes('loss')) {
              const cleanPnl = val.replace(/[^0-9.-]/g, '');
              tradeObj.pnl = parseFloat(cleanPnl) || 0;
            } else if (hdr === 'sl' || hdr.includes('stoploss') || hdr.includes('stop loss') || hdr.includes('sl_price')) {
              const slVal = parseFloat(val);
              tradeObj.stopLoss = isNaN(slVal) || slVal === 0 ? undefined : slVal;
            } else if (hdr === 'tp' || hdr.includes('takeprofit') || hdr.includes('take profit') || hdr.includes('tp_price')) {
              const tpVal = parseFloat(val);
              tradeObj.takeProfit = isNaN(tpVal) || tpVal === 0 ? undefined : tpVal;
            } else if (hdr.includes('note') || hdr.includes('catatan') || hdr.includes('remark')) {
              tradeObj.notes = val;
            }
          });
        } else {
          // Fallback simple column order: Date, Pair, Action, Lots, Entry, Exit, PnL, SL, TP, Notes
          tradeObj.entryDate = cells[0];
          tradeObj.pair = cells[1]?.toUpperCase() || 'EURUSD';
          const act = cells[2]?.toUpperCase() || 'BUY';
          tradeObj.action = act.includes('SELL') || act.includes('SHORT') ? 'SELL' : 'BUY';
          tradeObj.lotSize = parseFloat(cells[3]) || 0.1;
          tradeObj.entryPrice = parseFloat(cells[4]) || 0;
          tradeObj.exitPrice = parseFloat(cells[5]) || 0;
          const cleanPnl = cells[6]?.replace(/[^0-9.-]/g, '') || '0';
          tradeObj.pnl = parseFloat(cleanPnl) || 0;

          if (cells.length === 8) {
            tradeObj.notes = cells[7] || '';
          } else if (cells.length === 9) {
            const slVal = parseFloat(cells[7]);
            tradeObj.stopLoss = isNaN(slVal) || slVal === 0 ? undefined : slVal;
            const tpVal = parseFloat(cells[8]);
            tradeObj.takeProfit = isNaN(tpVal) || tpVal === 0 ? undefined : tpVal;
            tradeObj.notes = '';
          } else if (cells.length >= 10) {
            const slVal = parseFloat(cells[7]);
            tradeObj.stopLoss = isNaN(slVal) || slVal === 0 ? undefined : slVal;
            const tpVal = parseFloat(cells[8]);
            tradeObj.takeProfit = isNaN(tpVal) || tpVal === 0 ? undefined : tpVal;
            tradeObj.notes = cells[9] || '';
          } else {
            tradeObj.notes = cells[7] || '';
          }
        }

        // Validate and complete required fields
        if (!tradeObj.entryDate) {
          tradeObj.entryDate = new Date().toISOString().substring(0, 10);
        } else {
          if (tradeObj.entryDate.includes('T')) {
            tradeObj.entryDate = tradeObj.entryDate.substring(0, 10);
          }
        }
        tradeObj.exitDate = tradeObj.entryDate;

        if (!tradeObj.pair) tradeObj.pair = 'EURUSD';
        if (!tradeObj.action) tradeObj.action = 'BUY';
        if (isNaN(tradeObj.lotSize)) tradeObj.lotSize = 0.1;
        if (isNaN(tradeObj.entryPrice)) tradeObj.entryPrice = 0;
        if (isNaN(tradeObj.exitPrice)) tradeObj.exitPrice = 0;
        if (isNaN(tradeObj.pnl)) tradeObj.pnl = 0;
        if (!tradeObj.notes) tradeObj.notes = '';

        tradeObj.session = detectTradingSession(tradeObj.entryDate);

        // Perform automatic calculations for setup RR and realized R-Multiple
        if (tradeObj.stopLoss !== undefined && tradeObj.stopLoss !== null && tradeObj.stopLoss !== 0) {
          const entryVal = tradeObj.entryPrice;
          const numSl = tradeObj.stopLoss;
          
          if (tradeObj.takeProfit !== undefined && tradeObj.takeProfit !== null && tradeObj.takeProfit !== 0) {
            const numTp = tradeObj.takeProfit;
            const risk = Math.abs(entryVal - numSl);
            const reward = Math.abs(numTp - entryVal);
            if (risk > 0) {
              tradeObj.rrRatio = parseFloat((reward / risk).toFixed(2));
            }
          }

          const selectedPairObj = customPairs.find(p => p.alias === tradeObj.pair) || { contractSize: 100000 };
          const contract = selectedPairObj.contractSize;
          const riskPerUnit = Math.abs(entryVal - numSl);
          if (riskPerUnit > 0) {
            const riskAmount = riskPerUnit * tradeObj.lotSize * contract;
            if (riskAmount > 0) {
              tradeObj.rMultiple = parseFloat((tradeObj.pnl / riskAmount).toFixed(2));
            }
          }
        }

        tradesList.push(tradeObj);
      }

      setParsedPreview(tradesList);
      setErrorMsg('');
      if (skippedLines > 0) {
        setWarningMsg(`${skippedLines} rows were skipped due to incomplete column fields.`);
      } else {
        setWarningMsg('');
      }

    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to process text format. Ensure the columns match correctly.');
    }
  };

  const handleCopyExample = () => {
    navigator.clipboard.writeText(exampleTemplate);
  };

  const handleCommitImport = () => {
    if (parsedPreview.length === 0) return;
    onImportSuccess(parsedPreview as Trade[]);
    setInputText('');
    setParsedPreview([]);
    onClose();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-50 bg-[#fafafa] flex flex-col h-screen w-screen overflow-hidden select-none"
    >
      {/* Dynamic Native Navigation Bar */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4 sm:px-6 flex items-center justify-between z-10 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 -ml-2 rounded-xl text-xs font-bold text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100 transition duration-200 cursor-pointer border border-transparent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Journal
        </button>

        <h2 className="text-xs font-black text-zinc-800 uppercase tracking-widest absolute left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
          Seamless CSV/Spreadsheet Import
        </h2>

        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-lg">
            Batch Ledger Integration
          </h3>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto bg-[#fbfbfb] px-4 py-6 sm:px-6 md:py-10">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          
          {/* Mobile Header Title */}
          <div className="block sm:hidden text-left mb-4">
            <h1 className="text-lg font-black text-zinc-900 tracking-tight uppercase">
              Spreadsheet Import
            </h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">Paste CSV or Excel raw lines below to integrate.</p>
          </div>

          <div className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-[24px] space-y-6">
            
            {/* Instruction Panel */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-left space-y-3.5">
              <div className="flex items-start gap-3">
                <ArrowDownToLine className="h-5 w-5 text-zinc-800 shrink-0 mt-0.5 animate-bounce-slow" />
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-800 tracking-wider">Spreadsheet Migration Format Guidelines</span>
                  <p className="text-xs text-zinc-500 leading-normal">
                    We support standard CSV clipboard formats. Copy columns directly from <strong className="text-zinc-900">Google Sheets, Microsoft Excel</strong>, or paste plain comma-delimited logs. Headers are automatically detected and parsed.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-widest">Recommended columns format:</span>
                  <code className="text-[10px] block font-mono font-black text-zinc-700 bg-zinc-100/80 px-2 py-1 rounded-md border border-zinc-200/50 break-all select-all">
                    Date, Symbol, Action, Lots, Entry, Exit, PnL, SL, TP, Notes
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyExample}
                  className="shrink-0 self-start sm:self-center text-[10px] font-black text-zinc-900 hover:bg-zinc-100 border border-zinc-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Clipboard className="h-3.5 w-3.5 text-zinc-600" /> COPY TEMPLATE
                </button>
              </div>
            </div>

            {/* Markdown Input Area */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black text-zinc-700 uppercase tracking-widest pl-1">
                Paste Spreadsheet Clipboard Data
              </label>
              <textarea
                rows={7}
                value={inputText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="e.g.
2026-05-21,EURUSD,BUY,0.1,1.12000,1.12500,50.00,1.11500,1.13500,Target reached
2026-05-22,XAUUSD,SELL,0.05,2010.5,2005,27.5,2015,1995,Retracement hedge"
                className="w-full bg-[#fcfcfc] border border-zinc-200 focus:border-zinc-500 text-xs px-4 py-3.5 rounded-xl focus:outline-none placeholder:text-zinc-400 leading-relaxed font-mono font-bold resize-y min-h-[140px] transition duration-150"
              />
            </div>

            {/* Error alerts */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {warningMsg && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold">
                <Info className="h-4 w-4 shrink-0" />
                <span>{warningMsg}</span>
              </div>
            )}

            {/* Parsed Output Panel */}
            {parsedPreview.length > 0 && (
              <div className="space-y-2.5 text-left">
                <span className="block text-[10px] font-black text-zinc-700 uppercase tracking-widest pl-1">
                  Integrator Preview ({parsedPreview.length} items parsed)
                </span>
                
                <div className="border border-zinc-200 rounded-xl bg-[#fafafa] divide-y divide-zinc-200/70 overflow-hidden max-h-[300px] overflow-y-auto">
                  {parsedPreview.map((trade, idx) => {
                    const pnlNum = Number(trade.pnl);
                    const isWin = pnlNum > 0.01;
                    const isLoss = pnlNum < -0.01;
                    
                    return (
                      <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-white transition duration-150">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-black px-2 py-0.5 rounded text-[8px] tracking-wide uppercase leading-none ${
                              trade.action === 'BUY' ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#fee2e2] text-[#b91c1c]'
                            }`}>
                              {trade.action}
                            </span>
                            <span className="font-extrabold text-zinc-900 tracking-tight">{trade.pair}</span>
                            <span className="text-[10px] text-zinc-400 font-bold bg-zinc-100 px-1.5 py-0.5 rounded">
                              Vol: {trade.lotSize}
                            </span>
                          </div>

                          <div className="text-[10px] text-zinc-4050 font-bold flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-zinc-500">{trade.entryDate?.substring(0, 10)}</span>
                            {trade.stopLoss !== undefined && (
                              <span className="text-red-700 bg-red-50 border border-red-100 px-1 py-0.5 rounded leading-none text-[8px]">
                                SL: {trade.stopLoss}
                              </span>
                            )}
                            {trade.takeProfit !== undefined && (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded leading-none text-[8px]">
                                TP: {trade.takeProfit}
                              </span>
                            )}
                            {trade.rrRatio !== undefined && (
                              <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded leading-none text-[8px] font-extrabold">
                                RR 1:{trade.rrRatio.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className={`font-mono font-black text-sm ${isWin ? 'text-emerald-600' : isLoss ? 'text-red-600' : 'text-zinc-800'}`}>
                            {isWin ? '+' : ''}{pnlNum.toFixed(2)}
                          </div>
                          {trade.notes && (
                            <div className="text-[9px] text-zinc-400 max-w-[150px] truncate font-medium">
                              {trade.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Form Button Row */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-150">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition duration-200 cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={parsedPreview.length === 0}
                onClick={handleCommitImport}
                className="bg-zinc-900 hover:bg-zinc-850 text-white font-black px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition duration-200 transform active:scale-98 cursor-pointer"
              >
                <Check className="h-4 w-4 shrink-0" /> Commit to Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
