import { supabase } from '../lib/supabase';

export const STORAGE_KEYS = {
  ITEMS: 'kiri_warehouse_items',
  SUPPLIERS: 'kiri_suppliers',
  PRS: 'kiri_requisitions',
  POS: 'kiri_purchase_orders',
  GRNS: 'kiri_goods_receipts',
  MOVEMENTS: 'kiri_stock_movements',
  OPNAMES: 'kiri_stock_opnames',
  TRANSFERS: 'kiri_store_transfers',
  WAREHOUSES: 'kiri_warehouses',
  CATEGORIES: 'kiri_inventory_categories',
} as const;

export type CloudSnapshot = Record<(typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS], unknown[]>;

export const readLocalSnapshot = (): CloudSnapshot =>
  Object.values(STORAGE_KEYS).reduce((result, key) => {
    try {
      result[key] = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      result[key] = [];
    }
    return result;
  }, {} as CloudSnapshot);

export const writeLocalSnapshot = (snapshot: Partial<CloudSnapshot>) => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    const value = snapshot[key];
    if (Array.isArray(value)) localStorage.setItem(key, JSON.stringify(value));
  });
  localStorage.setItem('kiri_empty_db_clean_flag_v1', 'true');
};

export const restoreCloudSnapshot = async () => {
  if (!supabase) return;
  const { data, error } = await supabase
    .from('app_state')
    .select('payload')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (data?.payload) writeLocalSnapshot(data.payload as Partial<CloudSnapshot>);
};

export const saveCloudSnapshot = async (snapshot: CloudSnapshot) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: 1, payload: snapshot, updated_at: new Date().toISOString() });

  if (error) throw error;
};
