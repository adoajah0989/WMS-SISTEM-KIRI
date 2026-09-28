import React, { useState } from 'react';
import { ArrowRightLeft, Building2, ClipboardCheck, Database, FileText, LayoutDashboard, MoreHorizontal, QrCode, ShoppingCart, Truck, X } from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { ActiveTab } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { canScanWarehouse, ROLE_TABS } from '../../lib/permissions';

interface BottomNavProps { onOpenScanQR?: () => void; }

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenScanQR }) => {
  const { profile } = useAuth();
  const { activeTab, setActiveTab, getPendingPRsCount, getLowStockItems, getActivePOsCount } = usePurchasing();
  const [moreOpen, setMoreOpen] = useState(false);
  const allPrimary: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'requisitions', label: 'PR', icon: FileText, badge: getPendingPRsCount() },
    { id: 'purchase_orders', label: 'PO', icon: ShoppingCart, badge: getActivePOsCount() },
    { id: 'warehouse', label: 'Stok', icon: Database, badge: getLowStockItems().length },
  ];
  const primary = allPrimary.filter((item) => ROLE_TABS[profile.role].includes(item.id));

  const go = (tab: ActiveTab) => { setActiveTab(tab); setMoreOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <>
    {moreOpen && <div className="no-print fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] md:hidden" onClick={() => setMoreOpen(false)}>
      <section className="absolute inset-x-0 bottom-0 rounded-t-[26px] border-t border-[#2C2C2E] bg-[#121212] p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold text-white">Menu lainnya</h2><p className="text-xs text-[#98989D]">Penerimaan, supplier, dan alat gudang</p></div><button onClick={() => setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E1E1E] text-[#666]"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_TABS[profile.role].includes('goods_receipts') && <button onClick={() => go('goods_receipts')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#2C2C2E] bg-[#1E1E1E] px-4 text-left text-sm font-semibold text-white"><span className="rounded-xl bg-[#eaf2ff] p-2 text-[#3974d9]"><Truck className="h-5 w-5" /></span>Penerimaan</button>}
          {ROLE_TABS[profile.role].includes('suppliers') && <button onClick={() => go('suppliers')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#2C2C2E] bg-[#1E1E1E] px-4 text-left text-sm font-semibold text-white"><span className="rounded-xl bg-[#f1eaff] p-2 text-[#8158bd]"><Building2 className="h-5 w-5" /></span>Supplier</button>}
          {ROLE_TABS[profile.role].includes('stock_opname') && <button onClick={() => go('stock_opname')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#2C2C2E] bg-[#1E1E1E] px-4 text-left text-sm font-semibold text-white"><span className="rounded-xl bg-[#e8f7e4] p-2 text-[#00E5FF]"><ClipboardCheck className="h-5 w-5" /></span>Stock Opname</button>}
          {ROLE_TABS[profile.role].includes('store_transfers') && <button onClick={() => go('store_transfers')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#2C2C2E] bg-[#1E1E1E] px-4 text-left text-sm font-semibold text-white"><span className="rounded-xl bg-[#fff2d8] p-2 text-[#9a6819]"><ArrowRightLeft className="h-5 w-5" /></span>Transfer Store</button>}
          {onOpenScanQR && canScanWarehouse(profile.role) && <button onClick={() => { setMoreOpen(false); onOpenScanQR(); }} className="col-span-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#1E1E1E] text-sm font-semibold text-white"><QrCode className="h-5 w-5 text-[#00E5FF]" /> Pindai QR rak gudang</button>}
        </div>
      </section>
    </div>}

    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-[#2C2C2E] bg-[#1E1E1E]/95 px-2 pt-1.5 shadow-[0_-10px_28px_rgba(0,0,0,.45)] backdrop-blur-xl md:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 7px)' }}>
      <div className="mx-auto flex max-w-lg items-center gap-1">
        {primary.map((item) => { const Icon = item.icon; const active = activeTab === item.id; return <button key={item.id} onClick={() => go(item.id)} className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition active:scale-95 ${active ? 'bg-[#102B2E] text-[#00E5FF]' : 'text-[#98989D]'}`}><span className="relative"><Icon className={`h-5 w-5 ${active ? 'text-[#00E5FF]' : 'text-[#98989D]'}`} />{!!item.badge && item.badge > 0 && <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e75d55] px-1 text-[8px] font-bold text-white">{item.badge > 99 ? '99+' : item.badge}</span>}</span>{item.label}</button>; })}
        <button onClick={() => setMoreOpen(true)} className="flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-[#98989D] active:scale-95"><MoreHorizontal className="h-5 w-5" />Lainnya</button>
      </div>
    </nav>
  </>;
};
