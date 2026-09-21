import React, { useEffect, useRef, useState } from 'react';
import { usePurchasing } from '../../context/PurchasingContext';
import { readLocalSnapshot, saveCloudSnapshot } from '../../services/cloudPersistence';

export const CloudSync: React.FC = () => {
  const { items, suppliers, requisitions, purchaseOrders, goodsReceipts, stockMovements, stockOpnames, storeTransfers, warehouses, inventoryCategories } = usePurchasing();
  const firstRender = useRef(true);
  const [syncError, setSyncError] = useState('');

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
