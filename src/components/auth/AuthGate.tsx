import React, { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { restoreCloudSnapshot } from '../../services/cloudPersistence';

export const AuthGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const prepareSession = async (nextSession: Session | null) => {
    if (!nextSession || !supabase) {
      setSession(null);
      setReady(true);
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', nextSession.user.id)
      .single();

    if (error || !profile?.is_active) {
      await supabase.auth.signOut();
      setSession(null);
      setReady(true);
      throw new Error('Akun belum diaktifkan oleh Master.');
    }

    await restoreCloudSnapshot();
    setSession(nextSession);
    setReady(true);
  };

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => prepareSession(data.session)).catch(() => setReady(true));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSession(null);
        setReady(true);
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await prepareSession(data.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) await prepareSession(data.session);
        else setMessage('Akun dibuat. Periksa email untuk konfirmasi sebelum login.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Autentikasi gagal.');
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
            Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada environment deployment.
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
            <h1 className="text-2xl font-black text-slate-900">KIRI WMS</h1>
            <p className="mt-1 text-sm text-slate-500">{mode === 'login' ? 'Masuk ke sistem purchasing' : 'Daftarkan akun pengguna'}</p>
          </div>
          {mode === 'register' && (
            <label className="mb-4 block text-sm font-semibold text-slate-700">
              Nama lengkap
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
            </label>
          )}
          <label className="mb-4 block text-sm font-semibold text-slate-700">
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          <label className="mb-4 block text-sm font-semibold text-slate-700">
            Password
            <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-emerald-500" />
          </label>
          {message && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-60">
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-4 w-full text-sm font-semibold text-slate-600">
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
};
