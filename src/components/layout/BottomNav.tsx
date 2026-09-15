import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Truck,
  Database,
  Building2,
  QrCode,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { ActiveTab } from '../../types';

interface BottomNavProps {
  onOpenScanQR?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenScanQR }) => {
  const {
    activeTab,
    setActiveTab,
    getPendingPRsCount,
    getLowStockItems,
    getActivePOsCount,
  } = usePurchasing();

  const pendingPRs = getPendingPRsCount();
  const lowStockCount = getLowStockItems().length;
  const activePOs = getActivePOsCount();

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    badgeType?: 'warning' | 'info' | 'danger';
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Beranda',
      icon: LayoutDashboard,
    },
    {
      id: 'requisitions',
      label: 'Permintaan (PR)',
      shortLabel: 'PR',
      icon: FileText,
      badge: pendingPRs,
      badgeType: 'warning',
    },
    {
      id: 'purchase_orders',
      label: 'Purchase Order (PO)',
      shortLabel: 'PO',
      icon: ShoppingCart,
      badge: activePOs,
      badgeType: 'info',
    },
    {
      id: 'goods_receipts',
      label: 'Penerimaan (GRN)',
      shortLabel: 'GRN',
      icon: Truck,
    },
    {
      id: 'warehouse',
      label: 'Stok Gudang',
      shortLabel: 'Gudang',
      icon: Database,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeType: 'danger',
    },
    {
      id: 'suppliers',
      label: 'Supplier',
      shortLabel: 'Vendor',
      icon: Building2,
    },
  ];

  return (
    <>
      {/* Floating QR Scanner Button on Mobile */}
      {onOpenScanQR && (
        <button
          onClick={onOpenScanQR}
          aria-label="Scan QR Rak Gudang"
          className="md:hidden fixed right-4 bottom-20 z-40 bg-slate-900 hover:bg-black active:scale-95 text-emerald-400 p-3.5 rounded-full shadow-lg border-2 border-emerald-500/40 flex items-center justify-center transition-transform no-print"
        >
          <QrCode className="w-6 h-6" />
          <span className="sr-only">Scan QR Rak</span>
        </button>
      )}

      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] px-1 py-1.5 no-print"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 6px), 6px)' }}
      >
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  // Subtle scroll to top on mobile tab switch
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all select-none min-h-[46px] active:scale-95 ${
                  isActive
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {/* Active Pill Background */}
                {isActive && (
                  <span className="absolute inset-x-2 inset-y-1 bg-slate-100/90 rounded-lg -z-10" />
                )}

                {/* Icon Container with Badge */}
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'text-slate-900 scale-110' : 'text-slate-400'
                    }`}
                  />

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2 text-[9px] font-extrabold px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center shadow-xs border border-white ${
                        item.badgeType === 'danger'
                          ? 'bg-rose-500 text-white'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Text Label */}
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none truncate max-w-[58px] ${
                    isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
