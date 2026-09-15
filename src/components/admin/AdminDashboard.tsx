import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Database, Download, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ROLE_LABELS } from '../../lib/permissions';
import { useAuth, type AppRole } from '../auth/AuthContext';
import { recordActivity } from '../../services/activityLog';

interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ActivityRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

interface StateRow {
  payload: Record<string, unknown[]>;
  updated_at: string;
  version: number;
}

const roles: AppRole[] = ['master', 'manajer', 'purchasing', 'warehouse', 'viewer'];
const dataKeys = [
  ['kiri_warehouse_items', 'SKU'],
  ['kiri_suppliers', 'Supplier'],
  ['kiri_requisitions', 'PR'],
  ['kiri_purchase_orders', 'PO'],
  ['kiri_goods_receipts', 'GRN'],
] as const;

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [appState, setAppState] = useState<StateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage('');
    const [profileResult, activityResult, stateResult] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role, is_active, created_at, updated_at').order('created_at', { ascending: false }),
      supabase.from('activity_log').select('id, action, entity_type, entity_id, description, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('app_state').select('payload, updated_at, version').eq('id', 1).maybeSingle(),
    ]);
    const error = profileResult.error || activityResult.error || stateResult.error;
    if (error) setMessage(error.message);
    else {
      setProfiles((profileResult.data || []) as ProfileRow[]);
      setActivities((activityResult.data || []) as unknown as ActivityRow[]);
      setAppState(stateResult.data as StateRow | null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateProfile = async (row: ProfileRow, changes: Partial<Pick<ProfileRow, 'role' | 'is_active'>>) => {
    if (!supabase || row.id === profile.id) return;
    setSavingId(row.id);
    setMessage('');
    const { error } = await supabase.from('profiles').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (error) setMessage(error.message);
    else {
      const change = changes.role ? `role menjadi ${ROLE_LABELS[changes.role]}` : `status menjadi ${changes.is_active ? 'aktif' : 'nonaktif'}`;
      await recordActivity('system', 'profile', row.id, `Admin mengubah akun ${row.full_name || row.id}: ${change}`);
      await load();
    }
    setSavingId('');
  };

  const totals = useMemo(() => Object.fromEntries(dataKeys.map(([key]) => [key, appState?.payload?.[key]?.length || 0])), [appState]);

  const downloadBackup = () => {
    if (!appState) return;
    const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), ...appState.payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kiri-wms-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" /><div><h1 className="font-black">Admin KIRI WMS</h1><p className="text-xs text-slate-400">Akun, role, dan aktivitas sistem</p></div></div>
          <div className="flex items-center gap-2">
            <a href="/" className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-xs font-bold"><ArrowLeft size={15} /> Aplikasi</a>
            <button onClick={() => void signOut()} className="flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-bold"><LogOut size={15} /> Keluar</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="text-2xl font-black">Ringkasan Sistem</h2><p className="text-sm text-slate-500">Masuk sebagai {profile.fullName} · Master</p></div>
          <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-bold"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button><button onClick={downloadBackup} disabled={!appState} className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"><Download size={16} /> Backup</button></div>
        </section>
        {message && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4"><Users className="text-indigo-600" /><p className="mt-3 text-2xl font-black">{profiles.length}</p><p className="text-xs text-slate-500">Total akun</p></div>
          <div className="rounded-2xl border bg-white p-4"><ShieldCheck className="text-emerald-600" /><p className="mt-3 text-2xl font-black">{profiles.filter(item => item.is_active).length}</p><p className="text-xs text-slate-500">Akun aktif</p></div>
          <div className="rounded-2xl border bg-white p-4"><Database className="text-sky-600" /><p className="mt-3 text-2xl font-black">{totals.kiri_warehouse_items || 0}</p><p className="text-xs text-slate-500">Master SKU</p></div>
          <div className="rounded-2xl border bg-white p-4"><Activity className="text-amber-600" /><p className="mt-3 text-sm font-black">{appState?.updated_at ? new Date(appState.updated_at).toLocaleString('id-ID') : '-'}</p><p className="text-xs text-slate-500">Sinkronisasi terakhir</p></div>
        </section>

        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <h3 className="text-lg font-black">Data Operasional</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">{dataKeys.map(([key, label]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{totals[key] || 0}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-4 sm:p-5"><h3 className="text-lg font-black">Kelola Akun</h3><p className="text-xs text-slate-500">Pengguna mendaftar dari aplikasi, lalu Master menetapkan role dan status aktif di sini.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Terdaftar</th></tr></thead><tbody>{profiles.map(row => <tr key={row.id} className="border-t"><td className="p-3"><p className="font-bold">{row.full_name || 'Tanpa nama'}</p><p className="text-xs text-slate-400">{row.email || (row.id === profile.id ? 'Akun Anda' : row.id.slice(0, 8))}</p></td><td className="p-3"><select aria-label={`Role ${row.full_name}`} value={row.role} disabled={row.id === profile.id || savingId === row.id} onChange={event => void updateProfile(row, { role: event.target.value as AppRole })} className="min-h-10 rounded-lg border px-2 disabled:bg-slate-100">{roles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></td><td className="p-3"><button disabled={row.id === profile.id || savingId === row.id} onClick={() => void updateProfile(row, { is_active: !row.is_active })} className={`min-h-10 rounded-lg px-3 text-xs font-bold text-white disabled:bg-slate-300 ${row.is_active ? 'bg-emerald-600' : 'bg-slate-500'}`}>{row.is_active ? 'Aktif' : 'Nonaktif'}</button></td><td className="p-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('id-ID')}</td></tr>)}</tbody></table></div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-4 sm:p-5"><h3 className="text-lg font-black">Aktivitas Terbaru</h3><p className="text-xs text-slate-500">Penambahan SKU, stok, PR, PO, GRN, supplier, dan perubahan lain.</p></div>
          <div className="divide-y">{activities.length === 0 ? <p className="p-5 text-sm text-slate-500">Belum ada aktivitas setelah audit log diaktifkan.</p> : activities.map(item => <div key={item.id} className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-bold">{item.description}</p><p className="text-xs text-slate-500">{item.profiles?.full_name || 'Pengguna'} · {item.entity_type}</p></div><time className="shrink-0 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('id-ID')}</time></div>)}</div>
        </section>
      </main>
    </div>
  );
};
