/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { KeyRound, Sparkles, TrendingUp } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function AuthScreen({ onAuthSuccess, showToast }: AuthScreenProps) {
  const [isEmailMode, setIsEmailMode] = React.useState(false);
  const [isRegister, setIsRegister] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast(`Selamat datang kembali, ${result.user.displayName || 'Trader'}!`, 'success');
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('popup-blocked')) {
        showToast('Popup login diblokir! Perbolehkan popup di browser Anda.', 'error');
      } else {
        showToast('Gagal menghubungkan ke akun Google.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Harap isi semua kolom email dan password!', 'error');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        showToast('Pendaftaran berhasil! Akun Anda telah aktif.', 'success');
        onAuthSuccess(result.user);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        showToast('Login berhasil! Memuat dasbor jurnal...', 'success');
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Terjadi kesalahan autentikasi.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Email sudah terdaftar! Silakan login.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = 'Email atau password salah!';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid!';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password minimal terdiri dari 6 karakter!';
      } else if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Login Email/Sandi belum diaktifkan di konsol Firebase. Gunakan Google Sign-In!';
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
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
            PRO-GRADE PERFORMANCE MONITORING
          </p>
        </div>

        {/* Dynamic Auth Forms */}
        {isEmailMode ? (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div>
              <label className="block text-[9px] font-black text-cat-overlay2 uppercase tracking-wider mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                required
                placeholder="Ex: trader@smc.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-xs p-3.5 rounded-xl focus:outline-none placeholder:text-cat-surface2 font-medium"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-cat-overlay2 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Password minimal 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-cat-base border border-cat-surface0 focus:border-cat-peach text-cat-text text-xs p-3.5 rounded-xl focus:outline-none placeholder:text-cat-surface2 font-mono font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cat-peach hover:bg-cat-yellow text-cat-crust text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 select-none animate-none"
            >
              {loading ? 'Processing...' : (isRegister ? 'BUAT AKUN BARU' : 'MASUK KE DASBOR')}
            </button>

            <div className="flex justify-between items-center text-[10px] text-cat-subtext font-bold pt-1.5">
              <button
                type="button"
                onClick={() => setIsRegister(prev => !prev)}
                className="hover:text-cat-text transition focus:outline-none cursor-pointer"
              >
                {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
              </button>
              <button
                type="button"
                onClick={() => setIsEmailMode(false)}
                className="text-cat-lavender hover:text-cat-pink transition focus:outline-none cursor-pointer"
              >
                Kembali
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-cat-base hover:bg-cat-surface0 text-cat-text border border-cat-surface0 hover:border-cat-surface1 text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 select-none"
            >
              <span className="text-sm shrink-0">🔑</span>
              <span>{loading ? 'Menghubungkan...' : 'Login dengan Google'}</span>
            </button>

            <button
              onClick={() => {
                setIsEmailMode(true);
                setIsRegister(false);
              }}
              className="w-full py-3 bg-cat-mantle text-cat-subtext hover:text-cat-text text-[10px] font-bold uppercase tracking-widest rounded-xl border border-cat-surface0/30 hover:border-cat-surface0 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Atau gunakan Email & Sandi
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-cat-surface0/20"></div>
              <span className="flex-shrink mx-3 text-[9px] text-cat-overlay0 font-bold uppercase tracking-widest">Atau Tanpa Config</span>
              <div className="flex-grow border-t border-cat-surface0/20"></div>
            </div>

            <button
              onClick={() => {
                showToast('Masuk dengan Mode Offline (LocalStorage)!', 'success');
                onAuthSuccess({
                  uid: 'local-trader-id',
                  displayName: 'Local Trader',
                  email: 'local@trader.io',
                  isLocal: true,
                });
              }}
              className="w-full py-3 bg-cat-mauve hover:bg-cat-pink text-cat-crust text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer select-none"
            >
              <span className="text-sm shrink-0">💾</span>
              <span>Gunakan Mode Offline (Lokal)</span>
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-cat-surface0/30 pt-4 text-center">
          <p className="text-[9px] text-cat-overlay2 leading-relaxed font-semibold">
            Pilih <span className="text-cat-mauve">Mode Offline</span> untuk menyimpan data instan langsung di browser HP/Laptop Anda tanpa perlu konfigurasi Firebase. Praktis, cepat, dan 100% aman mandiri!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
