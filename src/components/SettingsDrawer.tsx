import React from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  X,
  Plus,
  Trash2,
  FileText,
  Coins,
  ArrowDownToLine
} from 'lucide-react';
import { Account, Trade } from '../types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  activeAccount: Account | null;
  activeAccountTrades?: Trade[];
  stats?: any;
  onOpenAccountModal: (account: Account | null) => void;
  onDeleteAccount: (id: string) => void;
  onClearAllData: () => void;
  onOpenPairsModal: () => void;
  onOpenImportModal: () => void;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  setActiveAccountId,
  activeAccount,
  activeAccountTrades = [],
  stats,
  onOpenAccountModal,
  onDeleteAccount,
  onClearAllData,
  onOpenPairsModal,
  onOpenImportModal
}: SettingsDrawerProps) {
  if (!isOpen) return null;

  const handleExportPDF = () => {
    if (!activeAccount || !stats) return;

    const doc = new jsPDF();
    const currentCurrency = activeAccount.currency || 'USD';
    
    // Page Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 46);
    doc.text('TRADING JOURNAL PERFORMANCE REPORT', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 115, 140);
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${dateStr}`, 14, 32);
    
    // Horizontal divider
    doc.setDrawColor(220, 224, 232);
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);
    
    // Section 1: Account Profile
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 46);
    doc.text('I. PORTFOLIO PROFILE & SETTINGS', 14, 46);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Account Name:', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.name), 46, 54);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Account Type:', 14, 60);
    doc.setFont('helvetica', 'normal');
    const accType = 'Standard Portfolio';
    doc.text(accType, 46, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Broker Partner:', 14, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.broker || '-'), 46, 66);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Max Leverage:', 14, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.leverage || '-'), 46, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Starting Balance:', 14, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentCurrency} ${activeAccount.startingBalance.toLocaleString('en-US')}`, 46, 78);
    
    // Section 2: Performance Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('II. METRICS & PERFORMANCE STATS', 14, 92);
    
    doc.setFontSize(10);
    // Draw table headers for stats
    doc.setFillColor(242, 243, 245);
    doc.rect(14, 98, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Parameter', 16, 103);
    doc.text('Recorded Value', 120, 103);
    
    // Draw row items
    const rows = [
      { name: 'Total Trade Count', value: `${stats.totalTrades} operations` },
      { name: 'Wins / Losses / Breakeven', value: `${stats.wonTrades} Wins / ${stats.lostTrades} Losses / ${stats.breakevenTrades} BE` },
      { name: 'Win Rate Percentage', value: `${stats.winRate.toFixed(1)}%` },
      { name: 'Net Consolidated Profit', value: `${currentCurrency} ${stats.netProfit.toLocaleString('en-US')}` },
      { name: 'Current Liquid Balance', value: `${currentCurrency} ${stats.currentBalance.toLocaleString('en-US')}` },
      { name: 'Profit Factor Index', value: stats.profitFactor === Infinity ? 'N/A' : (stats.profitFactor || 0).toFixed(2) },
      { name: 'Average Profit per Win', value: `${currentCurrency} ${Math.round(stats.avgWin || 0).toLocaleString('en-US')}` },
      { name: 'Average Loss per Defeat', value: `${currentCurrency} ${Math.round(stats.avgLoss || 0).toLocaleString('en-US')}` },
      { name: 'Best Trade (Profit Peak)', value: `${currentCurrency} ${Math.round(stats.bestTrade || 0).toLocaleString('en-US')}` },
      { name: 'Worst Trade (Loss Bottom)', value: `${currentCurrency} ${Math.round(stats.worstTrade || 0).toLocaleString('en-US')}` },
      { name: 'Maximum System Drawdown', value: `${(stats.maxDrawdown || 0).toFixed(2)}% (${currentCurrency} ${Math.round(stats.maxDrawdownVal || 0).toLocaleString('en-US')})` }
    ];
    
    let currentY = 110;
    doc.setFont('helvetica', 'normal');
    rows.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(247, 248, 250);
        doc.rect(14, currentY - 4, 182, 6, 'F');
      }
      doc.text(row.name, 16, currentY);
      doc.setFont('helvetica', 'bold');
      
      if (row.name.includes('Net Profit')) {
        if (stats.netProfit >= 0) {
          doc.setTextColor(46, 125, 50);
        } else {
          doc.setTextColor(198, 40, 40);
        }
      } else {
        doc.setTextColor(30, 30, 46);
      }
      doc.text(row.value, 120, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 46);
      
      doc.setDrawColor(240, 240, 240);
      doc.line(14, currentY + 2, 196, currentY + 2);
      
      currentY += 6.5;
    });
    
    // Add trades detail table on second page
    if (activeAccountTrades && activeAccountTrades.length > 0) {
      doc.addPage();
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 46);
      doc.text('III. RECENT TRANSACTION CHRONICLE', 14, 25);
      
      doc.setFontSize(8);
      doc.setFillColor(242, 243, 245);
      doc.rect(14, 30, 182, 8, 'F');
      doc.text('Date', 16, 35);
      doc.text('Symbol', 50, 35);
      doc.text('Action', 75, 35);
      doc.text('Lots', 95, 35);
      doc.text('Entry / Exit', 115, 35);
      doc.text('P&L Out', 165, 35);
      
      let finalY = 43;
      doc.setFont('helvetica', 'normal');
      
      const sortedTradesForReport = [...activeAccountTrades].sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).slice(0, 25);
      
      sortedTradesForReport.forEach((t, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(247, 248, 250);
          doc.rect(14, finalY - 4, 182, 6, 'F');
        }
        
        const dateFormatted = new Date(t.entryDate).toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
        
        doc.text(dateFormatted, 16, finalY);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pair, 50, finalY);
        doc.setFont('helvetica', 'normal');
        
        if (t.action === 'BUY') {
          doc.setTextColor(46, 125, 50);
        } else {
          doc.setTextColor(198, 40, 40);
        }
        doc.text(t.action, 75, finalY);
        doc.setTextColor(30, 30, 46);
        
        doc.text(String(t.lotSize), 95, finalY);
        doc.text(`${t.entryPrice.toLocaleString('en-US')} -> ${t.exitPrice.toLocaleString('en-US')}`, 115, finalY);
        
        doc.setFont('helvetica', 'bold');
        if (t.pnl >= 0) {
          doc.setTextColor(46, 125, 50);
          doc.text(`+${currentCurrency} ${Math.round(t.pnl).toLocaleString('en-US')}`, 165, finalY);
        } else {
          doc.setTextColor(198, 40, 40);
          doc.text(`-${currentCurrency} ${Math.abs(Math.round(t.pnl)).toLocaleString('en-US')}`, 165, finalY);
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 46);
        
        doc.setDrawColor(245, 245, 245);
        doc.line(14, finalY + 2, 196, finalY + 2);
        
        finalY += 6.5;
        
        if (finalY > 280 && idx < sortedTradesForReport.length - 1) {
          doc.addPage();
          finalY = 25;
          doc.setFont('helvetica', 'bold');
          doc.text('III. RECENT TRANSACTION CHRONICLE (CONT.)', 14, 15);
          doc.setFontSize(8);
          doc.setFillColor(242, 243, 245);
          doc.rect(14, 18, 182, 8, 'F');
          doc.text('Date', 16, 23);
          doc.text('Symbol', 50, 23);
          doc.text('Action', 75, 23);
          doc.text('Lots', 95, 23);
          doc.text('Entry / Exit', 115, 23);
          doc.text('P&L Out', 165, 23);
          finalY = 31;
          doc.setFont('helvetica', 'normal');
        }
      });
    }
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 155, 175);
    const totalPages = doc.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Pro Trading Evaluation Journal • Page ${i} of ${totalPages}`, 14, 290);
    }
    
    const sanitizedFilename = `Trading_Report_${activeAccount.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(sanitizedFilename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/80 backdrop-blur-xs cursor-pointer"
      />

      {/* Sheet Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white border border-zinc-100 rounded-t-3xl w-full max-w-sm p-6 pb-8 shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1 bg-zinc-150 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            💼 Portfolios & Logs
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account Selector Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
              Switch Active Portfolio
            </span>
            <button
              onClick={() => {
                onClose();
                onOpenAccountModal(null);
              }}
              className="text-[9px] font-bold text-zinc-950 hover:underline transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" /> ADD NEW
            </button>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  activeAccountId === acc.id
                    ? 'bg-zinc-100/80 text-zinc-950 font-bold shadow-xs'
                    : 'bg-zinc-50/50 hover:bg-zinc-100/50 text-zinc-500'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveAccountId(acc.id);
                    onClose();
                  }}
                  className="flex-1 text-left flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="text-sm shrink-0">💼</span>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold truncate max-w-[140px] uppercase tracking-wide">
                      {acc.name}
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-mono font-bold">
                      {acc.broker || 'Default'} • {acc.currency}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 ml-2 border-l border-zinc-200 pl-2.5">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAccountModal(acc);
                    }}
                    title="Edit account settings"
                    className="p-1 hover:bg-zinc-200/55 rounded-lg text-[10px] cursor-pointer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      onDeleteAccount(acc.id);
                    }}
                    title="Delete account"
                    className="p-1 hover:bg-red-50 rounded-lg text-red-500 cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Account Info */}
        {activeAccount && (
          <div className="bg-zinc-50/60 rounded-xl p-4 mb-6 space-y-2.5">
            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
              Active Configuration
            </span>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="space-y-0.5">
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Broker:</span>
                <span className="text-zinc-800 font-bold">{activeAccount.broker || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Currency:</span>
                <span className="text-zinc-800 font-bold font-mono">{activeAccount.currency || '-'}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Type:</span>
                <span className="text-zinc-800 font-bold block">{activeAccount.type || 'STANDARD'}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                <span className="text-zinc-400 block uppercase font-bold text-[8px]">Max Leverage:</span>
                <span className="text-zinc-800 font-bold font-mono">{activeAccount.leverage || '-'}</span>
              </div>
              {activeAccount.description && (
                <div className="space-y-0.5 col-span-2 pt-2.5 mt-1.5 border-t border-zinc-200/60">
                  <span className="text-zinc-400 block uppercase font-bold text-[8px]">Session Rules / Plan:</span>
                  <p className="text-zinc-600 italic text-[10px] leading-relaxed font-medium">
                    "{activeAccount.description}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro Operations Panel */}
        <div className="pt-4 space-y-2.5 font-sans">
          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">
            Journal & Assets Actions
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenPairsModal();
            }}
            className="w-full bg-zinc-950 text-white text-[10px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[9px] select-none"
          >
            Manage Trading Symbols
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenImportModal();
            }}
            className="w-full bg-zinc-950 text-white text-[10px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[9px] select-none"
          >
            Import Trade Journal (Excel/CSV)
          </button>

          {activeAccount && stats && (
            <button
              onClick={handleExportPDF}
              className="w-full bg-zinc-950 text-white text-[10px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[9px] select-none"
            >
              Export Report Summary (PDF)
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onClearAllData();
            }}
            className="w-full bg-red-600 text-white text-[10px] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[9px] select-none"
          >
            Wipe Portfolio Database
          </button>
        </div>
      </motion.div>
    </div>
  );
}
