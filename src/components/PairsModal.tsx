import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2, Coins, HelpCircle, Edit3, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-cat-crust/70 backdrop-blur-xs cursor-pointer"
      />

      {/* Sheet Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-cat-mantle border-2 border-cat-surface0 rounded-t-[30px] w-full max-w-sm p-5 pb-8 shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1 bg-cat-surface1 rounded-full mx-auto mb-5" />

        {/* Local Toast Alert */}
        {toast && (
          <div className={`absolute top-4 left-4 right-4 z-50 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border-2 shadow-lg ${
            toast.type === 'success'
              ? 'bg-cat-green/10 text-cat-green border-cat-green'
              : 'bg-cat-red/10 text-cat-red border-cat-red'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-5 border-b-2 border-cat-surface0 pb-3">
          <h3 className="text-xs font-black text-cat-text uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5 text-cat-lavender" /> Manage Trade Symbols
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext transition cursor-pointer border border-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Create/Edit Pair Form */}
          <form onSubmit={handleCreatePair} className="bg-cat-base p-4 rounded-2xl border-2 border-cat-surface0 space-y-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-black text-cat-text uppercase tracking-widest">
                {editingPairId ? 'Modify Asset Symbol' : 'Register Asset Symbol'}
              </h4>
              {editingPairId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[8px] bg-cat-red/10 text-cat-red hover:bg-cat-red/20 border-2 border-cat-red px-2 py-0.5 rounded font-black uppercase transition cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[8px] font-black text-cat-text mb-1 uppercase tracking-widest">Alias (Symbol) *</label>
                <input
                  type="text"
                  placeholder="e.g. BTCUSD"
                  required
                  value={newPair.alias}
                  onChange={e => setNewPair(p => ({ ...p, alias: e.target.value }))}
                  className="w-full bg-cat-mantle border-2 border-cat-surface0 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:outline-none uppercase font-mono font-black"
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-cat-text mb-1 uppercase tracking-widest">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bitcoin Spot"
                  required
                  value={newPair.name}
                  onChange={e => setNewPair(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-cat-mantle border-2 border-cat-surface0 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-1">
              <div>
                <label className="block text-[8px] font-black text-cat-text mb-1 uppercase tracking-widest flex items-center gap-1">
                  Contract Size (Lot Multiplier) *
                  <HelpCircle className="h-3 w-3 text-cat-subtext" title="Unit quantity per 1 normal contract standard lot size" />
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  placeholder="e.g. 100000 for standard FX"
                  value={newPair.contractSize}
                  onChange={e => setNewPair(p => ({ ...p, contractSize: Number(e.target.value) }))}
                  className="w-full bg-cat-mantle border-2 border-cat-surface0 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:outline-none font-mono font-black"
                />
                
                {/* Presets Grid */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 100000 }))}
                    className="text-[8px] font-black bg-cat-surface0 hover:bg-cat-surface1 px-2 py-0.5 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Forex (100k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 5000 }))}
                    className="text-[8px] font-black bg-cat-surface0 hover:bg-cat-surface1 px-2 py-0.5 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Silver (5k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 1000 }))}
                    className="text-[8px] font-black bg-cat-surface0 hover:bg-cat-surface1 px-2 py-0.5 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    JPY (1k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 100 }))}
                    className="text-[8px] font-black bg-cat-surface0 hover:bg-cat-surface1 px-2 py-0.5 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Gold (100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 1 }))}
                    className="text-[8px] font-black bg-cat-surface0 hover:bg-cat-surface1 px-2 py-0.5 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Crypto/Index (1)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cat-green text-cat-base border-2 border-cat-surface0 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {editingPairId ? <Check className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                {editingPairId ? 'Save Asset Modifications' : 'Register Asset Symbol'}
              </button>
            </div>
          </form>

          {/* Pairs List */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black text-cat-subtext uppercase tracking-widest block">
              Registered Symbols ({customPairs.length})
            </h4>
            <div className="border-2 border-cat-surface0 rounded-2xl bg-cat-base divide-y divide-cat-surface0 overflow-hidden max-h-[220px] overflow-y-auto">
              {customPairs.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-cat-surface0/30 transition select-none">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cat-lavender bg-cat-surface0 px-1.5 py-0.5 rounded text-[10px]">
                        {p.alias}
                      </span>
                      <span className="font-bold text-cat-text text-xs truncate max-w-[155px]">{p.name}</span>
                    </div>
                    <div className="mt-1 text-[8px] font-mono font-bold text-cat-subtext uppercase tracking-wider">
                      Multiplier: {new Intl.NumberFormat('en-US').format(p.contractSize)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditClick(p)}
                      className="p-1.5 rounded-lg text-cat-lavender hover:bg-cat-surface0 transition cursor-pointer"
                      title="Edit Symbol"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePair(p.id, p.alias)}
                      className="p-1.5 rounded-lg text-cat-red hover:bg-cat-red/10 transition cursor-pointer"
                      title="Delete Symbol"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-cat-surface0 hover:bg-cat-surface1 border-2 border-cat-surface0 text-cat-text font-black text-[10px] uppercase tracking-widest py-3 rounded-xl mt-6 transition shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-y-0.5 cursor-pointer"
        >
          Close Asset Settings
        </button>

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
    </div>
  );
}
