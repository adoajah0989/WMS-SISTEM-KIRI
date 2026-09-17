import React from 'react';
import {
  Building2,
  Database,
  FileText,
  LayoutDashboard,
  Package,
  QrCode,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { ActiveTab } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { canScanWarehouse, ROLE_TABS } from '../../lib/permissions';

interface SidebarProps {
  onOpenScanQR?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenScanQR }) => {
  const { profile } = useAuth();
  const { activeTab, setActiveTab, getPendingPRsCount, getLowStockItems, getActivePOsCount } = usePurchasing();

  const groups: { label: string; items: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] }[] = [
    {
      label: 'Ringkasan',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Pengadaan',
      items: [
        { id: 'requisitions', label: 'Permintaan barang', icon: FileText, badge: getPendingPRsCount() },
        { id: 'purchase_orders', label: 'Purchase order', icon: ShoppingCart, badge: getActivePOsCount() },
        { id: 'goods_receipts', label: 'Penerimaan', icon: Truck },
      ],
    },
    {
      label: 'Master & stok',
      items: [
        { id: 'warehouse', label: 'Stok gudang', icon: Database, badge: getLowStockItems().length },
        { id: 'stock_opname', label: 'Stock opname', icon: ClipboardCheck },
        { id: 'store_transfers', label: 'Transfer store', icon: ArrowRightLeft },
        { id: 'suppliers', label: 'Supplier', icon: Building2 },
      ],
    },
  ];

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#e7e5e0] bg-[#fbfbf9] px-3 py-4 md:flex">
      <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#252525] text-[#83df73] shadow-sm">
          <Package className="h-5 w-5" />
        </span>
        <span>
          <strong className="block text-sm tracking-tight text-[#222]">Kiri Supply</strong>
          <span className="block text-[11px] text-[#868681]">Warehouse management</span>
        </span>
      </button>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-1">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a09f99]">{group.label}</p>
            <div className="space-y-1">
              {group.items.filter((item) => ROLE_TABS[profile.role].includes(item.id)).map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition ${
                      active ? 'bg-[#82dd70] font-semibold text-[#183316] shadow-sm' : 'font-medium text-[#676762] hover:bg-[#f0efeb] hover:text-[#222]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span className={`min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold ${active ? 'bg-white/65 text-[#254820]' : 'bg-[#ecebe6] text-[#70706b]'}`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {onOpenScanQR && canScanWarehouse(profile.role) && (
        <button onClick={onOpenScanQR} className="mb-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dddcd6] bg-white text-xs font-semibold text-[#444] shadow-sm hover:border-[#b9b8b1]">
          <QrCode className="h-4 w-4" /> Pindai QR rak
        </button>
      )}
      <div className="rounded-xl bg-[#f1f0ec] px-3 py-3">
        <p className="truncate text-xs font-semibold text-[#333]">{profile.fullName || profile.email}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8a8983]">{profile.role}</p>
      </div>
    </aside>
  );
};
