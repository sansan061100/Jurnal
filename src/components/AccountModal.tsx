import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Briefcase, TrendingUp, AlertTriangle } from 'lucide-react';
import { Account, AccountType } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: Account | null;
  onSave: (accountData: {
    name: string;
    startingBalance: number;
    currency: string;
    broker: string;
    leverage: string;
    description: string;
    type: AccountType;
    targetProfit?: number;
    maxTotalLoss?: number;
    maxDailyLoss?: number;
    minTradingDays?: number;
  }) => void;
}

export default function AccountModal({
  isOpen,
  onClose,
  editingAccount,
  onSave
}: AccountModalProps) {
  const [form, setForm] = useState<{
    name: string;
    startingBalance: number;
    currency: string;
    broker: string;
    leverage: string;
    description: string;
    type: AccountType;
    targetProfit: number;
    maxTotalLoss: number;
    maxDailyLoss: number;
    minTradingDays: number;
  }>({
    name: '',
    startingBalance: 10000,
    currency: 'USD',
    broker: '',
    leverage: '1:100',
    description: '',
    type: 'STANDARD',
    targetProfit: 1000, // 10% default
    maxTotalLoss: 1000,  // 10% max total loss default
    maxDailyLoss: 500,   // 5% max daily loss default
    minTradingDays: 5
  });

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingAccount) {
      setForm({
        name: editingAccount.name,
        startingBalance: editingAccount.startingBalance,
        currency: editingAccount.currency,
        broker: editingAccount.broker,
        leverage: editingAccount.leverage,
        description: editingAccount.description || '',
        type: editingAccount.type || 'STANDARD',
        targetProfit: editingAccount.targetProfit || Math.round(editingAccount.startingBalance * 0.1),
        maxTotalLoss: editingAccount.maxTotalLoss || Math.round(editingAccount.startingBalance * 0.1),
        maxDailyLoss: editingAccount.maxDailyLoss || Math.round(editingAccount.startingBalance * 0.05),
        minTradingDays: editingAccount.minTradingDays || 5
      });
    } else {
      setForm({
        name: '',
        startingBalance: 10000,
        currency: 'USD',
        broker: '',
        leverage: '1:100',
        description: '',
        type: 'STANDARD',
        targetProfit: 1000,
        maxTotalLoss: 1000,
        maxDailyLoss: 500,
        minTradingDays: 5
      });
    }
  }, [editingAccount, isOpen]);

  // Dynamic automatic recalculation when balance changes
  const handleBalanceChange = (bal: number) => {
    setForm(prev => ({
      ...prev,
      startingBalance: bal,
      targetProfit: Math.round(bal * 0.1),
      maxTotalLoss: Math.round(bal * 0.1),
      maxDailyLoss: Math.round(bal * 0.05)
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    if (!form.name.trim()) {
      alert('Nama akun wajib diisi!');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        startingBalance: form.startingBalance,
        currency: form.currency,
        broker: form.broker,
        leverage: form.leverage,
        description: form.description,
        type: 'STANDARD' as AccountType,
      };

      await onSave(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/85 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cat-mantle border border-cat-surface1 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl z-50 flex flex-col"
      >
        <div className="px-5 py-4 border-b border-cat-surface0 flex items-center justify-between bg-cat-base/40">
          <h3 className="text-sm font-black text-cat-text flex items-center gap-1.5 uppercase tracking-wide">
            <Briefcase className="h-4 w-4 text-cat-peach" />
            {editingAccount ? 'Ubah Informasi Akun' : 'Akun Trading Baru'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-cat-surface0 text-cat-subtext transition/all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[75vh]">
          <div className="p-5 space-y-4">
            {/* Account Name */}
            <div>
              <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                Nama Akun Jurnal *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Akun Personal USD, Cent Account USC"
                className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all placeholder:text-cat-surface2 font-bold"
              />
            </div>

            {/* Starting Balance and Currency */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                  Sistem Saldo Awal *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.startingBalance}
                  onChange={e => handleBalanceChange(Number(e.target.value))}
                  className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                  Mata Uang
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all cursor-pointer font-bold animate-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="USC">¢ US Cents (Cent Account)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Broker and Leverage */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                  Broker Partner
                </label>
                <input
                  type="text"
                  value={form.broker}
                  onChange={e => setForm(prev => ({ ...prev, broker: e.target.value }))}
                  placeholder="Exness, IC Markets"
                  className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all placeholder:text-cat-surface2 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                  Leverage Maks
                </label>
                <input
                  type="text"
                  value={form.leverage}
                  onChange={e => setForm(prev => ({ ...prev, leverage: e.target.value }))}
                  placeholder="1:100, 1:500"
                  className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all font-mono placeholder:text-cat-surface2 font-bold"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-black text-cat-subtext mb-1 uppercase tracking-wider">
                Catatan / Deskripsi Rencana
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Tulis trading plan, limit lot harian, atau rule leverage..."
                className="w-full bg-cat-base border border-cat-surface1 text-cat-text text-xs px-3.5 py-3 rounded-xl focus:border-cat-peach focus:outline-none transition-all placeholder:text-cat-surface2 leading-relaxed"
              />
            </div>
          </div>

          <div className="bg-cat-base/60 px-5 py-4 flex items-center justify-end gap-2.5 border-t border-cat-surface0">
            <button
              type="button"
              onClick={onClose}
              className="border border-cat-surface1 hover:bg-cat-surface0 text-cat-subtext hover:text-cat-text font-black px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-cat-peach hover:bg-cat-yellow text-cat-crust font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-[10px] transition-all shadow-md shadow-cat-peach/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Menyimpan...' : (editingAccount ? 'Ubah Akun' : 'Daftarkan Akun')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
