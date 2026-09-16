import React, { useState } from 'react';
import { Building2, Database, FileText, LayoutDashboard, MoreHorizontal, QrCode, ShoppingCart, Truck, X } from 'lucide-react';
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
    {moreOpen && <div className="no-print fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] md:hidden" onClick={() => setMoreOpen(false)}>
      <section className="absolute inset-x-0 bottom-0 rounded-t-[26px] border-t border-[#e2e0da] bg-[#f9f8f5] p-4 pb-[calc(env(safe-area-inset-bottom)+18px)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold text-[#292929]">Menu lainnya</h2><p className="text-xs text-[#7f7e78]">Penerimaan, supplier, dan alat gudang</p></div><button onClick={() => setMoreOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#666]"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_TABS[profile.role].includes('goods_receipts') && <button onClick={() => go('goods_receipts')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#e2e0da] bg-white px-4 text-left text-sm font-semibold text-[#333]"><span className="rounded-xl bg-[#eaf2ff] p-2 text-[#3974d9]"><Truck className="h-5 w-5" /></span>Penerimaan</button>}
          {ROLE_TABS[profile.role].includes('suppliers') && <button onClick={() => go('suppliers')} className="flex min-h-16 items-center gap-3 rounded-2xl border border-[#e2e0da] bg-white px-4 text-left text-sm font-semibold text-[#333]"><span className="rounded-xl bg-[#f1eaff] p-2 text-[#8158bd]"><Building2 className="h-5 w-5" /></span>Supplier</button>}
          {onOpenScanQR && canScanWarehouse(profile.role) && <button onClick={() => { setMoreOpen(false); onOpenScanQR(); }} className="col-span-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#252525] text-sm font-semibold text-white"><QrCode className="h-5 w-5 text-[#82dd70]" /> Pindai QR rak gudang</button>}
        </div>
      </section>
    </div>}

    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-[#dedcd6] bg-white/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(35,35,30,.08)] backdrop-blur-xl md:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 7px)' }}>
      <div className="mx-auto flex max-w-lg items-center gap-1">
        {primary.map((item) => { const Icon = item.icon; const active = activeTab === item.id; return <button key={item.id} onClick={() => go(item.id)} className={`relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition active:scale-95 ${active ? 'bg-[#e4f7df] text-[#22451e]' : 'text-[#77766f]'}`}><span className="relative"><Icon className={`h-5 w-5 ${active ? 'text-[#397c31]' : 'text-[#8b8a84]'}`} />{!!item.badge && item.badge > 0 && <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e75d55] px-1 text-[8px] font-bold text-white">{item.badge > 99 ? '99+' : item.badge}</span>}</span>{item.label}</button>; })}
        <button onClick={() => setMoreOpen(true)} className="flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-[#77766f] active:scale-95"><MoreHorizontal className="h-5 w-5" />Lainnya</button>
      </div>
    </nav>
  </>;
};
