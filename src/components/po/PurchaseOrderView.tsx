import { NumberInput } from '../common/NumberInput';
import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Printer,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Building,
  Calendar,
  FileText,
  DollarSign,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  Package,
  Download,
  Repeat,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { PurchaseOrder, POItem, POStatus, PaymentTerm, PurchaseRequisition } from '../../types';
import {
  formatRupiah,
  formatDate,
  getPOStatusBadge,
  getPaymentTermLabel,
} from '../../utils/formatters';
import { exportPurchaseOrdersCSV } from '../../utils/exportImport';
import { POPrintModal } from '../common/PrintTemplates';

interface PurchaseOrderViewProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  prefilledPR: PurchaseRequisition | null;
  setPrefilledPR: (pr: PurchaseRequisition | null) => void;
  onOpenCreateGRNForPO: (po: PurchaseOrder) => void;
}

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  prefilledPR,
  setPrefilledPR,
  onOpenCreateGRNForPO,
}) => {
  const {
    purchaseOrders,
    suppliers,
    items: warehouseItems,
    createPO,
    addQuickSupplier,
    updatePOStatus,
    deletePO,
    requisitions,
  } = usePurchasing();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);

  // Form State for creating PO
  const [formSupplierId, setFormSupplierId] = useState<string>(() => suppliers[0]?.id || 'custom');
  const [customSupplierName, setCustomSupplierName] = useState<string>('');
  const [formExpectedDate, setFormExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formPaymentTerm, setFormPaymentTerm] = useState<PaymentTerm>('net_30');
  const [formPpnPercent, setFormPpnPercent] = useState<number>(11);
  const [formShippingFee, setFormShippingFee] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formTerms, setFormTerms] = useState(
    '1. Barang harus sesuai dengan spesifikasi dan standar mutu.\n2. Pembayaran via transfer bank sesuai tempo yang disepakati.\n3. Barang cacat fisik saat penerimaan wajib diganti baru.'
  );

  // Collapsible toggle for advanced optional settings
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const approvedPRs = requisitions.filter((pr) => pr.status === 'disetujui' && pr.pricingStatus === 'harga_diterima');
  const [sourceMode, setSourceMode] = useState<'pr' | 'direct'>('pr');
  const [sourcePRId, setSourcePRId] = useState('');
  const [itemSearchQueries, setItemSearchQueries] = useState<Record<string, string>>({});
  const [activeItemSearchId, setActiveItemSearchId] = useState<string | null>(null);

  const [formItems, setFormItems] = useState<POItem[]>([
    {
      id: `poi-${Date.now()}`,
      sku: 'ITEM-1',
      itemName: '',
      unit: 'Pcs',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      subtotal: 0,
      receivedQuantity: 0,
    },
  ]);

  // Keep formSupplierId in sync if suppliers change
  React.useEffect(() => {
    if (suppliers.length > 0 && formSupplierId === 'custom' && !customSupplierName) {
      if (suppliers[0]?.id) {
        setFormSupplierId(suppliers[0].id);
      }
    }
  }, [suppliers]);

  // Effect to load prefilled PR when modal opens via "Terbitkan PO"
  React.useEffect(() => {
    if (prefilledPR && isCreateModalOpen) {
      const itemsMapped: POItem[] = prefilledPR.items.map((item, idx) => {
        const stockItem = warehouseItems.find((candidate) => candidate.id === item.itemId || candidate.sku === item.sku);
        const unit = item.unit || stockItem?.purchaseUnit || stockItem?.unit || 'Pcs';
        return {
          id: `poi-${Date.now()}-${idx}`,
          itemId: item.itemId || stockItem?.id,
          sku: item.sku || stockItem?.sku || `ITEM-${idx + 1}`,
          itemName: item.itemName,
          unit,
          purchaseUnit: unit,
          stockUnit: item.stockUnit || stockItem?.unit || unit,
          conversionRatio: item.conversionRatio || stockItem?.conversionRatio || 1,
          quantity: item.quantity,
          unitPrice: item.estimatedUnitPrice || 0,
          discountPercent: 0,
          subtotal: item.quantity * (item.estimatedUnitPrice || 0),
          receivedQuantity: 0,
        };
      });
      setFormItems(itemsMapped);
      setSourceMode('pr');
      setSourcePRId(prefilledPR.id);
      if (prefilledPR.quotedSupplierId) setFormSupplierId(prefilledPR.quotedSupplierId);
      setFormExpectedDate(prefilledPR.requiredDate);
      setFormNotes(`Diterbitkan atas dasar pengajuan ${prefilledPR.prNumber} (${prefilledPR.department}). Keperluan: ${prefilledPR.purpose}`);
    }
  }, [prefilledPR, isCreateModalOpen]);

  const handleSelectSourcePR = (prId: string) => {
    setSourcePRId(prId);
    const selected = approvedPRs.find((pr) => pr.id === prId) || null;
    setPrefilledPR(selected);
  };

  // Calculations
  const calculatedSubtotal = formItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const calculatedPpnAmount = (calculatedSubtotal * (formPpnPercent || 0)) / 100;
  const calculatedGrandTotal = calculatedSubtotal + calculatedPpnAmount + (formShippingFee || 0);

  // Filtered POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchSearch =
      searchQuery === '' ||
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.items.some((i) => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      {
        id: `poi-${Date.now()}-${prev.length}`,
        sku: `ITEM-${prev.length + 1}`,
        itemName: '',
        unit: 'Dus',
        purchaseUnit: 'Dus',
        stockUnit: 'Pcs',
        conversionRatio: 1,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        subtotal: 0,
        receivedQuantity: 0,
      },
    ]);
  };

  const handleSelectWarehouseItem = (index: number, itemId: string) => {
    const selected = warehouseItems.find((w) => w.id === itemId);
    if (!selected) return;

    setFormItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const orderUnit = selected.purchaseUnit || selected.unit || 'Pcs';
        const stockUnit = selected.unit || 'Pcs';
        const ratio = selected.conversionRatio || 1;
        const price = selected.lastPurchasePrice || 0;
        const subtotal = item.quantity * price;
        return {
          ...item,
          itemId: selected.id,
          sku: selected.sku,
          itemName: selected.name,
          unit: orderUnit,
          purchaseUnit: orderUnit,
          stockUnit: stockUnit,
          conversionRatio: ratio,
          unitPrice: price,
          subtotal,
        };
      })
    );
  };

  const handleUpdateItemField = (index: number, field: keyof POItem, value: any) => {
    setFormItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        // recalculate subtotal
        const qty = field === 'quantity' ? value : updated.quantity;
        const price = field === 'unitPrice' ? value : updated.unitPrice;
        const disc = field === 'discountPercent' ? value : updated.discountPercent;
        const gross = (qty || 0) * (price || 0);
        const subtotal = gross - (gross * (disc || 0)) / 100;
        return { ...updated, subtotal };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceMode === 'pr' && !prefilledPR) {
      alert('Pilih PR yang sudah disetujui sebagai sumber PO. Gunakan PO langsung hanya untuk kebutuhan tanpa PR.');
      return;
    }

    let targetSupplier = suppliers.find((s) => s.id === formSupplierId);

    // If custom supplier name typed or no suppliers exist
    if (!targetSupplier || formSupplierId === 'custom') {
      const nameToUse = customSupplierName.trim();
      if (!nameToUse) {
        alert('Silakan masukkan nama supplier / vendor.');
        return;
      }
      targetSupplier = addQuickSupplier(nameToUse);
    }

    if (formItems.some((i) => !i.itemName.trim() || i.quantity <= 0)) {
      alert('Semua baris barang harus diisi nama dan jumlah (kuantitas) minimal 1.');
      return;
    }

    // Auto assign SKUs if empty
    const sanitizedItems: POItem[] = formItems.map((item, idx) => {
      const orderUnit = item.unit?.trim() || 'Pcs';
      const stockUnit = item.stockUnit?.trim() || orderUnit;
      const ratio = item.conversionRatio && item.conversionRatio > 0 ? item.conversionRatio : 1;
      return {
        ...item,
        sku: item.sku?.trim() || `ITEM-${String(idx + 1).padStart(3, '0')}`,
        unit: orderUnit,
        purchaseUnit: item.purchaseUnit?.trim() || orderUnit,
        stockUnit,
        conversionRatio: ratio,
        discountPercent: item.discountPercent || 0,
        receivedQuantity: 0,
      };
    });

    createPO({
      prId: prefilledPR?.id,
      prNumber: prefilledPR?.prNumber,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      supplierAddress: targetSupplier.address || 'Alamat Vendor',
      supplierPhone: targetSupplier.phone || '-',
      supplierEmail: targetSupplier.email || '-',
      supplierContactPerson: targetSupplier.contactPerson || 'PIC Vendor',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: formExpectedDate,
      paymentTerm: formPaymentTerm,
      items: sanitizedItems,
      subtotal: calculatedSubtotal,
      ppnPercent: formPpnPercent,
      ppnAmount: calculatedPpnAmount,
      shippingFee: formShippingFee,
      grandTotal: calculatedGrandTotal,
      status: 'diterbitkan',
      notes: formNotes,
      termsAndConditions: formTerms,
      approvedBy: 'Manajer Purchasing & Logistik',
      issuedBy: 'Admin Kiri Purchasing',
    });

    setIsCreateModalOpen(false);
    setPrefilledPR(null);
    setSourcePRId('');
    setSourceMode('pr');
    // Reset basic item list for next open
    setFormItems([
      {
        id: `poi-${Date.now()}`,
        sku: 'ITEM-1',
        itemName: '',
        unit: 'Dus',
        purchaseUnit: 'Dus',
        stockUnit: 'Pcs',
        conversionRatio: 1,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        subtotal: 0,
        receivedQuantity: 0,
      },
    ]);
    setCustomSupplierName('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Purchase Order (PO)</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-100 text-indigo-800">
              Pesanan Pembelian
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Penerbitan surat pesanan resmi ke supplier dan pelacakan status pengiriman.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPurchaseOrdersCSV(purchaseOrders)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs transition min-h-[40px]"
            title="Ekspor Seluruh Purchase Order ke File CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => {
              setPrefilledPR(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Terbitkan PO</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs -mx-1 px-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'diterbitkan', label: 'Diterbitkan' },
              { id: 'terkirim', label: 'Terkirim' },
              { id: 'diterima_sebagian', label: 'Diterima Sebagian' },
              { id: 'selesai', label: 'Selesai' },
              { id: 'dibatalkan', label: 'Dibatalkan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition min-h-[36px] ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no PO / nama vendor..."
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder-slate-400 h-[38px]"
            />
          </div>
        </div>
      </div>

      {/* Desktop PO Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">No. PO & Tanggal</th>
                <th className="py-3 px-4 font-semibold">Supplier / Vendor</th>
                <th className="py-3 px-4 font-semibold">Tgl Pengiriman</th>
                <th className="py-3 px-4 font-semibold">Syarat Bayar</th>
                <th className="py-3 px-4 font-semibold text-center">Progress Terima</th>
                <th className="py-3 px-4 font-semibold text-right">Total Nilai PO</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada Purchase Order (PO) yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const statusBadge = getPOStatusBadge(po.status);
                  const totalOrdered = po.items.reduce((s, i) => s + i.quantity, 0);
                  const totalReceived = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
                  const percentReceived = Math.min(100, Math.round((totalReceived / (totalOrdered || 1)) * 100));

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{po.poNumber}</span>
                        <span className="text-[11px] text-slate-500">Tgl: {formatDate(po.orderDate)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{po.supplierName}</span>
                        <span className="text-[11px] text-slate-500">PIC: {po.supplierContactPerson || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {formatDate(po.expectedDeliveryDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                          {getPaymentTermLabel(po.paymentTerm)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-32 mx-auto">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{totalReceived}/{totalOrdered} unit</span>
                            <span className="font-bold">{percentReceived}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentReceived === 100
                                  ? 'bg-emerald-500'
                                  : percentReceived > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${percentReceived}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(po.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail PO */}
                          <button
                            onClick={() => setSelectedPO(po)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Lihat Detail PO"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print PDF */}
                          <button
                            onClick={() => setPrintPO(po)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                            title="Cetak Purchase Order / PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Action to receive goods if PO is active */}
                          {po.status !== 'selesai' && po.status !== 'dibatalkan' && (
                            <button
                              onClick={() => onOpenCreateGRNForPO(po)}
                              className="px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg transition flex items-center gap-1"
                              title="Proses Penerimaan Barang Gudang (GRN)"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Terima
                            </button>
                          )}
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

      {/* Mobile PO Cards List */}
      <div className="md:hidden space-y-3">
        {filteredPOs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Belum ada Purchase Order (PO) yang sesuai.</p>
          </div>
        ) : (
          filteredPOs.map((po) => {
            const statusBadge = getPOStatusBadge(po.status);
            const totalOrdered = po.items.reduce((s, i) => s + i.quantity, 0);
            const totalReceived = po.items.reduce((s, i) => s + (i.receivedQuantity || 0), 0);
            const percentReceived = Math.min(100, Math.round((totalReceived / (totalOrdered || 1)) * 100));

            return (
              <div
                key={po.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {po.poNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tgl: {formatDate(po.orderDate)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Supplier & Delivery */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs truncate max-w-[200px]">{po.supplierName}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                      {getPaymentTermLabel(po.paymentTerm)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Target Kirim: {formatDate(po.expectedDeliveryDate)}</span>
                    {po.prNumber && <span className="font-mono text-slate-400">PR: {po.prNumber}</span>}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="bg-slate-50 p-2.5 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Penerimaan: {totalReceived}/{totalOrdered} unit
                    </span>
                    <span className="font-bold text-slate-800">{percentReceived}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percentReceived === 100
                          ? 'bg-emerald-500'
                          : percentReceived > 0
                          ? 'bg-indigo-600'
                          : 'bg-slate-300'
                      }`}
                      style={{ width: `${percentReceived}%` }}
                    />
                  </div>
                </div>

                {/* Total Value */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">Total Tagihan (Grand Total):</span>
                  <span className="font-bold text-slate-900 text-sm">{formatRupiah(po.grandTotal)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelectedPO(po)}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>

                  <button
                    onClick={() => setPrintPO(po)}
                    className="py-2.5 px-3 bg-indigo-50 border border-indigo-200 text-indigo-700 active:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    PDF
                  </button>

                  {po.status !== 'selesai' && po.status !== 'dibatalkan' && (
                    <button
                      onClick={() => onOpenCreateGRNForPO(po)}
                      className="flex-1 py-2.5 px-3 bg-teal-600 active:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px] shadow-2xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Terima GRN
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Buat PO Baru (Simple & Streamlined) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm sm:text-base">
                  {prefilledPR ? `Terbitkan PO (${prefilledPR.prNumber})` : 'Terbitkan PO Baru'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setPrefilledPR(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPO} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <section className="rounded-2xl border border-[#dfddd7] bg-[#faf9f6] p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-bold text-[#333]">Sumber purchase order</p><p className="mt-0.5 text-[10px] text-[#85847e]">Gunakan PR agar barang dan qty terisi otomatis.</p></div>
                  <div className="flex rounded-xl border border-[#dfddd7] bg-white p-1">
                    <button type="button" onClick={() => setSourceMode('pr')} className={`min-h-9 rounded-lg px-3 text-[11px] font-semibold ${sourceMode === 'pr' ? 'bg-[#252525] text-white' : 'text-[#666]'}`}>Dari PR</button>
                    <button type="button" onClick={() => { setSourceMode('direct'); setPrefilledPR(null); setSourcePRId(''); }} className={`min-h-9 rounded-lg px-3 text-[11px] font-semibold ${sourceMode === 'direct' ? 'bg-[#252525] text-white' : 'text-[#666]'}`}>PO langsung</button>
                  </div>
                </div>

                {sourceMode === 'pr' && <div className="mt-3">
                  {approvedPRs.length ? <select value={sourcePRId} onChange={(event) => handleSelectSourcePR(event.target.value)} className="h-11 w-full rounded-xl border border-[#d8d6cf] bg-white px-3 text-xs font-semibold text-[#444] outline-none focus:border-[#76ca67]">
                    <option value="">Pilih PR yang sudah disetujui...</option>
                    {approvedPRs.map((pr) => <option key={pr.id} value={pr.id}>{pr.prNumber} · {pr.quotedSupplierName || 'Supplier'} · {pr.items.length} barang · {formatRupiah(pr.totalEstimatedAmount)}</option>)}
                  </select> : <div className="rounded-xl bg-[#fff2d8] p-3 text-xs text-[#8c6417]">Belum ada PR yang sudah disetujui dan memiliki penawaran harga supplier.</div>}
                  {prefilledPR && <div className="mt-2 flex items-center justify-between rounded-xl bg-[#e8f7e4] px-3 py-2.5 text-[11px] text-[#356d2f]"><span><strong>{prefilledPR.items.length} barang</strong> sudah dimuat otomatis</span><span>{prefilledPR.prNumber}</span></div>}
                </div>}
                {sourceMode === 'direct' && <div className="mt-3 rounded-xl bg-[#eaf1ff] p-3 text-[11px] leading-relaxed text-[#315f9d]">Mode ini tetap tersedia untuk pembelian khusus tanpa PR. Pilih barang dari master gudang agar satuan, rasio, dan harga terakhir terisi otomatis.</div>}
              </section>

              {/* SECTION 1: Supplier & Tanggal Kirim */}
              <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>1. Data Vendor & Jadwal Kirim</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Supplier Selection or Direct Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supplier / Vendor *
                    </label>
                    {suppliers.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={formSupplierId}
                          onChange={(e) => {
                            setFormSupplierId(e.target.value);
                            const sup = suppliers.find((s) => s.id === e.target.value);
                            if (sup) setFormPaymentTerm(sup.paymentTermDefault);
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.category})
                            </option>
                          ))}
                          <option value="custom">+ Ketik Nama Vendor Lainnya...</option>
                        </select>

                        {formSupplierId === 'custom' && (
                          <input
                            type="text"
                            required
                            autoFocus
                            value={customSupplierName}
                            onChange={(e) => setCustomSupplierName(e.target.value)}
                            placeholder="Nama vendor baru..."
                            className="w-full text-xs border border-indigo-300 rounded-lg p-2 bg-indigo-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={customSupplierName}
                        onChange={(e) => setCustomSupplierName(e.target.value)}
                        placeholder="Nama vendor..."
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                      />
                    )}
                  </div>

                  {/* Target Delivery Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimasi Tgl Kirim *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formExpectedDate}
                        onChange={(e) => setFormExpectedDate(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Daftar Barang yang Dipesan */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>2. Daftar Barang ({formItems.length})</span>
                  </div>
                  {sourceMode === 'direct' && <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Item</span>
                  </button>}
                </div>

                <div className="space-y-2.5">
                  {formItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-1.5">
                        <span className="text-slate-700 font-bold">Item #{index + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-medium flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        )}
                      </div>

                      {/* Main Item Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Item Name */}
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Nama Barang *
                          </label>
                          {prefilledPR ? <div className="min-h-9 rounded-lg border border-[#e2e0da] bg-[#faf9f6] px-3 py-2 text-xs font-semibold text-[#333]"><span className="mr-1 font-mono text-[9px] text-[#8b8a84]">{item.sku}</span>{item.itemName}</div> : <div className="relative">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                required
                                placeholder="Ketik nama atau SKU..."
                                value={itemSearchQueries[item.id] ?? item.itemName}
                                onFocus={() => setActiveItemSearchId(item.id)}
                                onBlur={() => window.setTimeout(() => setActiveItemSearchId((current) => current === item.id ? null : current), 160)}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setItemSearchQueries((current) => ({ ...current, [item.id]: value }));
                                  setActiveItemSearchId(item.id);
                                  handleUpdateItemField(index, 'itemName', value);
                                  if (item.itemId) handleUpdateItemField(index, 'itemId', undefined);
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                              />
                            </div>
                            {activeItemSearchId === item.id && (itemSearchQueries[item.id] ?? item.itemName).trim() && (
                              <div className="motion-pop absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                                {warehouseItems.filter((warehouseItem) => {
                                  const query = (itemSearchQueries[item.id] ?? item.itemName).trim().toLowerCase();
                                  return warehouseItem.name.toLowerCase().includes(query) || warehouseItem.sku.toLowerCase().includes(query);
                                }).slice(0, 6).map((warehouseItem) => (
                                  <button key={warehouseItem.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                                    handleSelectWarehouseItem(index, warehouseItem.id);
                                    setItemSearchQueries((current) => ({ ...current, [item.id]: warehouseItem.name }));
                                    setActiveItemSearchId(null);
                                  }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-indigo-50">
                                    <span className="min-w-0"><strong className="block truncate text-[11px] text-slate-800">{warehouseItem.name}</strong><span className="block truncate text-[9px] text-slate-500">{warehouseItem.sku} · {warehouseItem.category}</span></span>
                                    <span className="shrink-0 text-[9px] font-semibold text-indigo-700">{warehouseItem.currentStock} {warehouseItem.unit}</span>
                                  </button>
                                ))}
                                {warehouseItems.filter((warehouseItem) => {
                                  const query = (itemSearchQueries[item.id] ?? item.itemName).trim().toLowerCase();
                                  return warehouseItem.name.toLowerCase().includes(query) || warehouseItem.sku.toLowerCase().includes(query);
                                }).length === 0 && <div className="px-3 py-4 text-center text-[10px] text-slate-500">Tidak ada barang yang cocok. Nama tetap dapat diketik manual.</div>}
                              </div>
                            )}
                          </div>}
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Qty *
                          </label>
                          <NumberInput
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemField(index, 'quantity', parseFloat(e.target.value) || 1)
                            }
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-center font-bold"
                          />
                        </div>

                        {/* Satuan Order */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Satuan
                          </label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateItemField(index, 'unit', val);
                              handleUpdateItemField(index, 'purchaseUnit', val);
                            }}
                            placeholder="Pcs/Dus/Kg"
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-center font-semibold text-indigo-700"
                          />
                        </div>

                        {/* Rasio Konversi */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5" title="Berapa satuan dasar gudang per 1 satuan order">
                            Rasio
                          </label>
                          <NumberInput
                            type="number"
                            min="1"
                            step="any"
                            value={item.conversionRatio || 1}
                            onChange={(e) =>
                              handleUpdateItemField(index, 'conversionRatio', parseFloat(e.target.value) || 1)
                            }
                            placeholder="1"
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-center"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Harga (Rp) *
                          </label>
                          <NumberInput
                            type="number"
                            min="0"
                            required
                            placeholder="0"
                            value={item.unitPrice || ''}
                            onChange={(e) =>
                              handleUpdateItemField(index, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-right font-medium"
                          />
                        </div>
                      </div>

                      {/* Conversion Live Calculation & Subtotal */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs pt-1 border-t border-slate-100 mt-1">
                        <div>
                          {item.conversionRatio && item.conversionRatio > 1 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                              <Repeat className="w-3 h-3 text-emerald-600" />
                              1 {item.unit} = {item.conversionRatio} {item.stockUnit || 'Pcs'} ({item.quantity * item.conversionRatio} {item.stockUnit || 'Pcs'} @ {formatRupiah((item.unitPrice || 0) / item.conversionRatio)})
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-slate-500">Subtotal:</span>
                          <span className="font-bold text-slate-900">{formatRupiah(item.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Ringkasan Nilai PO & PPN */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Subtotal Barang ({formItems.reduce((s, i) => s + (i.quantity || 0), 0)} unit):</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(calculatedSubtotal)}</span>
                </div>

                {/* Simple PPN Toggle */}
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={formPpnPercent === 11}
                      onChange={(e) => setFormPpnPercent(e.target.checked ? 11 : 0)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span>Kenakan PPN 11% ({formatRupiah(calculatedPpnAmount)})</span>
                  </label>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {formPpnPercent === 11 ? '+11%' : '0% (Non-PPN)'}
                  </span>
                </div>

                {formShippingFee > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Biaya Ongkir / Ekspedisi:</span>
                    <span className="font-semibold text-slate-900">{formatRupiah(formShippingFee)}</span>
                  </div>
                )}

                {/* Grand Total Highlight */}
                <div className="border-t-2 border-slate-300 pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Grand Total Nilai PO:
                  </span>
                  <span className="text-base sm:text-lg font-black text-indigo-700">
                    {formatRupiah(calculatedGrandTotal)}
                  </span>
                </div>
              </div>

              {/* Collapsible: Pengaturan Tambahan (Opsional) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 text-slate-700 flex items-center justify-between text-xs font-semibold transition"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚙️ Opsi Tambahan</span>
                    <span className="text-slate-400 font-normal">(Ongkir, Syarat Pembayaran, Catatan)</span>
                  </span>
                  {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>

                {isAdvancedOpen && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Syarat Pembayaran (Payment Term)
                        </label>
                        <select
                          value={formPaymentTerm}
                          onChange={(e) => setFormPaymentTerm(e.target.value as PaymentTerm)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                        >
                          <option value="net_30">Tempo 30 Hari (Net 30)</option>
                          <option value="net_14">Tempo 14 Hari (Net 14)</option>
                          <option value="net_7">Tempo 7 Hari (Net 7)</option>
                          <option value="cod">Cash on Delivery (COD)</option>
                          <option value="cash">Tunai (Cash)</option>
                          <option value="dp_50_net_30">DP 50% + Pelunasan 30 Hari</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Biaya Ongkir / Ekspedisi (Rp)
                        </label>
                        <NumberInput
                          type="number"
                          min="0"
                          value={formShippingFee}
                          onChange={(e) => setFormShippingFee(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Catatan Pengiriman (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Contoh: Kirim ke Gudang Utama Gedung B, lampirkan Surat Jalan & Faktur..."
                        className="w-full text-xs border border-slate-300 rounded-lg p-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky -bottom-6 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t border-[#e3e1da] bg-white/95 px-4 py-3 shadow-[0_-10px_24px_rgba(35,35,30,.08)] backdrop-blur-lg sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setPrefilledPR(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Terbitkan Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail PO */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Detail Purchase Order: {selectedPO.poNumber}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintPO(selectedPO)}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak / PDF
                </button>
                <button
                  onClick={() => setSelectedPO(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5">Supplier / Vendor:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPO.supplierName}</span>
                  <p className="text-slate-600 mt-1">{selectedPO.supplierAddress}</p>
                  <p className="text-slate-500 mt-1">Telp: {selectedPO.supplierPhone} | PIC: {selectedPO.supplierContactPerson}</p>
                </div>
                <div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tanggal PO:</span>
                      <span className="font-semibold">{formatDate(selectedPO.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Kirim:</span>
                      <span className="font-semibold">{formatDate(selectedPO.expectedDeliveryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Syarat Bayar:</span>
                      <span className="font-semibold">{getPaymentTermLabel(selectedPO.paymentTerm)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500">Status PO:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPOStatusBadge(selectedPO.status).bg} ${getPOStatusBadge(selectedPO.status).text}`}>
                        {getPOStatusBadge(selectedPO.status).label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items & Fulfillment Progress */}
              <div>
                <span className="font-bold text-slate-700 block mb-2">Item Barang & Status Penerimaan:</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">SKU & Nama Barang</th>
                        <th className="p-2.5 text-center">Dipesan</th>
                        <th className="p-2.5 text-center">Diterima</th>
                        <th className="p-2.5 text-center">Sisa</th>
                        <th className="p-2.5 text-right">Harga Satuan</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPO.items.map((item, idx) => {
                        const remaining = item.quantity - (item.receivedQuantity || 0);
                        return (
                          <tr key={item.id}>
                            <td className="p-2.5 text-slate-500">{idx + 1}</td>
                            <td className="p-2.5">
                              <span className="font-semibold text-slate-900 block">{item.itemName}</span>
                              <span className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>
                            </td>
                            <td className="p-2.5 text-center font-semibold text-slate-800">
                              <div>
                                <span>{item.quantity} {item.unit}</span>
                                {item.conversionRatio && item.conversionRatio > 1 && (
                                  <span className="block text-[10px] text-emerald-700 font-medium">
                                    ≈ {item.quantity * item.conversionRatio} {item.stockUnit || 'Pcs'} (1:{item.conversionRatio})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">
                              <div>
                                <span>{item.receivedQuantity || 0} {item.unit}</span>
                                {item.conversionRatio && item.conversionRatio > 1 && (item.receivedQuantity || 0) > 0 && (
                                  <span className="block text-[10px] text-emerald-600 font-normal">
                                    ({(item.receivedQuantity || 0) * item.conversionRatio} {item.stockUnit || 'Pcs'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-medium text-amber-700">
                              <div>
                                <span>{remaining} {item.unit}</span>
                                {item.conversionRatio && item.conversionRatio > 1 && remaining > 0 && (
                                  <span className="block text-[10px] text-amber-600 font-normal">
                                    ({remaining * item.conversionRatio} {item.stockUnit || 'Pcs'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-right text-slate-600">{formatRupiah(item.unitPrice)}</td>
                            <td className="p-2.5 text-right font-semibold text-slate-900">
                              {formatRupiah(item.subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-bold block text-slate-800 mb-0.5">Catatan PO:</span>
                  <p>{selectedPO.notes || '-'}</p>
                </div>
                <div className="w-60 space-y-1 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatRupiah(selectedPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({selectedPO.ppnPercent}%):</span>
                    <span className="font-semibold">{formatRupiah(selectedPO.ppnAmount)}</span>
                  </div>
                  {selectedPO.shippingFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Ongkir:</span>
                      <span className="font-semibold">{formatRupiah(selectedPO.shippingFee)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-1 flex justify-between font-black text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-indigo-700">{formatRupiah(selectedPO.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <div>
                {selectedPO.status !== 'selesai' && selectedPO.status !== 'dibatalkan' && (
                  <button
                    onClick={() => {
                      const target = selectedPO;
                      setSelectedPO(null);
                      onOpenCreateGRNForPO(target);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition"
                  >
                    <Truck className="w-4 h-4" />
                    Proses Penerimaan Barang (GRN)
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-lg hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Document Modal */}
      {printPO && <POPrintModal po={printPO} onClose={() => setPrintPO(null)} />}
    </div>
  );
};
