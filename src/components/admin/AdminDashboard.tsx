import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Database, Download, LogOut, Plus, RefreshCw, Settings2, ShieldCheck, Trash2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ROLE_LABELS } from '../../lib/permissions';
import { useAuth, type AppRole } from '../auth/AuthContext';
import { recordActivity } from '../../services/activityLog';
import type { InventoryCategory, WarehouseConfig } from '../../types';

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
const defaultCategories = ['Bahan Baku & Kimia Industri','Kemasan & Packaging','Suku Cadang & Sparepart','ATK & Perlengkapan Kantor','Elektrikal & IT Hardware','Lain-lain'].map((name,index)=>({ id:`cat-default-${index}`, name, isActive:true }));
const defaultLocations: WarehouseConfig[] = [
  ['JKT','Warehouse Jakarta','warehouse','Jakarta'],['ACH','Warehouse Aceh','warehouse','Banda Aceh'],['RTI','Warehouse Roti','warehouse','Banda Aceh'],['BTR','Bintaro','store','Tangerang Selatan'],['GRH','Graha Raya','store','Tangerang'],['TMP','TMP','store','Banda Aceh'],['LMT','Lamteh','store','Banda Aceh'],['BTH','Batoh','store','Banda Aceh'],['SRT','Store Roti Kiri','store','Banda Aceh'],
].map(([code,name,type,city],index)=>({ id:`location-default-${index}`, code, name, type:type as 'warehouse'|'store', city, isActive:true }));
const dataKeys = [
  ['kiri_warehouse_items', 'SKU'],
  ['kiri_suppliers', 'Supplier'],
  ['kiri_requisitions', 'PR'],
  ['kiri_purchase_orders', 'PO'],
  ['kiri_goods_receipts', 'GRN'],
  ['kiri_stock_opnames', 'Opname'],
  ['kiri_store_transfers', 'Transfer'],
] as const;

