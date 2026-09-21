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

const SNAPSHOT_VERSION_KEY = 'kiri_app_state_version';

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
    .select('payload, version')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (data?.payload) {
    writeLocalSnapshot(data.payload as Partial<CloudSnapshot>);
    localStorage.setItem(SNAPSHOT_VERSION_KEY, String(data.version ?? 0));
  }
};

export const saveCloudSnapshot = async (snapshot: CloudSnapshot) => {
  if (!supabase) return;

  const expectedVersion = Number(localStorage.getItem(SNAPSHOT_VERSION_KEY) || '0');
  const { data, error } = await supabase.rpc('save_app_state', {
    p_expected_version: expectedVersion,
    p_payload: snapshot,
  });

  if (error) throw error;

  const saved = Array.isArray(data) ? data[0] : data;
  if (!saved?.new_version) {
    throw new Error('SYNC_VERSION_CONFLICT');
  }

  localStorage.setItem(SNAPSHOT_VERSION_KEY, String(saved.new_version));
};
