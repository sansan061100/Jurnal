import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Coins, HelpCircle, Edit3, Check, ArrowLeft } from 'lucide-react';
import { TradingPair } from '../types';
import ConfirmModal from './ConfirmModal';

interface PairsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPairs: TradingPair[];
  onSavePairs: (updated: TradingPair[]) => void;
}

export default function PairsModal({
  isOpen,
  onClose,
  customPairs,
  onSavePairs
}: PairsModalProps) {
  const [editingPairId, setEditingPairId] = useState<string | null>(null);
  const [newPair, setNewPair] = useState({
    alias: '',
    name: '',
    contractSize: 100000
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!isOpen) return null;

  const handleEditClick = (p: TradingPair) => {
    setEditingPairId(p.id);
    setNewPair({
      alias: p.alias,
      name: p.name,
      contractSize: p.contractSize
    });
  };

  const handleCancelEdit = () => {
    setEditingPairId(null);
    setNewPair({
      alias: '',
      name: '',
      contractSize: 100000
    });
  };

  const handleCreatePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPair.alias || !newPair.name) {
      showLocalToast('Symbol Alias and Asset Name are required!', 'error');
      return;
    }
    const cleanAlias = newPair.alias.toUpperCase().replace(/\s+/g, '');
    
    // Check duplication (allow if we are editing the SAME pair)
    if (customPairs.some(p => p.alias === cleanAlias && p.id !== editingPairId)) {
      showLocalToast(`Symbol ${cleanAlias} is already registered!`, 'error');
      return;
    }

    if (editingPairId) {
      // Editing Mode
      const updated = customPairs.map(p => {
        if (p.id === editingPairId) {
          return {
            ...p,
            alias: cleanAlias,
            name: newPair.name,
            contractSize: Number(newPair.contractSize)
          };
        }
        return p;
      });
      onSavePairs(updated);
      showLocalToast(`Symbol ${cleanAlias} successfully updated!`, 'success');
      handleCancelEdit();
    } else {
      // Creation Mode
      const payload: TradingPair = {
        id: `p-${Date.now()}`,
        alias: cleanAlias,
        name: newPair.name,
        contractSize: Number(newPair.contractSize)
      };

      const updated = [...customPairs, payload];
      onSavePairs(updated);
      showLocalToast(`Symbol ${cleanAlias} successfully registered!`, 'success');
      
      // Reset form
      setNewPair({
        alias: '',
        name: '',
        contractSize: 100000
      });
    }
  };

  const handleDeletePair = (id: string, alias: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Asset Symbol',
      message: `Are you sure you want to permanently remove "${alias}" from your asset symbols list?`,
      onConfirm: () => {
        const updated = customPairs.filter(p => p.id !== id);
        onSavePairs(updated);
        showLocalToast(`Symbol ${alias} deleted successfully.`, 'success');
      }
    });
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
          Asset & Instrument Ledger Configuration
        </h2>

        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-lg">
            Symbol settings
          </h3>
        </div>
      </div>

      {/* Local Toast Alert */}
      {toast && (
        <div className={`fixed top-18 right-4 z-50 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-center border shadow-lg ${
          toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-850 border-red-200'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex-1 overflow-y-auto bg-[#fbfbfb] px-4 py-6 sm:px-6 md:py-10">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          
          {/* Mobile Header Title */}
          <div className="block sm:hidden text-left mb-4">
            <h1 className="text-lg font-black text-zinc-900 tracking-tight uppercase">
              Configure Asset Symbols
            </h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">Edit contract multipliers and asset nicknames.</p>
          </div>

          <div className="bg-white border border-zinc-200 p-6 sm:p-8 rounded-[24px] space-y-6">
            
            {/* Create/Edit Pair Form */}
            <form onSubmit={handleCreatePair} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-4.5 w-4.5 text-zinc-800" />
                  <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">
                    {editingPairId ? 'Modify Trading Asset Symbol' : 'Register New Asset Symbol'}
                  </span>
                </div>
                {editingPairId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[8px] bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-2 py-1 rounded font-black uppercase transition cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">Alias (Symbol Trading Code) *</label>
                  <input
                    type="text"
                    placeholder="e.g. BTCUSD"
                    required
                    value={newPair.alias}
                    onChange={e => setNewPair(p => ({ ...p, alias: e.target.value }))}
                    className="w-full bg-white border border-zinc-200 text-zinc-850 text-xs px-3 py-3 rounded-xl focus:outline-none uppercase font-mono font-black"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest pl-1">Full Asset Nickname *</label>
                  <input
                    type="text"
                    placeholder="e.g. Bitcoin Spot"
                    required
                    value={newPair.name}
                    onChange={e => setNewPair(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white border border-zinc-200 text-zinc-850 text-xs px-3 py-3 rounded-xl focus:outline-none font-bold animate-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 pt-1">
                <div>
                  <label className="block text-[8px] font-black text-zinc-700 mb-1.5 uppercase tracking-widest flex items-center gap-1 pl-1">
                    Contract Size (Multiplier for Realized Risk) *
                    <HelpCircle className="h-3.5 w-3.5 text-zinc-400" title="Full unit size represented by 1 standard lot. (Forex usually 100000, Gold is 100)" />
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    required
                    placeholder="e.g. 100000 for standard FX"
                    value={newPair.contractSize}
                    onChange={e => setNewPair(p => ({ ...p, contractSize: Number(e.target.value) }))}
                    className="w-full bg-white border border-zinc-200 text-zinc-850 text-xs px-3 py-3 rounded-xl focus:outline-none font-mono font-black"
                  />
                  
                  {/* Presets Grid */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setNewPair(p => ({ ...p, contractSize: 100000 }))}
                      className="text-[9px] font-bold bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-7050 transition cursor-pointer"
                    >
                      Forex (100k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair(p => ({ ...p, contractSize: 5000 }))}
                      className="text-[9px] font-bold bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-7050 transition cursor-pointer"
                    >
                      Silver (5k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair(p => ({ ...p, contractSize: 1000 }))}
                      className="text-[9px] font-bold bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-7050 transition cursor-pointer"
                    >
                      JPY / Minor (1k)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair(p => ({ ...p, contractSize: 100 }))}
                      className="text-[9px] font-bold bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-7050 transition cursor-pointer"
                    >
                      Gold (100)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPair(p => ({ ...p, contractSize: 1 }))}
                      className="text-[9px] font-bold bg-white hover:bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-7050 transition cursor-pointer"
                    >
                      Crypto / Custom Indice (1)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-zinc-900 border border-transparent text-white font-black text-[10px] uppercase tracking-widest py-3.5 rounded-xl transition duration-200 transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                >
                  {editingPairId ? <Check className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                  {editingPairId ? 'Save Modifications' : 'Register Asset Symbol'}
                </button>
              </div>
            </form>

            {/* Pairs List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block pl-1">
                Registered Terminal Symbols ({customPairs.length})
              </h4>
              <div className="border border-zinc-200 rounded-2xl bg-white divide-y divide-zinc-200/70 overflow-hidden max-h-[300px] overflow-y-auto">
                {customPairs.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between text-xs hover:bg-zinc-50 transition duration-150 select-none">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[10px]">
                          {p.alias}
                        </span>
                        <span className="font-extrabold text-zinc-900 text-xs truncate max-w-[180px]">{p.name}</span>
                      </div>
                      <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider pl-1 font-medium">
                        Leverage multiplier: {new Intl.NumberFormat('en-US').format(p.contractSize)} units
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mr-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(p)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-8050 hover:bg-zinc-100 transition cursor-pointer"
                        title="Edit Symbol"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePair(p.id, p.alias)}
                        className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Symbol"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cancel Row */}
            <div className="pt-4 border-t border-zinc-150 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-zinc-200 hover:bg-zinc-100 text-zinc-650 rounded-xl text-xs font-black uppercase tracking-widest transition duration-200 transform active:scale-98 cursor-pointer"
              >
                Close Asset Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Yes, Delete"
          isDanger={true}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
        />
      )}
    </motion.div>
  );
}
