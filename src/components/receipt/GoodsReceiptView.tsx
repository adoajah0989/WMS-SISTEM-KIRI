import { NumberInput } from '../common/NumberInput';
import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Printer,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  User,
  MapPin,
  FileCheck,
  Layers,
  ArrowRight,
  Download,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { GoodsReceipt, GRNItem, PurchaseOrder, StockCondition } from '../../types';
import {
  formatDate,
  formatDateTime,
  getConditionBadge,
} from '../../utils/formatters';
import { exportGoodsReceiptsCSV } from '../../utils/exportImport';
import { GRNPrintModal } from '../common/PrintTemplates';

interface GoodsReceiptViewProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  preselectedPO: PurchaseOrder | null;
  setPreselectedPO: (po: PurchaseOrder | null) => void;
}

export const GoodsReceiptView: React.FC<GoodsReceiptViewProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  preselectedPO,
  setPreselectedPO,
}) => {
  const {
    goodsReceipts,
    purchaseOrders,
    items: warehouseItems,
    createGoodsReceipt,
    deleteGRN,
  } = usePurchasing();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null);
  const [printGRN, setPrintGRN] = useState<GoodsReceipt | null>(null);

  // Form State for creating GRN
  const [formPoId, setFormPoId] = useState<string>('');
  const [formDeliveryOrderNo, setFormDeliveryOrderNo] = useState('');
  const [formReceiverName, setFormReceiverName] = useState('Supardi (Staff Inbound Gudang)');
  const [formWarehouseLocation, setFormWarehouseLocation] = useState('Gudang Utama - Inbound Dock A');
  const [formReceiveDate, setFormReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<GRNItem[]>([]);
  const [receiptDetailsOpen, setReceiptDetailsOpen] = useState(false);

  // Eligible POs (POs not yet finished and not cancelled)
  const eligiblePOs = purchaseOrders.filter(
    (po) => po.status !== 'selesai' && po.status !== 'dibatalkan'
  );

  // Effect to load items when selected PO changes
  const handleSelectPO = (poId: string) => {
    setFormPoId(poId);
    const target = purchaseOrders.find((p) => p.id === poId);
    if (!target) {
      setFormItems([]);
      return;
    }

    const itemsForGRN: GRNItem[] = target.items.map((item, idx) => {
      const previouslyReceived = item.receivedQuantity || 0;
      const remaining = Math.max(0, item.quantity - previouslyReceived);
      
      // Match warehouse rack location & conversion
      const wItem = warehouseItems.find((w) => w.id === item.itemId || w.sku === item.sku);
      const ratio = item.conversionRatio || wItem?.conversionRatio || 1;
      const purchaseUnit = item.purchaseUnit || wItem?.purchaseUnit || item.unit;
      const stockUnit = item.stockUnit || wItem?.unit || 'Pcs';

      return {
        id: `grni-${Date.now()}-${idx}`,
        poItemId: item.id,
        itemId: item.itemId || wItem?.id,
        sku: item.sku,
        itemName: item.itemName,
        unit: item.unit,
        purchaseUnit,
        stockUnit,
        conversionRatio: ratio,
        orderedQuantity: item.quantity,
        previouslyReceived,
        remainingQuantity: remaining,
        receivedQuantity: remaining, // default to remaining
        condition: 'baik',
        warehouseLocation: wItem?.warehouseLocation || 'Gudang Utama',
        notes: '',
      };
    });

    setFormItems(itemsForGRN);
  };

  const handleReceiveAllRemaining = () => {
    setFormItems((current) => current.map((item) => ({ ...item, receivedQuantity: item.remainingQuantity, condition: 'baik', notes: '' })));
  };

  // Synchronize when preselectedPO passed from other views
  React.useEffect(() => {
    if (preselectedPO && isCreateModalOpen) {
      handleSelectPO(preselectedPO.id);
    } else if (isCreateModalOpen && eligiblePOs.length > 0 && !formPoId) {
      if (eligiblePOs[0]?.id) {
        handleSelectPO(eligiblePOs[0].id);
      }
    }
  }, [preselectedPO, isCreateModalOpen]);

  const handleUpdateItemField = (index: number, field: keyof GRNItem, value: any) => {
    setFormItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmitGRN = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPO = purchaseOrders.find((p) => p.id === formPoId);
    if (!targetPO) {
      alert('Pilih Purchase Order yang valid.');
      return;
    }
    if (!formDeliveryOrderNo.trim()) {
      alert('Mohon masukkan Nomor Surat Jalan (DO) dari supplier.');
      return;
    }

    const totalQtyToReceive = formItems.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
    if (totalQtyToReceive <= 0) {
      alert('Total barang yang diterima harus lebih dari 0.');
      return;
    }

    createGoodsReceipt({
      poId: targetPO.id,
      poNumber: targetPO.poNumber,
      supplierId: targetPO.supplierId,
      supplierName: targetPO.supplierName,
      deliveryOrderNo: formDeliveryOrderNo,
      receiveDate: formReceiveDate,
      receiverName: formReceiverName,
      warehouseLocation: formWarehouseLocation,
      items: formItems,
      notes: formNotes,
    });

    setIsCreateModalOpen(false);
    setPreselectedPO(null);
    setFormPoId('');
    setFormItems([]);
    setReceiptDetailsOpen(false);
    setFormDeliveryOrderNo('');
    setFormNotes('');
  };

  const filteredGRNs = goodsReceipts.filter((grn) => {
    return (
      searchQuery === '' ||
      grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.deliveryOrderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.items.some((i) => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Penerimaan Barang (GRN)</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-teal-100 text-teal-800">
              Inbound Stok
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pemeriksaan fisik barang datang dari vendor dan pencatatan masuk ke gudang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportGoodsReceiptsCSV(goodsReceipts)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition min-h-[40px]"
            title="Ekspor Seluruh Surat Penerimaan Barang (GRN) ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => {
              setPreselectedPO(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Input GRN</span>
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. GRN, PO, Surat Jalan..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 placeholder-slate-400 h-[38px]"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline ml-3">
          Menampilkan <strong className="text-slate-800">{filteredGRNs.length}</strong> bukti penerimaan
        </span>
      </div>

      {/* Desktop Goods Receipt Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">No. GRN & Tanggal</th>
                <th className="py-3 px-4 font-semibold">Referensi PO & Supplier</th>
                <th className="py-3 px-4 font-semibold">No. Surat Jalan (DO)</th>
                <th className="py-3 px-4 font-semibold">Petugas Penerima</th>
                <th className="py-3 px-4 font-semibold text-center">Total Diterima</th>
                <th className="py-3 px-4 font-semibold text-center">Status Kirim</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGRNs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada riwayat penerimaan barang masuk.
                  </td>
                </tr>
              ) : (
                filteredGRNs.map((grn) => {
                  return (
                    <tr key={grn.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{grn.grnNumber}</span>
                        <span className="text-[11px] text-slate-500">Tgl: {formatDate(grn.receiveDate)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-indigo-700 block">{grn.poNumber}</span>
                        <span className="text-slate-900 font-medium">{grn.supplierName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {grn.deliveryOrderNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {grn.receiverName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          +{grn.totalItemsReceived} Unit
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            grn.status === 'lengkap'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : grn.status === 'ada_reject'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {grn.status === 'lengkap'
                            ? 'Lengkap'
                            : grn.status === 'ada_reject'
                            ? 'Ada Reject'
                            : 'Sebagian'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedGRN(grn)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Lihat Rincian GRN"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintGRN(grn)}
                            className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition"
                            title="Cetak Surat Penerimaan Barang"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Goods Receipt Cards */}
      <div className="md:hidden space-y-3">
        {filteredGRNs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Belum ada riwayat penerimaan barang masuk.</p>
          </div>
        ) : (
          filteredGRNs.map((grn) => {
            return (
              <div
                key={grn.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {grn.grnNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tgl Terima: {formatDate(grn.receiveDate)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      grn.status === 'lengkap'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : grn.status === 'ada_reject'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {grn.status === 'lengkap'
                      ? 'Lengkap'
                      : grn.status === 'ada_reject'
                      ? 'Ada Reject'
                      : 'Sebagian'}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref PO:</span>
                    <span className="font-mono font-bold text-indigo-700">{grn.poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{grn.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Surat Jalan (DO):</span>
                    <span className="font-medium text-slate-700">{grn.deliveryOrderNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Petugas Gudang:</span>
                    <span className="text-slate-700">{grn.receiverName}</span>
                  </div>
                </div>

                {/* Total Received Badge & Actions */}
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                    +{grn.totalItemsReceived} Unit Masuk
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGRN(grn)}
                      className="px-3 py-2 bg-slate-100 active:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 min-h-[38px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detail
                    </button>
                    <button
                      onClick={() => setPrintGRN(grn)}
                      className="px-3 py-2 bg-teal-50 border border-teal-200 active:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold flex items-center gap-1 min-h-[38px]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Input Penerimaan Barang (GRN) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#f8f7f4] rounded-[24px] shadow-xl max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[94vh] border border-white/60">
            <div className="bg-white text-[#292929] px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#e7e5e0]">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#397c31]" />
                <h3 className="font-bold text-sm sm:text-base">Input Penerimaan Barang (GRN)</h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setPreselectedPO(null);
                }}
                className="text-[#85847e] hover:text-[#222] p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGRN} className="p-4 sm:p-6 pb-28 space-y-4 overflow-y-auto">
              {/* Select Target PO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Purchase Order (PO) *
                  </label>
                  <select
                    value={formPoId}
                    onChange={(e) => handleSelectPO(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  >
                    <option value="">-- Pilih PO --</option>
                    {eligiblePOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} - {po.supplierName} ({po.items.length} item)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Surat Jalan Vendor (DO) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDeliveryOrderNo}
                    onChange={(e) => setFormDeliveryOrderNo(e.target.value)}
                    placeholder="Contoh: SJ-2026/08/991"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              {/* Receiver & Location Details */}
              <button type="button" onClick={() => setReceiptDetailsOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#dfddd7] bg-white px-3 text-left text-xs font-semibold text-[#555]"><span>Detail penerimaan <span className="font-normal text-[#92918b]">· tanggal, petugas, lokasi</span></span>{receiptDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
              {receiptDetailsOpen && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[#e4e2dc] bg-white p-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tgl Diterima *
                  </label>
                  <input
                    type="date"
                    required
                    value={formReceiveDate}
                    onChange={(e) => setFormReceiveDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Petugas Penerima *
                  </label>
                  <input
                    type="text"
                    required
                    value={formReceiverName}
                    onChange={(e) => setFormReceiverName(e.target.value)}
                    placeholder="Nama penerima"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Masuk
                  </label>
                  <input
                    type="text"
                    value={formWarehouseLocation}
                    onChange={(e) => setFormWarehouseLocation(e.target.value)}
                    placeholder="Gudang A / Inbound"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>}

              {/* Items Verification Table */}
              <div className="border-t border-slate-200/80 pt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Pemeriksaan Barang PO ({formItems.length} Item)
                  </span>
                  {!!formItems.length && <button type="button" onClick={handleReceiveAllRemaining} className="min-h-9 rounded-xl bg-[#e8f7e4] px-3 text-[11px] font-semibold text-[#397c31]">Terima semua sesuai PO</button>}
                </div>

                {formItems.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Pilih nomor PO di atas untuk memuat daftar barang.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-700">[{item.sku}]</span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.itemName}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Total PO: <strong className="text-slate-800">{item.orderedQuantity} {item.unit}</strong> |
                            Sisa: <strong className="text-amber-700">{item.remainingQuantity} {item.unit}</strong>
                          </div>
                        </div>

                        {/* Input Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Qty Diterima ({item.unit}) *
                            </label>
                            <NumberInput
                              type="number"
                              min="0"
                              max={item.remainingQuantity}
                              value={item.receivedQuantity}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  index,
                                  'receivedQuantity',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-teal-500/40"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Kondisi *
                            </label>
                            <select
                              value={item.condition}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  index,
                                  'condition',
                                  e.target.value as StockCondition
                                )
                              }
                              className={`w-full text-xs font-bold border rounded-lg p-2 bg-white ${
                                item.condition === 'baik'
                                  ? 'text-emerald-700 border-emerald-300'
                                  : 'text-rose-700 border-rose-300'
                              }`}
                            >
                              <option value="baik">Baik / Sesuai</option>
                              <option value="rusak">Rusak / Cacat</option>
                              <option value="kurang">Kurang / Selisih</option>
                            </select>
                          </div>

                          {item.condition !== 'baik' && <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Lokasi Rak
                            </label>
                            <input
                              type="text"
                              value={item.warehouseLocation}
                              onChange={(e) =>
                                handleUpdateItemField(index, 'warehouseLocation', e.target.value)
                              }
                              placeholder="Rak A-01"
                              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                            />
                          </div>}

                          {item.condition !== 'baik' && <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Catatan
                            </label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleUpdateItemField(index, 'notes', e.target.value)}
                              placeholder="Catatan fisik..."
                              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                            />
                          </div>}
                        </div>

                        {/* Unit Conversion Live Calculation */}
                        {item.conversionRatio && item.conversionRatio > 1 && (
                          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-[11px] flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Repeat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              1 {item.unit} = {item.conversionRatio} {item.stockUnit || 'Pcs'}
                            </span>
                            <span>
                              Masuk stok: <strong>{(item.receivedQuantity || 0) * item.conversionRatio} {item.stockUnit || 'Pcs'}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automatic Warehouse Notification */}
              <div className="p-3 bg-teal-50/90 border border-teal-200 rounded-xl flex items-center gap-2 text-xs text-teal-800">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <p className="text-xs text-teal-800">
                  Item berstatus <strong>"Baik"</strong> otomatis menambah stok gudang dan mencatat mutasi masuk.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="sticky -bottom-6 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t border-[#e3e1da] bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(35,35,30,.08)] backdrop-blur-lg sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setPreselectedPO(null);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl shadow-xs transition"
                >
                  Simpan & Masukkan ke Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail GRN */}
      {selectedGRN && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base">Detail Penerimaan Barang: {selectedGRN.grnNumber}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintGRN(selectedGRN)}
                  className="flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / PDF
                </button>
                <button
                  onClick={() => setSelectedGRN(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5">Supplier:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedGRN.supplierName}</span>
                  <p className="text-slate-600 mt-1">Ref PO: <span className="font-mono font-bold text-indigo-700">{selectedGRN.poNumber}</span></p>
                  <p className="text-slate-600">No. Surat Jalan: <span className="font-semibold text-slate-800">{selectedGRN.deliveryOrderNo}</span></p>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Penerimaan Gudang:</span>
                  <p className="text-slate-700 font-semibold">{selectedGRN.warehouseLocation}</p>
                  <p className="text-slate-600 mt-1">Petugas Penerima: <span className="font-semibold">{selectedGRN.receiverName}</span></p>
                  <p className="text-slate-600">Tanggal Terima: <span className="font-semibold">{formatDate(selectedGRN.receiveDate)}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="font-bold text-slate-700 block mb-2">Item Barang yang Diterima:</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">SKU & Nama Barang</th>
                        <th className="p-2.5 text-center">Qty Dipesan</th>
                        <th className="p-2.5 text-center">Qty Diterima</th>
                        <th className="p-2.5 text-center">Kondisi</th>
                        <th className="p-2.5">Lokasi Rak / Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGRN.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-2.5 text-slate-500">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block">{item.itemName}</span>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                          </td>
                          <td className="p-2.5 text-center font-semibold text-slate-600">
                            <div>
                              <span>{item.orderedQuantity} {item.unit}</span>
                              {item.conversionRatio && item.conversionRatio > 1 && (
                                <span className="block text-[10px] text-slate-400">
                                  ({item.orderedQuantity * item.conversionRatio} {item.stockUnit || 'Pcs'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            <div>
                              <span>{item.receivedQuantity} {item.unit}</span>
                              {item.conversionRatio && item.conversionRatio > 1 && (
                                <span className="block text-[10px] text-emerald-600 font-semibold">
                                  (+{item.receivedQuantity * item.conversionRatio} {item.stockUnit || 'Pcs'} gudang)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.condition === 'baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.condition.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            <span className="font-semibold text-slate-800">[{item.warehouseLocation}]</span> {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedGRN(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-lg hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print GRN Modal */}
      {printGRN && <GRNPrintModal grn={printGRN} onClose={() => setPrintGRN(null)} />}
    </div>
  );
};
