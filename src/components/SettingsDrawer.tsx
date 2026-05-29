import React from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  X,
  Plus,
  Trash2,
  LogOut,
  Briefcase,
  Sliders,
  Award,
  FileText,
  Coins
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
  onLogout: () => void;
  onOpenPairsModal: () => void;
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
  onLogout,
  onOpenPairsModal
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
    doc.text('LAPORAN PERFORMA TRADING', 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 115, 140);
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Unduh pada: ${dateStr}`, 14, 32);
    
    // Horizontal divider
    doc.setDrawColor(220, 224, 232);
    doc.setLineWidth(0.5);
    doc.line(14, 36, 196, 36);
    
    // Section 1: Profil Akun
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 46);
    doc.text('I. PROFIL AKUN PORTFOLIO', 14, 46);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Nama Akun:', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.name), 46, 54);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Tipe Akun:', 14, 60);
    doc.setFont('helvetica', 'normal');
    const accType = 'Standard Portfolio';
    doc.text(accType, 46, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Broker Partner:', 14, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.broker || '-'), 46, 66);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Leverage Maks:', 14, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(String(activeAccount.leverage || '-'), 46, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Saldo Mulai:', 14, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentCurrency} ${activeAccount.startingBalance.toLocaleString('id-ID')}`, 46, 78);
    
    // Section 2: Ringkasan Performa Utama (Stats Grid)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('II. PERFORMA & STATISTIK JURNAL', 14, 92);
    
    doc.setFontSize(10);
    // Draw table headers for stats
    doc.setFillColor(242, 243, 245);
    doc.rect(14, 98, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Parameter Performa', 16, 103);
    doc.text('Nilai Rekaman', 120, 103);
    
    // Draw row items
    const rows = [
      { name: 'Total Transaksi (Trades)', value: `${stats.totalTrades} trades` },
      { name: 'Win / Loss / BE', value: `${stats.wonTrades} Win / ${stats.lostTrades} Loss / ${stats.breakevenTrades} BE` },
      { name: 'Tingkat Kemenangan (Win Rate)', value: `${stats.winRate.toFixed(1)}%` },
      { name: 'Laba Bersih Berjalan (Net Profit)', value: `${currentCurrency} ${stats.netProfit.toLocaleString('id-ID')}` },
      { name: 'Saldo Saat Ini (Current Balance)', value: `${currentCurrency} ${stats.currentBalance.toLocaleString('id-ID')}` },
      { name: 'Profit Factor', value: stats.profitFactor === Infinity ? 'N/A' : (stats.profitFactor || 0).toFixed(2) },
      { name: 'Rata-Rata Keuntungan (Avg Win)', value: `${currentCurrency} ${Math.round(stats.avgWin || 0).toLocaleString('id-ID')}` },
      { name: 'Rata-Rata Kerugian (Avg Loss)', value: `${currentCurrency} ${Math.round(stats.avgLoss || 0).toLocaleString('id-ID')}` },
      { name: 'Laba Terbaik (Best Trade)', value: `${currentCurrency} ${Math.round(stats.bestTrade || 0).toLocaleString('id-ID')}` },
      { name: 'Rugi Terburuk (Worst Trade)', value: `${currentCurrency} ${Math.round(stats.worstTrade || 0).toLocaleString('id-ID')}` },
      { name: 'Maksimum Drawdown Berjalan', value: `${(stats.maxDrawdown || 0).toFixed(2)}% (${currentCurrency} ${Math.round(stats.maxDrawdownVal || 0).toLocaleString('id-ID')})` }
    ];
    
    let currentY = 110;
    doc.setFont('helvetica', 'normal');
    rows.forEach((row, idx) => {
      // Background shading on alternate rows
      if (idx % 2 === 1) {
        doc.setFillColor(247, 248, 250);
        doc.rect(14, currentY - 4, 182, 6, 'F');
      }
      doc.text(row.name, 16, currentY);
      doc.setFont('helvetica', 'bold');
      
      // Color coding net profit
      if (row.name.includes('Net Profit')) {
        if (stats.netProfit >= 0) {
          doc.setTextColor(46, 125, 50); // green
        } else {
          doc.setTextColor(198, 40, 40); // red
        }
      } else {
        doc.setTextColor(30, 30, 46);
      }
      doc.text(row.value, 120, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 46);
      
      // Separator dot/line
      doc.setDrawColor(240, 240, 240);
      doc.line(14, currentY + 2, 196, currentY + 2);
      
      currentY += 6.5;
    });
    
    // Alternate row shading or other report headers can be added here if needed
    
    // Add trades detail table on second page
    if (activeAccountTrades && activeAccountTrades.length > 0) {
      doc.addPage();
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 46);
      doc.text('IV. DAFTAR RIWAYAT TRANSAKSI TERAKHIR', 14, 25);
      
      doc.setFontSize(8);
      doc.setFillColor(242, 243, 245);
      doc.rect(14, 30, 182, 8, 'F');
      doc.text('Tanggal', 16, 35);
      doc.text('Pair', 50, 35);
      doc.text('Aksi', 75, 35);
      doc.text('Lot', 95, 35);
      doc.text('Entry / Exit Price', 115, 35);
      doc.text('Profit-Loss', 165, 35);
      
      let finalY = 43;
      doc.setFont('helvetica', 'normal');
      
      // Sort trades descending
      const sortedTradesForReport = [...activeAccountTrades].sort((a,b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).slice(0, 25); // Top 25 for aesthetic sizing
      
      sortedTradesForReport.forEach((t, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(247, 248, 250);
          doc.rect(14, finalY - 4, 182, 6, 'F');
        }
        
        const dateFormatted = new Date(t.entryDate).toLocaleDateString('id-ID', {
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
        doc.text(`${t.entryPrice.toLocaleString('id-ID')} -> ${t.exitPrice.toLocaleString('id-ID')}`, 115, finalY);
        
        doc.setFont('helvetica', 'bold');
        if (t.pnl >= 0) {
          doc.setTextColor(46, 125, 50);
          doc.text(`+${currentCurrency} ${Math.round(t.pnl).toLocaleString('id-ID')}`, 165, finalY);
        } else {
          doc.setTextColor(198, 40, 40);
          doc.text(`-${currentCurrency} ${Math.abs(Math.round(t.pnl)).toLocaleString('id-ID')}`, 165, finalY);
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 46);
        
        doc.setDrawColor(245, 245, 245);
        doc.line(14, finalY + 2, 196, finalY + 2);
        
        finalY += 6.5;
        
        // Prevent overflow
        if (finalY > 280 && idx < sortedTradesForReport.length - 1) {
          doc.addPage();
          finalY = 25;
          doc.setFont('helvetica', 'bold');
          doc.text('IV. DAFTAR RIWAYAT TRANSAKSI TERAKHIR (LANJUTAN)', 14, 15);
          doc.setFontSize(8);
          doc.setFillColor(242, 243, 245);
          doc.rect(14, 18, 182, 8, 'F');
          doc.text('Tanggal', 16, 23);
          doc.text('Pair', 50, 23);
          doc.text('Aksi', 75, 23);
          doc.text('Lot', 95, 23);
          doc.text('Entry / Exit Price', 115, 23);
          doc.text('Profit-Loss', 165, 23);
          finalY = 31;
          doc.setFont('helvetica', 'normal');
        }
      });
    }
    
    // Bottom Signature footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 155, 175);
    const totalPages = doc.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Aplikasi Jurnal Trading Pro • Evaluasi Cloud • Halaman ${i} dari ${totalPages}`, 14, 290);
    }
    
    // Save report
    const sanitizedFilename = `Laporan_Trading_${activeAccount.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(sanitizedFilename);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/70 backdrop-blur-xs cursor-pointer"
      />

      {/* Sheet Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-cat-mantle border-t border-cat-surface1 rounded-t-[30px] w-full max-w-sm p-5 pb-8 shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1 bg-cat-surface2 rounded-full mx-auto mb-5 opacity-60" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-cat-lavender uppercase tracking-widest flex items-center gap-2">
            💼 Portofolio & Jurnal
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext hover:text-cat-text transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account Selector Section */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-cat-subtext uppercase tracking-widest">
              Ganti Akun Transaksi
            </span>
            <button
              onClick={() => {
                onClose();
                onOpenAccountModal(null);
              }}
              className="text-[10px] font-black text-cat-peach hover:underline transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> TAMBAH BARU
            </button>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  activeAccountId === acc.id
                    ? 'bg-cat-lavender/10 border-cat-lavender text-cat-lavender font-bold shadow-sm'
                    : 'bg-cat-base border-cat-surface0 hover:border-cat-surface1 text-cat-text'
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
                    <h4 className="text-xs font-black truncate max-w-[140px] uppercase tracking-wide">
                      {acc.name}
                    </h4>
                    <p className="text-[9px] text-cat-subtext font-mono">
                      {acc.broker || 'Default'} • {acc.currency}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 ml-2 border-l border-cat-surface1 pl-2.5">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAccountModal(acc);
                    }}
                    title="Ubah info akun"
                    className="p-1 hover:bg-cat-surface0 rounded-lg text-[10px] cursor-pointer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      onDeleteAccount(acc.id);
                    }}
                    title="Hapus akun"
                    className="p-1 hover:bg-cat-red/10 rounded-lg text-cat-red cursor-pointer"
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
          <div className="bg-cat-base border border-cat-surface0 rounded-2xl p-4 mb-6 space-y-2.5">
            <span className="text-[9px] font-black text-cat-subtext uppercase tracking-widest block mb-1">
              Data Akun Terpilih
            </span>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="space-y-0.5">
                <span className="text-cat-subtext block uppercase font-bold text-[8px]">Broker:</span>
                <span className="text-cat-text font-black">{activeAccount.broker || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-cat-subtext block uppercase font-bold text-[8px]">Mata Uang:</span>
                <span className="text-cat-text font-black font-mono">{activeAccount.currency || '-'}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                <span className="text-cat-subtext block uppercase font-bold text-[8px]">Tipe Portofolio:</span>
                <span className="text-cat-mauve font-black block">{activeAccount.type || 'STANDARD'}</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                <span className="text-cat-subtext block uppercase font-bold text-[8px]">Leverage:</span>
                <span className="text-cat-text font-black font-mono">{activeAccount.leverage || '-'}</span>
              </div>
              {activeAccount.description && (
                <div className="space-y-0.5 col-span-2 border-t border-cat-surface0 pt-2.5 mt-1.5">
                  <span className="text-cat-subtext block uppercase font-bold text-[8px]">Catatan / Trading Plan:</span>
                  <p className="text-cat-text italic text-[10px] leading-relaxed font-semibold">
                    "{activeAccount.description}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro Operations Panel */}
        <div className="border-t border-cat-surface1 pt-4 space-y-3.5 text-left font-sans">
          <span className="text-[9px] font-black text-cat-subtext uppercase tracking-widest block">
            Pengaturan Jurnal & Trading Pair
          </span>

          <button
            onClick={() => {
              onClose();
              onOpenPairsModal();
            }}
            className="w-full bg-cat-lavender/10 hover:bg-cat-lavender/25 border border-cat-lavender/30 text-cat-lavender text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-[9px] select-none shadow-sm"
          >
            <Coins className="h-3.5 w-3.5" /> Kelola Daftar Trading Pair
          </button>

          {activeAccount && stats && (
            <button
              onClick={handleExportPDF}
              className="w-full bg-cat-peach hover:bg-cat-yellow text-cat-crust text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-[9px] shadow-md shadow-cat-peach/10 select-none"
            >
              <FileText className="h-3.5 w-3.5" /> Ekspor Ringkasan Jurnal (PDF)
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full bg-cat-surface0 hover:bg-cat-surface1 text-cat-text text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[10px]"
            >
              <LogOut className="h-4 w-4 text-cat-red" /> Log Out
            </button>

            <button
              onClick={() => {
                onClose();
                onClearAllData();
              }}
              className="w-full bg-cat-red/15 hover:bg-cat-red/25 border border-cat-red/20 text-cat-red text-xs font-black py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-[10px]"
            >
              <Trash2 className="h-4 w-4" /> Reset Jurnal
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
