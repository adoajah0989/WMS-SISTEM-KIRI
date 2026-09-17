import type { AppRole } from '../components/auth/AuthContext';
import type { ActiveTab } from '../types';

export const ROLE_LABELS: Record<AppRole, string> = {
  master: 'Master',
  manajer: 'Manajer',
  purchasing: 'Purchasing',
  warehouse: 'Warehouse',
  viewer: 'Viewer',
};

export const ROLE_TABS: Record<AppRole, ActiveTab[]> = {
  master: ['dashboard', 'requisitions', 'purchase_orders', 'goods_receipts', 'warehouse', 'stock_opname', 'store_transfers', 'suppliers'],
  manajer: ['dashboard', 'requisitions', 'purchase_orders', 'goods_receipts', 'warehouse', 'stock_opname', 'store_transfers', 'suppliers'],
  purchasing: ['dashboard', 'requisitions', 'purchase_orders', 'suppliers'],
  warehouse: ['dashboard', 'requisitions', 'goods_receipts', 'warehouse', 'stock_opname', 'store_transfers'],
  viewer: ['dashboard'],
};

export const canAccessTab = (role: AppRole, tab: ActiveTab) => ROLE_TABS[role].includes(tab);
export const canScanWarehouse = (role: AppRole) => ['master', 'manajer', 'warehouse'].includes(role);
export const canCreatePR = (role: AppRole) => role !== 'viewer';
export const canCreatePO = (role: AppRole) => ['master', 'manajer', 'purchasing'].includes(role);
export const canReceiveGoods = (role: AppRole) => ['master', 'manajer', 'warehouse'].includes(role);
