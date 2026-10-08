import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePurchasing } from '../../context/PurchasingContext';
import { fetchCloudSnapshot, getSnapshotVersion, saveCloudSnapshot, STORAGE_KEYS, type CloudSnapshot } from '../../services/cloudPersistence';
import { supabase } from '../../lib/supabase';

const sameSnapshot = (a: CloudSnapshot, b: CloudSnapshot) =>
  Object.values(STORAGE_KEYS).every(key => a[key] === b[key]);

export const CloudSync: React.FC = () => {
  const { cloudSnapshot: snapshot, applyCloudSnapshot } = usePurchasing();
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const synced = useRef(snapshot);
  const saving = useRef(false);
  const blocked = useRef(false);
  const refresh = useRef<() => Promise<void>>(async () => {});
  const [retry, setRetry] = useState(0);
  const [syncError, setSyncError] = useState('');

  const applyIncomingSnapshot = useCallback((payload: Partial<CloudSnapshot>, version: number) => {
    // Never replace pending local changes, or acknowledge a write before its RPC finishes.
    if (saving.current || !sameSnapshot(latest.current, synced.current) || version <= getSnapshotVersion()) return;
    synced.current = { ...latest.current, ...payload };
    applyCloudSnapshot(payload, version);
    setSyncError('');
  }, [applyCloudSnapshot]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let checking = false;
    refresh.current = async () => {
      if (!active || checking || !navigator.onLine || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const data = await fetchCloudSnapshot();
        if (active && data?.payload) applyIncomingSnapshot(data.payload, Number(data.version || 0));
      } catch (error) {
        if (active) setSyncError('Belum tersambung ke server. Sinkronisasi akan dicoba lagi.');
        console.error('Cloud refresh failed', error);
      } finally {
        checking = false;
      }
    };

    const channel = supabase
      .channel('wms-app-state-sync')
      // Fetch the authoritative row: large JSON snapshots can exceed realtime payload limits.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_state', filter: 'id=eq.1' }, () => void refresh.current())
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') void refresh.current();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          void refresh.current();
        }
      });

    const resume = () => {
      void refresh.current();
      setRetry(value => value + 1);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'kiri_app_state_version') void refresh.current();
    };
    void refresh.current();
    const timer = window.setInterval(resume, 5000);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', resume);
      void supabase.removeChannel(channel);
    };
  }, [applyIncomingSnapshot]);

  useEffect(() => {
    if (!supabase || blocked.current || saving.current || sameSnapshot(snapshot, synced.current)) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      if (!navigator.onLine) {
        setSyncError('Offline. Perubahan lokal menunggu koneksi internet.');
        return;
      }
      saving.current = true;
      let saved = false;
      try {
        // Read React state, not shared localStorage that another tab can overwrite.
        await saveCloudSnapshot(snapshot);
        synced.current = snapshot;
        saved = true;
        setSyncError('');
      } catch (error) {
        console.error('Supabase sync failed', error);
        if (error instanceof Error && error.message === 'SYNC_VERSION_CONFLICT') {
          blocked.current = true;
          setSyncError('Data server berubah di perangkat lain. Perubahan lokal belum disimpan.');
        } else {
          setSyncError('Data belum tersinkron. Perubahan lokal tetap ada dan akan dicoba lagi.');
        }
      } finally {
        saving.current = false;
        // A newer edit may have arrived while this request was in flight.
        if (saved && !sameSnapshot(latest.current, synced.current)) setRetry(value => value + 1);
        if (saved && active) void refresh.current();
      }
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [snapshot, retry]);

  const loadLatest = async () => {
    if (!window.confirm('Muat data server terbaru? Perubahan lokal yang belum tersimpan akan diganti.')) return;
    try {
      const data = await fetchCloudSnapshot();
      if (!data?.payload) throw new Error('Snapshot unavailable');
      synced.current = { ...latest.current, ...data.payload };
      applyCloudSnapshot(data.payload, Number(data.version || 0));
      blocked.current = false;
      setSyncError('');
    } catch {
      setSyncError('Data server belum dapat dimuat. Perubahan lokal tetap ada.');
    }
  };

  if (!syncError) return null;
  return (
    <div role="status" className="fixed bottom-24 md:bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-24px)] max-w-lg rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
      {syncError}
      {blocked.current && <button onClick={() => void loadLatest()} className="mt-2 block min-h-10 rounded-lg border border-white/50 px-3">Muat data server terbaru</button>}
    </div>
  );
};
