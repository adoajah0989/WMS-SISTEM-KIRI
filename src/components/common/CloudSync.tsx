import React, { useEffect, useRef, useState } from 'react';
import { usePurchasing } from '../../context/PurchasingContext';
import { readLocalSnapshot, saveCloudSnapshot } from '../../services/cloudPersistence';
import { supabase } from '../../lib/supabase';

export const CloudSync: React.FC = () => {
  const { items, suppliers, requisitions, purchaseOrders, goodsReceipts, stockMovements, stockOpnames, storeTransfers, warehouses, inventoryCategories, applyCloudSnapshot } = usePurchasing();
  const firstRender = useRef(true);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('wms-app-state-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_state', filter: 'id=eq.1' }, (payload) => {
        const nextVersion = Number((payload.new as { version?: number }).version || 0);
        const currentVersion = Number(localStorage.getItem('kiri_app_state_version') || '0');
        if (nextVersion <= currentVersion) return;

        applyCloudSnapshot((payload.new as { payload?: Record<string, unknown[]> }).payload || {}, nextVersion);
        setSyncError('');
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') setSyncError('Update realtime belum tersedia. Periksa publication Supabase.');
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyCloudSnapshot]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        await saveCloudSnapshot(readLocalSnapshot());
        setSyncError('');
      } catch (error) {
        console.error('Supabase sync failed', error);
        setSyncError(error instanceof Error && error.message === 'SYNC_VERSION_CONFLICT' ? 'Data berubah di perangkat lain. Muat ulang sebelum melanjutkan.' : 'Data belum tersinkron ke server. Data lokal tetap aman.');
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [items, suppliers, requisitions, purchaseOrders, goodsReceipts, stockMovements, stockOpnames, storeTransfers, warehouses, inventoryCategories]);

  if (!syncError) return null;

  return (
    <div className="fixed bottom-24 md:bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
      {syncError}
    </div>
  );
};
