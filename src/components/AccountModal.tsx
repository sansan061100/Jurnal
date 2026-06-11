import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Briefcase, ArrowLeft } from 'lucide-react';
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
          {editingAccount ? 'Edit Account Portfolio' : 'Register New Account'}
        </h2>

        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widider bg-zinc-100 px-2.5 py-1 rounded-lg">
            {editingAccount ? 'Update Mode' : 'Account Management'}
          </h3>
        </div>
      </div>

      {/* Main Form Body / Layout Envelope */}
      <div className="flex-1 overflow-y-auto bg-[#fbfbfb] px-4 py-6 sm:px-6 md:py-10">
        <div className="max-w-2xl mx-auto w-full">
          
          {/* Mobile Header Title */}
          <div className="mb-5 block sm:hidden text-left">
            <h1 className="text-lg font-black text-zinc-900 tracking-tight uppercase">
              {editingAccount ? 'Edit Account' : 'New Trading Account'}
            </h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">Please fill details below to commit your database portfolio.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white border border-zinc-200 shadow-none p-6 sm:p-8 rounded-[24px]"
          >
            {/* Form Section Header icon & info banner info */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 mb-2">
              <Briefcase className="h-6 w-6 text-zinc-6050 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-zinc-800 tracking-wider">Trading Portfolio Configuration</span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Customize the parameters to track performance statistics. All balance updates, withdrawals, and metrics are calculated dynamically of this specific currency.
                </p>
              </div>
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                Account Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Exness USD Standard, My Trading Account"
                className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-bold text-zinc-800 transition duration-200"
              />
            </div>

            {/* Starting Balance and Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                  Starting Capital *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={form.startingBalance}
                  onChange={e => setForm(prev => ({ ...prev, startingBalance: e.target.value }))}
                  className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-mono font-black text-zinc-800 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                  Currency Base
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 cursor-pointer font-bold text-zinc-850 transition duration-200"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                  Broker Partner
                </label>
                <input
                  type="text"
                  value={form.broker}
                  onChange={e => setForm(prev => ({ ...prev, broker: e.target.value }))}
                  placeholder="e.g. Exness, IC Markets"
                  className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-bold text-zinc-800 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                  Max Leverage
                </label>
                <input
                  type="text"
                  value={form.leverage}
                  onChange={e => setForm(prev => ({ ...prev, leverage: e.target.value }))}
                  placeholder="e.g. 1:100, 1:500"
                  className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-mono font-bold text-zinc-800 transition duration-200"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[9px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">
                Notes / Trading Plan Rules
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Declare daily risk rules, maximum drawdown caps, lot limits, or general strategic notes..."
                className="w-full text-xs p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-800 font-medium text-zinc-850 leading-relaxed transition duration-200"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-150">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition duration-200 cursor-pointer border border-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-zinc-900 hover:bg-zinc-850 text-white font-black uppercase tracking-widest px-6 py-3 rounded-xl text-[10px] transition duration-200 transform active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Processing...' : (editingAccount ? 'Save Changes' : 'Register Account')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
