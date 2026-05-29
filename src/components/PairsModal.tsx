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
      showLocalToast('Alias dan Nama Pair wajib diisi!', 'error');
      return;
    }
    const cleanAlias = newPair.alias.toUpperCase().replace(/\s+/g, '');
    
    // Check duplication (allow if we are editing the SAME pair)
    if (customPairs.some(p => p.alias === cleanAlias && p.id !== editingPairId)) {
      showLocalToast(`Pair ${cleanAlias} sudah terdaftar!`, 'error');
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
      showLocalToast(`Pair ${cleanAlias} berhasil diperbarui!`, 'success');
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
      showLocalToast(`Pair ${cleanAlias} berhasil ditambahkan!`, 'success');
      
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
      title: 'Hapus Trading Pair',
      message: `Hapus pair ${alias} dari daftar Anda secara permanen?`,
      onConfirm: () => {
        const updated = customPairs.filter(p => p.id !== id);
        onSavePairs(updated);
        showLocalToast(`Pair ${alias} berhasil dihapus.`, 'success');
      }
    });
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

      {/* Sheet Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-cat-mantle border-t border-cat-surface1 rounded-t-[30px] w-full max-w-sm p-5 pb-8 shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1 bg-cat-surface2 rounded-full mx-auto mb-5 opacity-60" />

        {/* Local Toast Alert */}
        {toast && (
          <div className={`absolute top-4 left-4 right-4 z-50 px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border shadow-lg ${
            toast.type === 'success'
              ? 'bg-cat-green/10 text-cat-green border-cat-green/20'
              : 'bg-cat-red/10 text-cat-red border-cat-red/20'
          }`}>
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-black text-cat-lavender uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5" /> Kelola Trading Pair
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cat-surface0 text-cat-subtext hover:text-cat-text transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Create/Edit Pair Form */}
          <form onSubmit={handleCreatePair} className="bg-cat-base p-4 rounded-2xl border border-cat-surface0 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-black text-cat-text uppercase tracking-widest">
                {editingPairId ? 'Edit Trading Pair' : 'Tambah Pair Baru'}
              </h4>
              {editingPairId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[8px] bg-cat-red/10 text-cat-red hover:bg-cat-red/20 border border-cat-red/20 px-2 py-0.5 rounded font-black uppercase transition cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[8px] font-black text-cat-subtext mb-1 uppercase tracking-wider">ALIAS (SIMBOL) *</label>
                <input
                  type="text"
                  placeholder="XAUUSD"
                  required
                  value={newPair.alias}
                  onChange={e => setNewPair(p => ({ ...p, alias: e.target.value }))}
                  className="w-full bg-cat-mantle border border-cat-surface1 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:border-cat-lavender focus:outline-none uppercase font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-cat-subtext mb-1 uppercase tracking-wider">NAMA LENGKAP *</label>
                <input
                  type="text"
                  placeholder="Gold Spot"
                  required
                  value={newPair.name}
                  onChange={e => setNewPair(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-cat-mantle border border-cat-surface1 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:border-cat-lavender focus:outline-none font-semibold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-1">
              <div>
                <label className="block text-[8px] font-black text-cat-subtext mb-1 uppercase tracking-wider flex items-center gap-1">
                  CONTRACT SIZE (MANUAL MULTIPLIER) *
                  <HelpCircle className="h-3 w-3 text-cat-overlay2" title="Manual contract size/lot multiplier value" />
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  placeholder="e.g. 5000 for Silver/XAG"
                  value={newPair.contractSize}
                  onChange={e => setNewPair(p => ({ ...p, contractSize: Number(e.target.value) }))}
                  className="w-full bg-cat-mantle border border-cat-surface1 text-cat-text text-xs px-3 py-2.5 rounded-lg focus:border-cat-lavender focus:outline-none font-mono font-bold"
                />
                
                {/* Presets Grid */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 100000 }))}
                    className="text-[8px] font-extrabold bg-cat-surface0 hover:bg-cat-surface1 px-2 py-1 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Forex (100k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 5000 }))}
                    className="text-[8px] font-extrabold bg-cat-surface0 hover:bg-cat-surface1 px-2 py-1 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    XAG/Silver (5k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 1000 }))}
                    className="text-[8px] font-extrabold bg-cat-surface0 hover:bg-cat-surface1 px-2 py-1 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    JPY (1k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 100 }))}
                    className="text-[8px] font-extrabold bg-cat-surface0 hover:bg-cat-surface1 px-2 py-1 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    XAU/Gold (100)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPair(p => ({ ...p, contractSize: 1 }))}
                    className="text-[8px] font-extrabold bg-cat-surface0 hover:bg-cat-surface1 px-2 py-1 rounded border border-cat-surface1 text-cat-text transition cursor-pointer"
                  >
                    Crypto/Index (1)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cat-green text-cat-crust hover:bg-cat-green/90 font-extrabold text-[10px] uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cat-green/10 cursor-pointer"
              >
                {editingPairId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingPairId ? 'SIMPAN PERUBAHAN PAIR' : 'TAMBAH PAIR BARU'}
              </button>
            </div>
          </form>

          {/* Pairs List */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black text-cat-subtext uppercase tracking-widest block">
              Daftar Pair Terdaftar ({customPairs.length})
            </h4>
            <div className="border border-cat-surface0 rounded-2xl bg-cat-base/30 divide-y divide-cat-surface0/50 overflow-hidden max-h-[220px] overflow-y-auto">
              {customPairs.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-cat-surface0/20 transition select-none">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cat-lavender bg-cat-surface0/90 px-1.5 py-0.5 rounded text-[10px] border border-cat-surface1">
                        {p.alias}
                      </span>
                      <span className="font-semibold text-cat-text text-xs truncate max-w-[155px]">{p.name}</span>
                    </div>
                    <div className="mt-1 text-[8px] font-mono font-bold text-cat-overlay1 uppercase tracking-wider">
                      Multiplier: {new Intl.NumberFormat('id-ID').format(p.contractSize)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditClick(p)}
                      className="p-1.5 rounded-lg text-cat-lavender hover:bg-cat-lavender/10 transition cursor-pointer"
                      title="Edit Pair"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePair(p.id, p.alias)}
                      className="p-1.5 rounded-lg text-cat-red hover:bg-cat-red/10 transition cursor-pointer"
                      title="Hapus Pair"
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
          className="w-full bg-cat-surface0 hover:bg-cat-surface1 text-cat-text font-extrabold text-[10px] uppercase tracking-widest py-3.5 rounded-xl mt-6 transition cursor-pointer"
        >
          Selesai & Tutup Menu
        </button>

        {confirmModal.isOpen && (
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText="Ya, Hapus"
            isDanger={true}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </motion.div>
    </div>
  );
}
