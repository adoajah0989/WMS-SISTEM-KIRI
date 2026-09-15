import React, { useState } from 'react';
import {
  Package,
  FileText,
  ShoppingCart,
  Truck,
  Database,
  Building2,
  LayoutDashboard,
  Search,
  X,
  Menu,
  QrCode,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { ActiveTab } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { canScanWarehouse, ROLE_LABELS, ROLE_TABS } from '../../lib/permissions';

interface HeaderProps {
  onOpenScanQR?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenScanQR }) => {
  const { profile, signOut } = useAuth();
  const {
    activeTab,
    setActiveTab,
    searchGlobal,
    setSearchGlobal,
    getPendingPRsCount,
    getLowStockItems,
    getActivePOsCount,
  } = usePurchasing();

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const pendingPRs = getPendingPRsCount();
  const lowStockCount = getLowStockItems().length;
  const activePOs = getActivePOsCount();

  const allNavItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeType?: 'warning' | 'info' | 'danger' }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requisitions', label: 'Permintaan (PR)', icon: FileText, badge: pendingPRs, badgeType: 'warning' },
    { id: 'purchase_orders', label: 'Purchase Order (PO)', icon: ShoppingCart, badge: activePOs, badgeType: 'info' },
    { id: 'goods_receipts', label: 'Penerimaan (GRN)', icon: Truck },
    { id: 'warehouse', label: 'Stok Gudang', icon: Database, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeType: 'danger' },
    { id: 'suppliers', label: 'Supplier', icon: Building2 },
  ];
  const navItems = allNavItems.filter(item => ROLE_TABS[profile.role].includes(item.id));

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900">
                  KIRI PURCHASING
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md">
                  V1.0
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-normal hidden xs:block">
                Sistem Pengadaan & Inventaris Gudang
              </p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Desktop Search Bar */}
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchGlobal}
                onChange={(e) => setSearchGlobal(e.target.value)}
                placeholder="Cari PO, PR, SKU barang..."
                className="w-full bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white border border-slate-200 text-slate-900 text-xs rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-400 transition"
              />
              {searchGlobal && (
                <button
                  onClick={() => setSearchGlobal('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Cari data"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Scan QR Rak Shortcut Button */}
            {onOpenScanQR && canScanWarehouse(profile.role) && (
              <button
                onClick={onOpenScanQR}
                title="Pindai QR Code Rak Gudang"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition min-h-[36px]"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Scan QR Rak</span>
              </button>
            )}

            <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 sm:pl-2.5">
              {profile.role === 'master' && <a href="/admin" title="Buka halaman admin" className="flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><ShieldCheck className="h-4 w-4" /><span className="hidden lg:inline">Admin</span></a>}
              <span className="hidden rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-600 sm:inline">{ROLE_LABELS[profile.role]}</span>
              <button onClick={() => void signOut()} title="Keluar" aria-label="Keluar" className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {isMobileSearchOpen && (
          <div className="md:hidden pb-3 pt-1 border-t border-slate-100">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchGlobal}
                onChange={(e) => setSearchGlobal(e.target.value)}
                placeholder="Cari PO, PR, SKU barang..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-slate-900 text-xs rounded-lg pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder-slate-400 shadow-inner transition"
              />
              {searchGlobal ? (
                <button
                  onClick={() => setSearchGlobal('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Main Navigation Tabs Bar (Hidden on Mobile) */}
      <div className="hidden md:block bg-slate-50/70 border-t border-slate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-1.5 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-slate-800 text-emerald-300'
                          : item.badgeType === 'danger'
                          ? 'bg-rose-100 text-rose-700'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
