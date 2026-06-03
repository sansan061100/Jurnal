import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Clipboard, ArrowDownToLine, Check, AlertTriangle, Info } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/85 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-cat-mantle border-2 border-cat-surface0 rounded-[28px] w-full max-w-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh] select-none"
      >
        <div className="p-5 border-b-2 border-cat-surface0 flex items-center justify-between bg-cat-base/30">
          <div className="flex items-center gap-2 text-cat-peach">
            <ArrowDownToLine className="h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-cat-peach font-sans">
                Quick CSV/Excel Import
              </h2>
              <p className="text-[9px] text-cat-subtext font-bold uppercase tracking-wider mt-0.5">
                Paste logs seamlessly from Excel, CSV, or Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext transition border border-transparent cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans text-left">
          {/* Format tips Box */}
          <div className="bg-cat-base border-2 border-cat-surface0 rounded-2xl p-4 text-[11px] leading-relaxed relative shadow-xs">
            <span className="font-black text-cat-text uppercase tracking-widest text-[9px] block mb-1">
              Expected Column Order & Headers
            </span>
            <p className="text-cat-text font-bold">
              We support standard delimiters: <strong className="text-cat-lavender">Comma (,)</strong>, <strong className="text-cat-lavender">Semicolon (;)</strong> or <strong className="text-cat-lavender">Tab separates (Standard clipboard formats)</strong>.
            </p>
            <div className="mt-2 text-[8px] font-black uppercase tracking-wider text-cat-subtext">
              Recommended column layout (Headers are auto-matched):
            </div>
            <code className="block mt-1 bg-cat-mantle text-[10px] font-semibold font-mono text-cat-pink p-2 rounded-lg border border-cat-surface0 select-all leading-tight">
              Date, Symbol, Action, Lots, Entry, Exit, PnL, SL, TP, Notes
            </code>
            <div className="mt-3.5 flex items-center justify-between border-t border-cat-surface0/30 pt-2.5">
              <span className="text-[9px] text-cat-subtext font-bold">
                * Real-time risk calculations are computed after import completes.
              </span>
              <button
                type="button"
                onClick={handleCopyExample}
                className="text-[9px] font-black text-cat-peach hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Clipboard className="h-3 w-3 shrink-0" /> COPY TEMPLATE
              </button>
            </div>
          </div>
 
           <div>
             <label className="block text-[9px] font-black text-cat-text uppercase tracking-widest mb-1.5 pl-1">
               Paste Spreadsheet Logs Here (.csv / .xlsx copies)
             </label>
             <textarea
               rows={5}
               value={inputText}
               onChange={e => handleTextChange(e.target.value)}
               placeholder="e.g.&#10;2026-05-21,EURUSD,BUY,0.1,1.12000,1.12500,50.00,1.11500,1.13500,Target reached&#10;2026-05-22,XAUUSD,SELL,0.05,2010.5,2005,27.5,2015,1995,Retracement scale"
               className="w-full bg-cat-base border-2 border-cat-surface0 text-cat-text text-xs p-4 rounded-xl focus:outline-none placeholder:text-cat-surface2/55 leading-relaxed font-mono font-black resize-y max-h-[220px]"
             />
           </div>
 
           {/* Feedback section */}
           {errorMsg && (
             <div className="bg-cat-red/10 border-2 border-cat-red text-cat-red p-3 rounded-xl flex items-center gap-2 text-xs font-black">
               <AlertTriangle className="h-4 w-4 shrink-0" />
               <span>{errorMsg}</span>
             </div>
           )}
 
           {warningMsg && (
             <div className="bg-cat-yellow/10 border-2 border-cat-yellow text-cat-yellow p-3 rounded-xl flex items-center gap-2 text-xs font-black">
               <Info className="h-4 w-4 shrink-0" />
               <span>{warningMsg}</span>
             </div>
           )}
 
           {/* Preview list */}
           {parsedPreview.length > 0 && (
             <div className="space-y-2">
               <span className="block text-[10px] font-black text-cat-text uppercase tracking-widest pl-1">
                 Parsed Import Preview ({parsedPreview.length} Trades Found)
               </span>
               <div className="max-h-[160px] overflow-y-auto border-2 border-cat-surface0 rounded-2xl bg-cat-base divide-y divide-cat-surface0 font-mono text-[10px]">
                 {parsedPreview.map((trade, idx) => {
                   const pnlNum = Number(trade.pnl);
                   const isWin = pnlNum > 0.01;
                   const isLoss = pnlNum < -0.01;
                   
                   return (
                     <div key={idx} className="p-3 flex items-center justify-between text-cat-text hover:bg-cat-surface0/30">
                       <div className="space-y-0.5">
                         <div className="flex items-center gap-1.5">
                           <span className={`font-black px-1 rounded-sm leading-none text-[8px] ${
                             trade.action === 'BUY' ? 'bg-cat-green/15 text-cat-green' : 'bg-cat-red/15 text-cat-red'
                           }`}>
                             {trade.action}
                           </span>
                           <span className="font-bold text-cat-text">{trade.pair}</span>
                           <span className="text-[9px] text-cat-subtext font-bold">Vol: {trade.lotSize}</span>
                         </div>
                         <div className="text-[9px] text-cat-subtext font-bold flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                           <span>{trade.entryDate?.substring(0, 10)}</span>
                           {trade.stopLoss !== undefined && (
                             <span className="text-cat-maroon font-semibold bg-cat-maroon/10 px-1 rounded-sm leading-none text-[8px]">SL: {trade.stopLoss}</span>
                           )}
                           {trade.takeProfit !== undefined && (
                             <span className="text-cat-green font-semibold bg-cat-green/10 px-1 rounded-sm leading-none text-[8px]">TP: {trade.takeProfit}</span>
                           )}
                           {trade.rrRatio !== undefined && (
                             <span className="text-cat-lavender bg-cat-lavender/10 px-1 rounded-sm leading-none text-[8px] font-black">
                               RR 1:{trade.rrRatio.toFixed(2)}
                             </span>
                           )}
                         </div>
                       </div>
                      <div className="text-right">
                        <div className={`font-black ${isWin ? 'text-cat-green' : isLoss ? 'text-cat-red' : 'text-cat-text'}`}>
                          {isWin ? '+' : ''}{pnlNum.toFixed(2)}
                        </div>
                        {trade.notes && <div className="text-[8px] text-cat-subtext max-w-[120px] truncate">{trade.notes}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t-2 border-cat-surface0 flex items-center justify-between bg-cat-base/30">
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-cat-surface0 text-cat-subtext font-black px-5 py-3 rounded-xl text-xs transition uppercase tracking-wider font-sans cursor-pointer border border-transparent transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedPreview.length === 0}
            onClick={handleCommitImport}
            className="bg-cat-peach hover:bg-cat-yellow text-cat-base border-2 border-cat-surface0 font-black px-6 py-3 rounded-xl text-xs transition shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 font-sans cursor-pointer transition-all"
          >
            <Check className="h-4 w-4 shrink-0" /> Import To Portfolio
          </button>
        </div>
      </motion.div>
    </div>
  );
}
