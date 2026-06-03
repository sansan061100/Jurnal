import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Briefcase } from 'lucide-react';
import { Account, AccountType } from '../types';
import { parseNumericString } from '../utils';

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
    startingBalance: string;
    currency: string;
    broker: string;
    leverage: string;
    description: string;
    type: AccountType;
  }>({
    name: '',
    startingBalance: '10000',
    currency: 'USD',
    broker: '',
    leverage: '1:100',
    description: '',
    type: 'STANDARD'
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
        startingBalance: String(editingAccount.startingBalance),
        currency: editingAccount.currency,
        broker: editingAccount.broker,
        leverage: editingAccount.leverage,
        description: editingAccount.description || '',
        type: editingAccount.type || 'STANDARD'
      });
    } else {
      setForm({
        name: '',
        startingBalance: '10000',
        currency: 'USD',
        broker: '',
        leverage: '1:100',
        description: '',
        type: 'STANDARD'
      });
    }
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    if (!form.name.trim()) {
      alert('Account name is required!');
      return;
    }

    const cleanBalance = parseNumericString(form.startingBalance);
    if (cleanBalance <= 0) {
      alert('Starting Capital must be a positive number!');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onSave({
        name: form.name,
        startingBalance: cleanBalance,
        currency: form.currency,
        broker: form.broker,
        leverage: form.leverage,
        description: form.description,
        type: 'STANDARD'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
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
        className="bg-cat-mantle border-2 border-cat-surface0 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl z-50 flex flex-col"
      >
        <div className="px-5 py-4 flex items-center justify-between border-b-2 border-cat-surface0">
          <h3 className="text-sm font-black text-cat-text flex items-center gap-1.5 uppercase tracking-wider">
            <Briefcase className="h-4 w-4 text-cat-peach" />
            {editingAccount ? 'Edit Account Info' : 'New Trading Account'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-cat-surface0 text-cat-subtext transition cursor-pointer border border-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[75vh]">
          <div className="p-5 space-y-4">
            {/* Account Name */}
            <div>
              <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Personal USD Account, US Cent Account"
                className="w-full text-xs p-3 font-bold"
              />
            </div>

            {/* Starting Balance and Currency */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Starting Capital *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.startingBalance}
                  onChange={e => setForm(prev => ({ ...prev, startingBalance: e.target.value }))}
                  className="w-full text-xs p-3 font-mono font-black"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full text-xs p-3 cursor-pointer font-bold animate-none"
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
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Broker Partner
                </label>
                <input
                  type="text"
                  value={form.broker}
                  onChange={e => setForm(prev => ({ ...prev, broker: e.target.value }))}
                  placeholder="e.g. Exness, IC Markets"
                  className="w-full text-xs p-3 font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                  Max Leverage
                </label>
                <input
                  type="text"
                  value={form.leverage}
                  onChange={e => setForm(prev => ({ ...prev, leverage: e.target.value }))}
                  placeholder="e.g. 1:100, 1:500"
                  className="w-full text-xs p-3 font-mono font-bold"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[9px] font-black text-cat-text mb-1 uppercase tracking-widest">
                Notes / Trading Plan
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Declare daily risk rules, target lot caps or general notes..."
                className="w-full text-xs p-3 leading-relaxed"
              />
            </div>
          </div>

          <div className="bg-cat-base/60 px-5 py-4 flex items-center justify-end gap-2.5 border-t-2 border-cat-surface0">
            <button
              type="button"
              onClick={onClose}
              className="hover:bg-cat-surface0 text-cat-subtext font-black px-4 py-2.5 rounded-xl text-xs cursor-pointer border border-transparent transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-cat-peach hover:bg-cat-yellow text-cat-base font-black uppercase tracking-widest px-5 py-2.5 rounded-xl text-[10px] border-2 border-cat-surface0 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (editingAccount ? 'Save Changes' : 'Register Account')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
