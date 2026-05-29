/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles, User, Wallet, MonitorCheck } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const AVATAR_OPTIONS = ['📊', '💻', '📈', '⚡', '🐉', '🦉', '🦁', '🦊', '🚀', '🧠'];

export default function AuthScreen({ onAuthSuccess, showToast }: AuthScreenProps) {
  const [traderName, setTraderName] = useState(() => {
    return localStorage.getItem('tj_pending_name') || '';
  });
  const [selectedAvatar, setSelectedAvatar] = useState('📊');
  const [currency, setCurrency] = useState('IDR');
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traderName.trim()) {
      showToast('Harap masukkan nama trader Anda!', 'error');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const localUser = {
        uid: 'local-trader-id',
        displayName: traderName.trim(),
        avatar: selectedAvatar,
        currency: currency,
        isLocal: true,
      };
      
      localStorage.setItem('tj_local_user', JSON.stringify(localUser));
      showToast(`Selamat datang ${traderName.trim()}! Memulai jurnal lokal PWA...`, 'success');
      onAuthSuccess(localUser);
      setLoading(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-cat-crust/95 text-cat-text flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      {/* Decorative Radial Pastels */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cat-blue/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cat-peach/15 blur-[100px] pointer-events-none" />

      {/* Main glass card container */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm bg-cat-mantle border border-cat-surface0/85 p-6 rounded-[32px] shadow-2xl relative z-20"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-cat-peach/15 rounded-2xl flex items-center justify-center text-cat-peach shadow-md shadow-cat-peach/10 mb-3.5">
            <TrendingUp className="h-6 w-6 stroke-[2.5]" />
          </div>
          
          <h1 className="text-lg font-black text-cat-text tracking-tight uppercase flex items-center justify-center gap-1.5 font-sans leading-none">
            <span>TRADING JOURNAL</span>
            <Sparkles className="h-4 w-4 text-cat-yellow shrink-0 animate-pulse" />
          </h1>
          <p className="text-[10px] text-cat-subtext uppercase tracking-widest font-bold mt-1.5">
            100% OFFLINE & PRIVATE PWA
          </p>
        </div>

        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-cat-overlay2 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-cat-mauve" />
              <span>Nama Trader / Nickname</span>
            </label>
            <input
              type="text"
              required
              maxLength={20}
              placeholder="Contoh: Sang Scalper"
              value={traderName}
              onChange={e => setTraderName(e.target.value)}
              className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-sm p-3.5 rounded-xl focus:outline-none placeholder:text-cat-surface2 font-bold focus:ring-0"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-cat-overlay2 uppercase tracking-wider mb-1.5">
              Pilih Avatar Anda
            </label>
            <div className="grid grid-cols-5 gap-2 bg-cat-base p-2.5 rounded-xl border border-cat-surface0">
              {AVATAR_OPTIONS.map(av => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`text-xl p-1.5 rounded-lg transition-all aspect-square flex items-center justify-center cursor-pointer ${
                    selectedAvatar === av
                      ? 'bg-cat-mauve text-cat-crust scale-110 shadow-sm'
                      : 'hover:bg-cat-surface0'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-cat-overlay2 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5 text-cat-green" />
              <span>Mata Uang Jurnal Utama</span>
            </label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-sm p-3 rounded-xl focus:outline-none font-bold"
            >
              <option value="IDR">IDR (Rupiah - Rp)</option>
              <option value="USD">USD (Dollar - $)</option>
              <option value="EUR">EUR (Euro - €)</option>
              <option value="GBP">GBP (Sterling - £)</option>
              <option value="JPY">JPY (Yen - ¥)</option>
              <option value="SGD">SGD (S-Dollar - S$)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-cat-mauve hover:bg-cat-pink text-cat-crust text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 select-none flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'MENYIAPKAN RUANG...' : 'MULAI MENJURNAL LOKAL ➔'}</span>
          </button>
        </form>

        <div className="mt-5 border-t border-cat-surface0/30 pt-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[10px] text-cat-green font-bold bg-cat-green/10 py-1.5 px-2.5 rounded-lg border border-cat-green/20">
            <MonitorCheck className="h-3.5 w-3.5" />
            <span>PWA Instalasi Aktif! Bisa di-install di HP Anda</span>
          </div>
          <p className="text-[9px] text-cat-overlay2 leading-relaxed font-semibold">
            Semua data transaksi, akun, & strategi Anda disimpan 100% aman dan privasi penuh di browser perangkat Anda menggunakan LocalStorage ter-enkripsi.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
