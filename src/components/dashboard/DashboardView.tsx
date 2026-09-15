import React from 'react';
import {
  Package,
  ShoppingCart,
  FileText,
  Truck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Database,
  Building2,
  Plus,
  QrCode,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { formatRupiah, formatDate, getPRStatusBadge, getPOStatusBadge } from '../../utils/formatters';
import { useAuth } from '../auth/AuthContext';
import { canCreatePO, canCreatePR, canReceiveGoods } from '../../lib/permissions';

interface DashboardViewProps {
  onOpenCreatePR: () => void;
  onOpenCreatePO: () => void;
  onOpenCreateGRN: () => void;
  onOpenScanQR?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenCreatePR,
  onOpenCreatePO,
  onOpenCreateGRN,
  onOpenScanQR,
}) => {
  const { profile } = useAuth();
  const {
    items,
    suppliers,
    requisitions,
    purchaseOrders,
    goodsReceipts,
    setActiveTab,
    getLowStockItems,
    getPendingPRsCount,
    getActivePOsCount,
    getTotalMonthlySpend,
    getInventoryAssetValue,
  } = usePurchasing();

  const lowStockItems = getLowStockItems();
  const pendingPRs = requisitions.filter((pr) => pr.status === 'menunggu_persetujuan');
  const activePOs = purchaseOrders.filter(
    (po) => po.status === 'diterbitkan' || po.status === 'terkirim' || po.status === 'diterima_sebagian'
  );
  const recentGRNs = goodsReceipts.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-7 shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Kiri Purchasing Portal
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">Tahun Anggaran 2026</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
            Pusat Pengadaan & Logistik Gudang
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Kelola alur pengadaan barang mulai dari permintaan (PR), penerbitan PO ke supplier, pemeriksaan surat jalan penerimaan (GRN), hingga pelacakan stok rak dengan QR Scan.
          </p>
        </div>

        {/* Action Shortcuts (Grid on mobile for full width thumb reach) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 shrink-0">
          {onOpenScanQR && (
            <button
              onClick={onOpenScanQR}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs transition min-h-[42px]"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Rak</span>
            </button>
          )}
          {canCreatePR(profile.role) && <button
            onClick={onOpenCreatePR}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold rounded-lg shadow-2xs transition min-h-[42px]"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Buat Permintaan (PR)
          </button>}
          {canCreatePO(profile.role) && <button
            onClick={onOpenCreatePO}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition min-h-[42px]"
          >
            <ShoppingCart className="w-4 h-4 text-slate-600" />
            Terbitkan PO
          </button>}
          {canReceiveGoods(profile.role) && <button
            onClick={onOpenCreateGRN}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition min-h-[42px]"
          >
            <Truck className="w-4 h-4 text-slate-600" />
            Penerimaan Barang
          </button>}
        </div>
      </div>

      {/* KPI Stats Grid: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Spend */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Belanja</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {formatRupiah(getTotalMonthlySpend())}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 truncate">
              <span className="text-emerald-600 font-semibold">{purchaseOrders.length} Pesanan</span> tercatat
            </p>
          </div>
        </div>

        {/* Pending PRs */}
        <div
          onClick={() => setActiveTab('requisitions')}
          className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-amber-300 active:bg-amber-50/30 cursor-pointer transition select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">PR Pending</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">
              {getPendingPRsCount()} <span className="text-xs font-normal text-slate-500">PR</span>
            </div>
            <p className="text-[10px] sm:text-xs text-amber-600 font-medium mt-0.5 sm:mt-1 truncate">
              {pendingPRs.length > 0 ? 'Perlu review' : 'Semua beres'}
            </p>
          </div>
        </div>

        {/* Active POs */}
        <div
          onClick={() => setActiveTab('purchase_orders')}
          className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 active:bg-indigo-50/30 cursor-pointer transition select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Aktif</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">
              {getActivePOsCount()} <span className="text-xs font-normal text-slate-500">PO</span>
            </div>
            <p className="text-[10px] sm:text-xs text-sky-600 font-medium mt-0.5 sm:mt-1 truncate">
              Menunggu kirim
            </p>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setActiveTab('warehouse')}
          className={`p-3.5 sm:p-5 rounded-xl border shadow-xs cursor-pointer active:scale-[0.99] transition select-none ${
            lowStockItems.length > 0
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Kritis</span>
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${
              lowStockItems.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className={`text-base sm:text-2xl font-bold tracking-tight ${lowStockItems.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {lowStockItems.length} <span className="text-xs font-normal text-slate-500">SKU</span>
            </div>
            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium truncate ${lowStockItems.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowStockItems.length > 0 ? 'Perlu reorder' : 'Batas aman'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Low Stock Alert */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Peringatan Stok di Bawah Minimum</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">Re-Order Point (ROP)</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('warehouse')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 whitespace-nowrap p-1"
            >
              Gudang <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Semua stok barang gudang dalam kondisi aman di atas batas minimum.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-4 font-semibold">SKU & Nama Barang</th>
                    <th className="py-2.5 px-3 font-semibold">Kategori</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Stok Saat Ini</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Min. Safety</th>
                    <th className="py-2.5 px-3 font-semibold">Lokasi Rak</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-semibold text-slate-500 block">{item.sku}</span>
                        <span className="font-semibold text-slate-900 text-xs">{item.name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{item.category}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">{item.warehouseLocation}</td>
                      <td className="py-3 px-4 text-right">
                        {canCreatePR(profile.role) && <button
                          onClick={onOpenCreatePR}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                        >
                          + Buat PR
                        </button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden p-3 divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                Semua stok gudang dalam batas aman.
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.sku}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{item.warehouseLocation}</span>
                    </div>
                    <p className="font-semibold text-xs text-slate-900 mt-1 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                        Sisa: {item.currentStock} {item.unit}
                      </span>
                      <span className="text-slate-400">Min: {item.minStock}</span>
                    </div>
                  </div>

                  {canCreatePR(profile.role) && <button
                    onClick={onOpenCreatePR}
                    className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 active:bg-emerald-700 text-white rounded-lg shadow-2xs shrink-0 min-h-[36px]"
                  >
                    + PR
                  </button>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Pending PR Approvals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Permintaan (PR) Terbaru</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">Antrean review & PO</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('requisitions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0 whitespace-nowrap p-1"
            >
              Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto max-h-[340px] sm:max-h-[380px]">
            {requisitions.slice(0, 4).map((pr) => {
              const badge = getPRStatusBadge(pr.status);
              return (
                <div
                  key={pr.id}
                  onClick={() => setActiveTab('requisitions')}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 active:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-slate-800">{pr.prNumber}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 truncate">{pr.purpose}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span className="truncate max-w-[140px]">{pr.department}</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(pr.totalEstimatedAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Active PO Status & Recent GRNs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active POs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Purchase Order (PO) Berjalan</h3>
                <p className="text-xs text-slate-500">Monitoring pengiriman barang dari vendor</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('purchase_orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Kelola PO <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {activePOs.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Tidak ada PO yang sedang aktif saat ini.</p>
            ) : (
              activePOs.map((po) => {
                const totalQty = po.items.reduce((s, i) => s + i.quantity, 0);
                const receivedQty = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
                const percent = Math.min(100, Math.round((receivedQty / (totalQty || 1)) * 100));

                return (
                  <div
                    key={po.id}
                    onClick={() => setActiveTab('purchase_orders')}
                    className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-800">{po.poNumber}</span>
                        <span className="text-xs text-slate-500 ml-2">• {po.supplierName}</span>
                      </div>
                      <span className="font-semibold text-xs text-slate-900">{formatRupiah(po.grandTotal)}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Penerimaan Barang ({receivedQty} / {totalQty} unit)</span>
                        <span className="font-semibold text-slate-700">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Goods Receipts (GRN) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Penerimaan Barang Terakhir</h3>
                <p className="text-xs text-slate-500">Bukti barang masuk gudang (GRN)</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('goods_receipts')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              Lihat Penerimaan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {recentGRNs.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Belum ada catatan penerimaan barang.</p>
            ) : (
              recentGRNs.map((grn) => (
                <div
                  key={grn.id}
                  onClick={() => setActiveTab('goods_receipts')}
                  className="p-3.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">{grn.grnNumber}</span>
                      <span className="text-xs text-slate-500 ml-2">Ref: {grn.poNumber}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{formatDate(grn.receiveDate)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-700 font-medium">{grn.supplierName}</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-semibold">
                      +{grn.totalItemsReceived} Unit Diterima
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
