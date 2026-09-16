import React from 'react';
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock3, Database, FileText,
  PackageCheck, Plus, QrCode, ShoppingCart, Sparkles, TrendingUp, Truck,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { formatDate, formatRupiah, getPOStatusBadge, getPRStatusBadge } from '../../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { canCreatePO, canCreatePR, canReceiveGoods } from '../../lib/permissions';

interface DashboardViewProps {
  onOpenCreatePR: () => void;
  onOpenCreatePO: () => void;
  onOpenCreateGRN: () => void;
  onOpenScanQR?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenCreatePR, onOpenCreatePO, onOpenCreateGRN, onOpenScanQR }) => {
  const { profile } = useAuth();
  const {
    items, suppliers, requisitions, purchaseOrders, goodsReceipts, setActiveTab,
    getLowStockItems, getPendingPRsCount, getActivePOsCount, getTotalMonthlySpend, getInventoryAssetValue,
  } = usePurchasing();

  const lowStockItems = getLowStockItems().sort((a, b) => (a.currentStock / Math.max(a.minStock, 1)) - (b.currentStock / Math.max(b.minStock, 1)));
  const emptyItems = items.filter((item) => item.currentStock <= 0);
  const pendingPRs = requisitions.filter((pr) => pr.status === 'menunggu_persetujuan');
  const activePOs = purchaseOrders.filter((po) => ['diterbitkan', 'terkirim', 'diterima_sebagian'].includes(po.status));
  const recentGRNs = goodsReceipts.slice(0, 4);
  const stockHealth = items.length ? Math.max(0, Math.round(((items.length - lowStockItems.length) / items.length) * 100)) : 100;

  return <div className="space-y-4 sm:space-y-5">
    <section className="flex flex-col gap-3 rounded-2xl border border-[#e5e3dd] bg-white p-4 shadow-[0_8px_24px_rgba(35,35,30,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#8b8a84]">Operasional hari ini</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#242424] sm:text-2xl">Apa yang perlu dibereskan?</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#74736e] sm:text-sm">Prioritas disusun dari risiko stok, approval, dan pesanan yang masih berjalan.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 sm:justify-end">
        {onOpenScanQR && <button onClick={onOpenScanQR} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#dfddd7] bg-white px-3 text-xs font-semibold text-[#444]"><QrCode className="h-4 w-4" /> Scan rak</button>}
        {canCreatePR(profile.role) && <button onClick={onOpenCreatePR} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#252525] px-4 text-xs font-semibold text-white shadow-sm"><Plus className="h-4 w-4 text-[#82dd70]" /> Buat PR</button>}
      </div>
    </section>

    <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e5e3dd] bg-white shadow-[0_8px_24px_rgba(35,35,30,.05)] lg:grid-cols-4">
      <Metric icon={TrendingUp} label="Belanja bulan ini" value={formatRupiah(getTotalMonthlySpend())} note={`${purchaseOrders.length} PO tercatat`} tone="blue" />
      <Metric icon={Clock3} label="Menunggu approval" value={`${getPendingPRsCount()} PR`} note={pendingPRs.length ? 'Perlu ditinjau' : 'Tidak ada antrean'} tone={pendingPRs.length ? 'amber' : 'green'} onClick={() => setActiveTab('requisitions')} />
      <Metric icon={ShoppingCart} label="PO berjalan" value={`${getActivePOsCount()} PO`} note="Belum selesai diterima" tone="violet" onClick={() => setActiveTab('purchase_orders')} />
      <Metric icon={AlertTriangle} label="Risiko stok" value={`${lowStockItems.length} SKU`} note={`${emptyItems.length} barang kosong`} tone={lowStockItems.length ? 'red' : 'green'} onClick={() => setActiveTab('warehouse')} />
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
      <div className="overflow-hidden rounded-2xl border border-[#e5e3dd] bg-white shadow-[0_8px_24px_rgba(35,35,30,.05)]">
        <div className="flex items-center justify-between border-b border-[#eceae5] p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffe7e4] text-[#cb514b]"><AlertTriangle className="h-[18px] w-[18px]" /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#2b2b2b]">Stok yang perlu ditindaklanjuti</h3><p className="truncate text-[11px] text-[#85847e]">Diurutkan dari kondisi paling berisiko</p></div></div>
          <button onClick={() => setActiveTab('warehouse')} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#397c31]">Lihat stok <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        {lowStockItems.length === 0 ? <EmptyState /> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[.08em] text-[#8b8a84]"><tr><th className="px-5 py-3 font-semibold">Barang</th><th className="px-3 py-3 font-semibold">Lokasi</th><th className="px-3 py-3 font-semibold">Stok</th><th className="px-3 py-3 font-semibold">Kondisi</th><th className="px-5 py-3 text-right font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-[#efede8]">{lowStockItems.slice(0, 8).map((item) => { const state = item.currentStock <= 0 ? 'Kosong' : item.currentStock <= item.minStock * .5 ? 'Sekarat' : 'Menipis'; return <tr key={item.id} className="hover:bg-[#fbfaf7]"><td className="px-5 py-3.5"><p className="font-semibold text-[#333]">{item.name}</p><p className="mt-0.5 font-mono text-[10px] text-[#8a8983]">{item.sku} · {item.category}</p></td><td className="px-3 py-3.5 text-[#666]">{item.warehouseLocation}</td><td className="px-3 py-3.5"><strong className="tabular-nums text-[#333]">{item.currentStock}</strong> <span className="text-[#898882]">{item.unit}</span><p className="text-[10px] text-[#999892]">Min. {item.minStock}</p></td><td className="px-3 py-3.5"><StockBadge state={state} /></td><td className="px-5 py-3.5 text-right">{canCreatePR(profile.role) && <button onClick={onOpenCreatePR} className="rounded-lg border border-[#dad8d1] px-2.5 py-1.5 font-semibold text-[#444] hover:border-[#82dd70]">Buat PR</button>}</td></tr>; })}</tbody></table></div>
          <div className="divide-y divide-[#efede8] md:hidden">{lowStockItems.slice(0, 6).map((item) => { const state = item.currentStock <= 0 ? 'Kosong' : item.currentStock <= item.minStock * .5 ? 'Sekarat' : 'Menipis'; return <article key={item.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><StockBadge state={state} /><span className="truncate font-mono text-[10px] text-[#92918b]">{item.sku}</span></div><h4 className="truncate text-sm font-semibold text-[#30302f]">{item.name}</h4><p className="mt-1 text-[11px] text-[#85847e]">{item.warehouseLocation} · Min. {item.minStock} {item.unit}</p></div><div className="text-right"><p className="text-lg font-semibold tabular-nums text-[#2f2f2e]">{item.currentStock}</p><p className="text-[10px] text-[#8a8983]">{item.unit}</p></div></div>{canCreatePR(profile.role) && <button onClick={onOpenCreatePR} className="mt-3 min-h-10 w-full rounded-xl border border-[#dfddd7] bg-[#faf9f6] text-xs font-semibold text-[#3d3d3b]">Tambahkan ke PR</button>}</article>; })}</div>
        </>}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-[#e5e3dd] bg-white p-4 shadow-[0_8px_24px_rgba(35,35,30,.05)] sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[#2d2d2c]">Kerjakan lebih dulu</h3><p className="text-[11px] text-[#85847e]">Antrean berdasarkan urgensi</p></div><span className="rounded-lg bg-[#f0efeb] px-2 py-1 text-[10px] font-bold text-[#666]">{pendingPRs.length + lowStockItems.length}</span></div>
          <div className="space-y-2">
            {emptyItems.length > 0 && <ActionRow tone="red" title={`${emptyItems.length} barang kosong`} note="Buat permintaan pembelian" onClick={() => setActiveTab('warehouse')} />}
            {pendingPRs.length > 0 && <ActionRow tone="amber" title={`${pendingPRs.length} PR menunggu approval`} note="Tinjau nilai dan kebutuhan" onClick={() => setActiveTab('requisitions')} />}
            {activePOs.length > 0 && <ActionRow tone="blue" title={`${activePOs.length} PO masih berjalan`} note="Periksa jadwal penerimaan" onClick={() => setActiveTab('purchase_orders')} />}
            {!emptyItems.length && !pendingPRs.length && !activePOs.length && <div className="rounded-xl bg-[#e8f7e4] p-3 text-xs font-medium text-[#356d2f]">Tidak ada pekerjaan kritis saat ini.</div>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {canCreatePO(profile.role) && <button onClick={onOpenCreatePO} className="min-h-10 rounded-xl border border-[#dfddd7] text-xs font-semibold text-[#444]">Buat PO</button>}
            {canReceiveGoods(profile.role) && <button onClick={onOpenCreateGRN} className="min-h-10 rounded-xl border border-[#dfddd7] text-xs font-semibold text-[#444]">Terima barang</button>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e5e3dd] bg-white p-4 shadow-[0_8px_24px_rgba(35,35,30,.05)] sm:p-5">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e5f6e1] text-[#397c31]"><Database className="h-[18px] w-[18px]" /></span><div><p className="text-[11px] text-[#85847e]">Nilai aset gudang</p><p className="text-lg font-semibold tracking-tight text-[#292929]">{formatRupiah(getInventoryAssetValue())}</p></div></div>
          <div className="mt-4"><div className="flex items-center justify-between text-[11px]"><span className="text-[#77766f]">Kesehatan stok</span><strong className="text-[#397c31]">{stockHealth}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ecebe7]"><div className="h-full rounded-full bg-[#72d462]" style={{ width: `${stockHealth}%` }} /></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-[#faf9f6] p-2.5"><p className="text-lg font-semibold text-[#333]">{items.length}</p><p className="text-[10px] text-[#85847e]">Total SKU</p></div><div className="rounded-xl bg-[#faf9f6] p-2.5"><p className="text-lg font-semibold text-[#333]">{suppliers.filter((supplier) => supplier.isActive).length}</p><p className="text-[10px] text-[#85847e]">Supplier aktif</p></div></div>
        </section>
      </aside>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ListPanel icon={ShoppingCart} title="Purchase order berjalan" note="Status pengiriman dari supplier" action="Kelola PO" onAction={() => setActiveTab('purchase_orders')}>
        {activePOs.length === 0 ? <MiniEmpty text="Belum ada PO aktif." /> : activePOs.slice(0, 4).map((po) => { const badge = getPOStatusBadge(po.status); const total = po.items.reduce((sum, item) => sum + item.quantity, 0); const received = po.items.reduce((sum, item) => sum + item.receivedQuantity, 0); const progress = Math.min(100, Math.round((received / Math.max(total, 1)) * 100)); return <button key={po.id} onClick={() => setActiveTab('purchase_orders')} className="block w-full border-b border-[#efede8] px-4 py-3 text-left last:border-0 hover:bg-[#fbfaf7]"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#333]">{po.poNumber} · {po.supplierName}</p><p className="mt-1 text-[10px] text-[#85847e]">Tiba {formatDate(po.expectedDeliveryDate)} · {formatRupiah(po.grandTotal)}</p></div><span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-semibold ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ecebe7]"><div className="h-full rounded-full bg-[#72d462]" style={{ width: `${progress}%` }} /></div></button>; })}
      </ListPanel>

      <ListPanel icon={Truck} title="Penerimaan terbaru" note="Barang yang baru masuk gudang" action="Lihat GRN" onAction={() => setActiveTab('goods_receipts')}>
        {recentGRNs.length === 0 ? <MiniEmpty text="Belum ada penerimaan barang." /> : recentGRNs.map((grn) => <button key={grn.id} onClick={() => setActiveTab('goods_receipts')} className="flex w-full items-center gap-3 border-b border-[#efede8] px-4 py-3 text-left last:border-0 hover:bg-[#fbfaf7]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f7e4] text-[#397c31]"><PackageCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#333]">{grn.grnNumber} · {grn.supplierName}</p><p className="mt-1 text-[10px] text-[#85847e]">{formatDate(grn.receiveDate)} · {grn.totalItemsReceived} unit diterima</p></div><span className="rounded-md bg-[#e8f7e4] px-2 py-1 text-[9px] font-semibold text-[#397c31]">{grn.status}</span></button>)}
      </ListPanel>
    </section>

    <section className="flex items-start gap-3 rounded-2xl border border-[#d9ead5] bg-[#edf8ea] p-4 text-[#315e2d]"><Sparkles className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-xs font-semibold">Insight operasional</p><p className="mt-1 text-[11px] leading-relaxed sm:text-xs">{lowStockItems.length ? `${lowStockItems.length} SKU berada di bawah batas minimum. Buat PR dari daftar risiko untuk mencegah stok kosong berulang.` : 'Seluruh stok berada di atas batas minimum. Fokuskan tim pada penyelesaian PO dan penerimaan yang masih berjalan.'}</p></div></section>
  </div>;
};

const TONES = {
  blue: ['bg-[#eaf1ff]', 'text-[#3974d9]'], violet: ['bg-[#f0e8ff]', 'text-[#7b56b3]'], amber: ['bg-[#fff2d8]', 'text-[#b97813]'], red: ['bg-[#ffe7e4]', 'text-[#c9504a]'], green: ['bg-[#e5f6e1]', 'text-[#397c31]'],
} as const;

function Metric({ icon: Icon, label, value, note, tone, onClick }: { icon: React.FC<{ className?: string }>; label: string; value: string; note: string; tone: keyof typeof TONES; onClick?: () => void }) {
  return <button onClick={onClick} disabled={!onClick} className="min-w-0 border-b border-r border-[#ebe9e4] p-3 text-left transition last:border-r-0 hover:bg-[#fbfaf7] disabled:cursor-default sm:p-4 lg:border-b-0"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] font-medium text-[#85847e] sm:text-[11px]">{label}</p><p className="mt-1 truncate text-base font-semibold tracking-tight text-[#2d2d2c] sm:text-xl">{value}</p></div><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONES[tone][0]} ${TONES[tone][1]}`}><Icon className="h-4 w-4" /></span></div><p className={`mt-2 truncate text-[10px] font-medium ${TONES[tone][1]}`}>{note}</p></button>;
}

function StockBadge({ state }: { state: string }) { const style = state === 'Kosong' ? 'bg-[#ffe7e4] text-[#bd4943]' : state === 'Sekarat' ? 'bg-[#fff0df] text-[#bb661c]' : 'bg-[#fff6d9] text-[#9a7317]'; return <span className={`inline-flex rounded-md px-2 py-1 text-[9px] font-semibold ${style}`}>{state}</span>; }
function ActionRow({ tone, title, note, onClick }: { tone: 'red' | 'amber' | 'blue'; title: string; note: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-[#ebe9e4] p-3 text-left hover:bg-[#fbfaf7]"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone === 'red' ? 'bg-[#e25f57]' : tone === 'amber' ? 'bg-[#daa13c]' : 'bg-[#4f82dc]'}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-[#3a3a38]">{title}</strong><span className="mt-0.5 block truncate text-[10px] text-[#85847e]">{note}</span></span><ArrowRight className="h-3.5 w-3.5 text-[#aaa9a2]" /></button>; }
function EmptyState() { return <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-[#65bd57]" /><p className="mt-2 text-sm font-semibold text-[#3c3c3a]">Stok dalam batas aman</p><p className="mt-1 text-xs text-[#85847e]">Belum ada SKU di bawah stok minimum.</p></div>; }
function MiniEmpty({ text }: { text: string }) { return <p className="p-8 text-center text-xs text-[#85847e]">{text}</p>; }
function ListPanel({ icon: Icon, title, note, action, onAction, children }: { icon: React.FC<{ className?: string }>; title: string; note: string; action: string; onAction: () => void; children: React.ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-[#e5e3dd] bg-white shadow-[0_8px_24px_rgba(35,35,30,.05)]"><header className="flex items-center justify-between border-b border-[#eceae5] p-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0efeb] text-[#555]"><Icon className="h-4 w-4" /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#333]">{title}</h3><p className="truncate text-[10px] text-[#85847e]">{note}</p></div></div><button onClick={onAction} className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#397c31]">{action}<ArrowRight className="h-3.5 w-3.5" /></button></header>{children}</section>; }
