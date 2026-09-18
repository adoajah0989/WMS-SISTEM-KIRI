import React, { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { restoreCloudSnapshot } from '../../services/cloudPersistence';
import { AuthContext, type AppRole, type AuthProfile } from './AuthContext';

type AuthMode = 'login' | 'register' | 'verify';

const authErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Autentikasi gagal.';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) return 'Email atau password salah.';
  if (normalized.includes('email rate limit')) return 'Terlalu banyak email dikirim. Tunggu beberapa menit lalu coba lagi.';
  if (normalized.includes('error sending confirmation email') || normalized.includes('failed to send')) {
    return 'SMTP gagal mengirim email verifikasi. Hubungi Master untuk memeriksa konfigurasi pengirim email.';
  }
  if (normalized.includes('token has expired') || normalized.includes('otp_expired')) return 'Kode OTP sudah kedaluwarsa. Kirim ulang kode baru.';
  if (normalized.includes('invalid token') || normalized.includes('otp')) return 'Kode OTP tidak valid.';
  if (normalized.includes('database error saving new user')) return 'Database pengguna belum siap. Pastikan migration Supabase sudah berhasil dijalankan.';

  return message;
};

interface AuthGateProps {
  children: ReactNode;
  requiredRole?: AppRole;
  allowRegistration?: boolean;
  loadCloudSnapshot?: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  requiredRole,
  allowRegistration = true,
  loadCloudSnapshot = true,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const prepareSession = async (nextSession: Session | null) => {
    if (!nextSession || !supabase) {
      setSession(null);
      setProfile(null);
      setReady(true);
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, role, is_active, warehouse_ids')
      .eq('id', nextSession.user.id)
      .single();

    if (error) {
      await supabase.auth.signOut();
      setSession(null);
      setReady(true);
      throw new Error('Profil pengguna tidak dapat dibaca. Pastikan migration database sudah diterapkan.');
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      setSession(null);
      setReady(true);
      throw new Error('Email berhasil diverifikasi. Akun menunggu aktivasi dari Master.');
    }

    if (loadCloudSnapshot) await restoreCloudSnapshot();
    setProfile({
      id: nextSession.user.id,
      email: nextSession.user.email || '',
      fullName: profile.full_name || nextSession.user.email || 'Pengguna',
      role: profile.role as AppRole,
      isActive: profile.is_active,
      warehouseIds: Array.isArray(profile.warehouse_ids) && profile.warehouse_ids.length ? profile.warehouse_ids : ['wh-aceh'],
    });
    setSession(nextSession);
    setReady(true);
  };

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => prepareSession(data.session))
      .catch((error) => {
        setMessage(authErrorMessage(error));
        setReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT' || !nextSession) {
        setSession(null);
        setProfile(null);
        setReady(true);
        return;
      }

      if (event === 'SIGNED_IN') {
        window.setTimeout(() => {
          prepareSession(nextSession).catch((error) => setMessage(authErrorMessage(error)));
        }, 0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await prepareSession(data.session);
      } else if (mode === 'register') {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.session) {
          await prepareSession(data.session);
        } else if (data.user && (data.user.identities?.length || 0) === 0) {
          // Supabase deliberately obfuscates signups for an existing confirmed
          // address. No confirmation email is sent in this case.
          setEmail(normalizedEmail);
          setPassword('');
          setMode('login');
          setMessage('Email ini sudah pernah didaftarkan. Silakan masuk dengan password akun tersebut.');
        } else {
          setPendingEmail(normalizedEmail);
          setOtp('');
          setMode('verify');
          setMessage('Permintaan OTP diterima. Periksa inbox dan folder spam, lalu gunakan kode terbaru.');
        }
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingEmail,
          token: otp.trim(),
          type: 'signup',
        });
        if (error) throw error;
        await prepareSession(data.session);
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!supabase || !pendingEmail) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage('Kode OTP baru telah dikirim. Gunakan kode terbaru.');
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-100 p-6">
        <div className="max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-xl font-black text-slate-900">Supabase belum dikonfigurasi</h1>
          <p className="mt-2 text-sm text-slate-600">
            Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY pada environment deployment.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Memuat database KIRI…</div>;
  }

  if (!session) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 p-4">
        <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-6">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 font-black text-slate-950">K</div>
            <h1 className="text-2xl font-black text-slate-900">{requiredRole ? 'ADMIN KIRI WMS' : 'KIRI WMS'}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'login' && (requiredRole ? 'Masuk dengan akun Master' : 'Masuk ke sistem purchasing')}
              {mode === 'register' && 'Daftarkan akun pengguna'}
              {mode === 'verify' && `Masukkan kode yang dikirim ke ${pendingEmail}`}
            </p>
          </div>

          {mode === 'register' && (
            <label className="mb-4 block text-sm font-semibold text-slate-700">
              Nama lengkap
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
            </label>
          )}

          {mode !== 'verify' && (
            <>
              <label className="mb-4 block text-sm font-semibold text-slate-700">
                Email
                <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
              </label>
              <label className="mb-4 block text-sm font-semibold text-slate-700">
                Password
                <input required minLength={8} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
              </label>
            </>
          )}

          {mode === 'verify' && (
            <label className="mb-4 block text-sm font-semibold text-slate-700">
              Kode OTP
              <input required inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-emerald-500" />
            </label>
          )}

          {message && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{message}</p>}

          <button disabled={busy} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-60">
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : mode === 'register' ? 'Daftar' : 'Verifikasi OTP'}
          </button>

          {mode === 'verify' && (
            <button type="button" disabled={busy} onClick={resendOtp} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-60">
              Kirim ulang OTP
            </button>
          )}

          {allowRegistration && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setMessage('');
              }}
              className="mt-4 w-full text-sm font-semibold text-slate-600"
            >
              {mode === 'login' ? 'Belum punya akun? Daftar' : 'Kembali ke halaman masuk'}
            </button>
          )}
          {requiredRole && <a href="/" className="mt-4 block text-center text-sm font-semibold text-slate-500">Kembali ke aplikasi</a>}
        </form>
      </main>
    );
  }

  if (!profile || !session) return null;

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.assign(requiredRole ? '/admin' : '/');
  };

  if (requiredRole && profile.role !== requiredRole) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
          <h1 className="text-xl font-black text-slate-900">Akses admin ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">Halaman ini hanya dapat dibuka oleh akun Master.</p>
          <a href="/" className="mt-5 block rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950">Kembali ke aplikasi</a>
          <button onClick={() => void signOut()} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Keluar dan ganti akun</button>
        </div>
      </main>
    );
  }

  return <AuthContext.Provider value={{ session, profile, signOut }}>{children}</AuthContext.Provider>;
};
