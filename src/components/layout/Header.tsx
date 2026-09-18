import React, { useState } from 'react';
import { Bell, LogOut, Menu, Package, QrCode, Search, ShieldCheck, Warehouse, X } from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { useAuth } from '../auth/AuthContext';
import { canScanWarehouse, ROLE_LABELS } from '../../lib/permissions';

interface HeaderProps { onOpenScanQR?: () => void; }

const PAGE_TITLES = {
  dashboard: ['Dashboard', 'Ringkasan aktivitas supply hari ini'],
  requisitions: ['Permintaan barang', 'Kelola kebutuhan dan persetujuan PR'],
  purchase_orders: ['Purchase order', 'Pantau pemesanan dan konfirmasi supplier'],
  goods_receipts: ['Penerimaan barang', 'Cocokkan barang masuk dengan PO'],
  warehouse: ['Stok gudang', 'Kontrol stok, lokasi rak, dan pergerakan barang'],
  stock_opname: ['Stock opname', 'Template harian, bulanan, rak, dan kategori'],
  store_transfers: ['Transfer store', 'Pisahkan barang dikirim dan diterima'],
  suppliers: ['Supplier', 'Data vendor dan syarat pembayaran'],
} as const;

export const Header: React.FC<HeaderProps> = ({ onOpenScanQR }) => {
  const { profile, signOut } = useAuth();
  const { activeTab, searchGlobal, setSearchGlobal, activeWarehouseId, accessibleWarehouses, setActiveWarehouseId } = usePurchasing();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [title, subtitle] = PAGE_TITLES[activeTab];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#e7e5e0] bg-[#f3f2ef]/95 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-3 px-3 sm:px-5 lg:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#252525] text-[#83df73] md:hidden">
            <Package className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-[#242424] sm:text-lg">{title}</h1>
            <p className="hidden truncate text-[11px] text-[#7c7b76] sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="relative hidden w-[280px] lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9a94]" />
          <input value={searchGlobal} onChange={(event) => setSearchGlobal(event.target.value)} placeholder="Cari SKU, PR, PO, supplier..." className="h-10 w-full rounded-xl border border-[#deddd7] bg-white pl-9 pr-9 text-xs text-[#333] outline-none transition focus:border-[#aaa9a2] focus:ring-4 focus:ring-[#82dd70]/15" />
          {searchGlobal && <button onClick={() => setSearchGlobal('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#96958f]"><X className="h-3.5 w-3.5" /></button>}
        </div>

        <label className="relative flex h-10 min-w-0 max-w-[190px] items-center rounded-xl border border-[#d8d6cf] bg-white pl-8 pr-2 sm:min-w-[170px]">
          <Warehouse className="pointer-events-none absolute left-2.5 h-4 w-4 text-[#397c31]" />
          <select value={activeWarehouseId} onChange={(event) => setActiveWarehouseId(event.target.value)} className="h-full min-w-0 flex-1 appearance-none truncate bg-transparent pr-4 text-[10px] font-bold text-[#333] outline-none sm:text-xs" aria-label="Warehouse aktif">
            {accessibleWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </label>

        <button onClick={() => setMobileSearch((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#deddd7] bg-white text-[#555] lg:hidden" aria-label="Cari"><Search className="h-[18px] w-[18px]" /></button>
        {onOpenScanQR && canScanWarehouse(profile.role) && <button onClick={onOpenScanQR} className="hidden h-10 items-center gap-2 rounded-xl border border-[#deddd7] bg-white px-3 text-xs font-semibold text-[#444] hover:border-[#aaa9a2] sm:flex"><QrCode className="h-4 w-4" /> Scan</button>}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#deddd7] bg-white text-[#555]" aria-label="Notifikasi"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#ef6a61]" /></button>

        <div className="relative">
          <button onClick={() => setProfileOpen((value) => !value)} className="flex h-10 items-center gap-2 rounded-xl bg-[#252525] px-2.5 text-white shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#82dd70] text-[10px] font-bold text-[#1d3a19]">{(profile.fullName || profile.email).slice(0, 2).toUpperCase()}</span>
            <span className="hidden max-w-28 truncate text-xs font-semibold xl:block">{profile.fullName || profile.email}</span>
            <Menu className="h-3.5 w-3.5 text-[#bdbcb6]" />
          </button>
          {profileOpen && <div className="absolute right-0 top-12 w-56 rounded-2xl border border-[#e4e2dc] bg-white p-2 shadow-xl">
            <div className="border-b border-[#eceae5] px-3 py-2.5"><p className="truncate text-xs font-semibold text-[#333]">{profile.email}</p><p className="mt-1 text-[10px] text-[#888781]">{ROLE_LABELS[profile.role]}</p></div>
            {profile.role === 'master' && <a href="/admin" className="mt-1 flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-[#555] hover:bg-[#f4f3ef]"><ShieldCheck className="h-4 w-4" /> Administrasi</a>}
            <button onClick={() => void signOut()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-medium text-[#c44e48] hover:bg-[#fff0ee]"><LogOut className="h-4 w-4" /> Keluar</button>
          </div>}
        </div>
      </div>

      {mobileSearch && <div className="border-t border-[#e7e5e0] px-3 py-2 lg:hidden"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" /><input autoFocus value={searchGlobal} onChange={(event) => setSearchGlobal(event.target.value)} placeholder="Cari SKU, PR, PO, supplier..." className="h-11 w-full rounded-xl border border-[#deddd7] bg-white pl-9 pr-10 text-sm outline-none focus:border-[#82dd70]" /><button onClick={() => setMobileSearch(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#777]"><X className="h-4 w-4" /></button></div></div>}
    </header>
  );
};