export const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [appState, setAppState] = useState<StateRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState({ code: '', name: '', city: '', type: 'warehouse' as 'warehouse' | 'store' });

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
  useEffect(() => {
    if (!appState) return;
    setCategories((appState.payload.kiri_inventory_categories?.length ? appState.payload.kiri_inventory_categories : defaultCategories) as unknown as InventoryCategory[]);
    setWarehouses((appState.payload.kiri_warehouses?.length ? appState.payload.kiri_warehouses : defaultLocations) as unknown as WarehouseConfig[]);
  }, [appState]);

  const saveWarehouseSettings = async (nextCategories = categories, nextWarehouses = warehouses) => {
    if (!supabase || !appState) return;
    setMessage('');
    const payload = { ...appState.payload, kiri_inventory_categories: nextCategories, kiri_warehouses: nextWarehouses };
    const { error } = await supabase.from('app_state').upsert({ id: 1, payload, updated_at: new Date().toISOString() });
    if (error) setMessage(error.message);
    else { setMessage('Pengaturan gudang berhasil disimpan. Muat ulang aplikasi operasional untuk menggunakan perubahan.'); await recordActivity('system', 'warehouse_settings', null, 'Admin memperbarui kategori atau lokasi gudang'); await load(); }
  };

  const addCategory = () => {
    const name = newCategory.trim(); if (!name || categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    const next = [...categories, { id: `cat-${Date.now()}`, name, isActive: true }]; setCategories(next); setNewCategory(''); void saveWarehouseSettings(next, warehouses);
  };

  const addLocation = () => {
    if (!newLocation.code.trim() || !newLocation.name.trim()) return;
    const next = [...warehouses, { id: `location-${Date.now()}`, code: newLocation.code.trim().toUpperCase(), name: newLocation.name.trim(), city: newLocation.city.trim() || 'Indonesia', type: newLocation.type, isActive: true }]; setWarehouses(next); setNewLocation({ code: '', name: '', city: '', type: 'warehouse' }); void saveWarehouseSettings(categories, next);
  };

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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{dataKeys.map(([key, label]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{totals[key] || 0}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-4 sm:p-5"><h3 className="text-lg font-black">Kelola Akun</h3><p className="text-xs text-slate-500">Pengguna mendaftar dari aplikasi, lalu Master menetapkan role dan status aktif di sini.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Terdaftar</th></tr></thead><tbody>{profiles.map(row => <tr key={row.id} className="border-t"><td className="p-3"><p className="font-bold">{row.full_name || 'Tanpa nama'}</p><p className="text-xs text-slate-400">{row.email || (row.id === profile.id ? 'Akun Anda' : row.id.slice(0, 8))}</p></td><td className="p-3"><select aria-label={`Role ${row.full_name}`} value={row.role} disabled={row.id === profile.id || savingId === row.id} onChange={event => void updateProfile(row, { role: event.target.value as AppRole })} className="min-h-10 rounded-lg border px-2 disabled:bg-slate-100">{roles.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></td><td className="p-3"><button disabled={row.id === profile.id || savingId === row.id} onClick={() => void updateProfile(row, { is_active: !row.is_active })} className={`min-h-10 rounded-lg px-3 text-xs font-bold text-white disabled:bg-slate-300 ${row.is_active ? 'bg-emerald-600' : 'bg-slate-500'}`}>{row.is_active ? 'Aktif' : 'Nonaktif'}</button></td><td className="p-3 text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('id-ID')}</td></tr>)}</tbody></table></div>
        </section>

        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2"><Settings2 className="text-emerald-600"/><div><h3 className="text-lg font-black">Kategori & Management Gudang</h3><p className="text-xs text-slate-500">Dipakai oleh master barang, opname, transfer store, dan laporan.</p></div></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div><h4 className="text-sm font-black">Kategori Barang</h4><div className="mt-2 flex gap-2"><input value={newCategory} onChange={event=>setNewCategory(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')addCategory();}} placeholder="Nama kategori baru" className="h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm"/><button onClick={addCategory} className="flex h-11 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"><Plus size={15}/>Tambah</button></div><div className="mt-3 space-y-2">{categories.length?categories.map(category=><div key={category.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-semibold">{category.name}</span><button onClick={()=>{const next=categories.filter(item=>item.id!==category.id);setCategories(next);void saveWarehouseSettings(next,warehouses);}} className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600"><Trash2 size={15}/></button></div>):<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">Belum ada kategori khusus. Aplikasi masih memakai kategori dari master SKU.</p>}</div></div>
            <div><h4 className="text-sm font-black">Gudang & Store</h4><div className="mt-2 grid grid-cols-2 gap-2"><input value={newLocation.code} onChange={event=>setNewLocation(current=>({...current,code:event.target.value}))} placeholder="Kode" className="h-11 rounded-xl border px-3 text-sm"/><select value={newLocation.type} onChange={event=>setNewLocation(current=>({...current,type:event.target.value as 'warehouse'|'store'}))} className="h-11 rounded-xl border px-3 text-sm"><option value="warehouse">Warehouse</option><option value="store">Store</option></select><input value={newLocation.name} onChange={event=>setNewLocation(current=>({...current,name:event.target.value}))} placeholder="Nama lokasi" className="h-11 rounded-xl border px-3 text-sm"/><input value={newLocation.city} onChange={event=>setNewLocation(current=>({...current,city:event.target.value}))} placeholder="Kota" className="h-11 rounded-xl border px-3 text-sm"/></div><button onClick={addLocation} className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-slate-900 text-xs font-bold text-white"><Plus size={15}/>Tambah Lokasi</button><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{warehouses.map(location=><div key={location.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div><p className="text-sm font-semibold">{location.name} <span className="font-mono text-[10px] text-slate-400">{location.code}</span></p><p className="text-[10px] capitalize text-slate-500">{location.type} · {location.city}</p></div><button onClick={()=>{const next=warehouses.filter(item=>item.id!==location.id);setWarehouses(next);void saveWarehouseSettings(categories,next);}} className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600"><Trash2 size={15}/></button></div>)}</div></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-4 sm:p-5"><h3 className="text-lg font-black">Aktivitas Terbaru</h3><p className="text-xs text-slate-500">Penambahan SKU, stok, PR, PO, GRN, supplier, dan perubahan lain.</p></div>
          <div className="divide-y">{activities.length === 0 ? <p className="p-5 text-sm text-slate-500">Belum ada aktivitas setelah audit log diaktifkan.</p> : activities.map(item => <div key={item.id} className="flex items-start justify-between gap-3 p-4"><div><p className="text-sm font-bold">{item.description}</p><p className="text-xs text-slate-500">{item.profiles?.full_name || 'Pengguna'} · {item.entity_type}</p></div><time className="shrink-0 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('id-ID')}</time></div>)}</div>
        </section>
      </main>
    </div>
  );
};
