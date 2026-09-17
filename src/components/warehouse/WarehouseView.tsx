import { NumberInput } from '../common/NumberInput';
import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Search,
  AlertTriangle,
  History,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle2,
  Sliders,
  DollarSign,
  Upload,
  Download,
  Repeat,
  QrCode,
  Printer,
  FileText,
  X,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { WarehouseItem, StockMovement, MovementType } from '../../types';
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  getMovementBadge,
} from '../../utils/formatters';
import { exportWarehouseItemsCSV } from '../../utils/exportImport';
import { DataCenterModal } from '../common/DataCenterModal';
import { ItemQRQuickModal } from '../rack/ItemQRQuickModal';
import { ComprehensiveReportModal } from '../common/PrintTemplates';
import { generateQRCodeDataUrl, generateRackQRPayload } from '../../utils/qrGenerator';
import { StockRiskReportModal } from './StockRiskReportModal';
import {
  getAverageUnitCost,
  getInventoryValue,
  getPurchaseUnitPrice,
  pricingFromPurchaseUnit,
} from '../../utils/inventoryPricing';

interface WarehouseViewProps {
  onOpenCreatePRForItem: (item: WarehouseItem) => void;
  onOpenScanQR?: () => void;
  onOpenPrintLabel?: (item?: WarehouseItem) => void;
  onOpenDeepTrack?: (item: WarehouseItem) => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  onOpenCreatePRForItem,
  onOpenScanQR,
  onOpenPrintLabel,
  onOpenDeepTrack,
}) => {
  const {
    items,
    suppliers,
    stockMovements,
    purchaseOrders,
    goodsReceipts,
    addItem,
    updateItem,
    deleteItem,
    adjustStock,
    getInventoryAssetValue,
    inventoryCategories,
  } = usePurchasing();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isMovementLogsModalOpen, setIsMovementLogsModalOpen] = useState(false);
  const [isDataCenterOpen, setIsDataCenterOpen] = useState(false);
  const [dataCenterTab, setDataCenterTab] = useState<'backup_restore' | 'import_items' | 'import_suppliers' | 'export_reports'>('import_items');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRiskReportOpen, setIsRiskReportOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<'stock_valuation' | 'stock_audit' | 'po_summary' | 'grn_summary'>('stock_valuation');
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<WarehouseItem | null>(null);
  const [selectedItemLogs, setSelectedItemLogs] = useState<string | null>(null);

  // Quick QR Modal
  const [selectedItemForQRModal, setSelectedItemForQRModal] = useState<WarehouseItem | null>(null);
  const [isItemQRModalOpen, setIsItemQRModalOpen] = useState(false);

  // Form State for Add / Edit Item
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Bahan Baku & Kimia Industri');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('Dus');
  const [formConversionRatio, setFormConversionRatio] = useState<number>(1);
  const [formInitialStock, setFormInitialStock] = useState(0);
  const [formMinStock, setFormMinStock] = useState(10);
  const [formLocation, setFormLocation] = useState('Gudang A - Rak 01');
  const [formPrice, setFormPrice] = useState(0);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLiveQRUrl, setFormLiveQRUrl] = useState<string>('');

  // Form State for Adjustment
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'penyesuaian_masuk' | 'penyesuaian_keluar' | 'pengambilan_internal' | 'retur'>('penyesuaian_masuk');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustOperator, setAdjustOperator] = useState('Staff Gudang');

  // Categories
  const defaultCategories = [
    'Bahan Baku & Kimia Industri',
    'Kemasan & Packaging',
    'Suku Cadang & Sparepart',
    'ATK & Perlengkapan Kantor',
    'Elektrikal & IT Hardware',
    'Lain-lain',
  ];
  const categories = inventoryCategories.filter((category) => category.isActive).map((category) => category.name);
  const categoryOptions = categories.length ? categories : defaultCategories;

  // Dynamic live QR code for the Add/Edit form
  useEffect(() => {
    let isMounted = true;
    async function updateLiveQR() {
      if (!isAddItemModalOpen) return;
      const sku = formSku.trim() || 'SKU-NEW';
      const name = formName.trim() || 'Barang Baru';
      const loc = formLocation.trim() || 'Gudang Utama';
      const payload = JSON.stringify({
        app: 'KIRI_WMS',
        type: 'RACK_ITEM',
        sku,
        name,
        location: loc,
      });
      const url = await generateQRCodeDataUrl(payload, { width: 180, margin: 1 });
      if (isMounted && url) {
        setFormLiveQRUrl(url);
      }
    }

    const timer = setTimeout(() => {
      updateLiveQR();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formSku, formName, formLocation, isAddItemModalOpen]);

  // Counts for status tabs
  const criticalCount = items.filter((i) => i.currentStock <= i.minStock && i.currentStock > 0).length;
  const outOfStockCount = items.filter((i) => i.currentStock === 0).length;
  const safeCount = items.filter((i) => i.currentStock > i.minStock).length;

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
    let matchStatus = true;
    if (stockStatusFilter === 'low') matchStatus = item.currentStock <= item.minStock && item.currentStock > 0;
    if (stockStatusFilter === 'out') matchStatus = item.currentStock === 0;
    if (stockStatusFilter === 'safe') matchStatus = item.currentStock > item.minStock;

    const matchSearch =
      searchQuery === '' ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase());

    return matchCategory && matchStatus && matchSearch;
  });

  const generateSku = () => {
    let sequence = items.reduce((max, item) => {
      const match = /^SKU-(\d+)$/i.exec(item.sku);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    let code = `SKU-${String(sequence).padStart(5, '0')}`;
    while (items.some(item => item.sku.toLowerCase() === code.toLowerCase())) {
      code = `SKU-${String(++sequence).padStart(5, '0')}`;
    }
    return code;
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSku(generateSku());
    setFormName('');
    setFormCategory('Bahan Baku & Kimia Industri');
    setFormUnit('Pcs');
    setFormPurchaseUnit('Dus');
    setFormConversionRatio(1);
    setFormInitialStock(0);
    setFormMinStock(10);
    setFormLocation('Gudang A - Rak 01');
    setFormPrice(0);
    setFormSupplierId(suppliers[0]?.id || '');
    setFormDescription('');
    setIsAddItemModalOpen(true);
  };

  const handleOpenEdit = (item: WarehouseItem) => {
    setEditingItem(item);
    setFormSku(item.sku);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormPurchaseUnit(item.purchaseUnit || item.unit);
    setFormConversionRatio(item.conversionRatio || 1);
    setFormInitialStock(item.currentStock);
    setFormMinStock(item.minStock);
    setFormLocation(item.warehouseLocation);
    setFormPrice(getPurchaseUnitPrice(item));
    setFormSupplierId(item.primarySupplierId || '');
    setFormDescription(item.description || '');
    setIsAddItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim() || !formName.trim()) {
      alert('SKU dan Nama Barang wajib diisi.');
      return;
    }

    const sku = formSku.trim();
    if (items.some(item => item.id !== editingItem?.id && item.sku.toLowerCase() === sku.toLowerCase())) {
      alert('SKU sudah digunakan barang lain. Gunakan kode berbeda atau buat kode otomatis.');
      return;
    }
    const ratio = formConversionRatio > 0 ? formConversionRatio : 1;
    const pricing = pricingFromPurchaseUnit(formPrice, ratio);

    if (editingItem) {
      updateItem(editingItem.id, {
        sku,
        name: formName,
        category: formCategory,
        unit: formUnit,
        purchaseUnit: formPurchaseUnit || formUnit,
        conversionRatio: ratio,
        minStock: formMinStock,
        warehouseLocation: formLocation,
        ...pricing,
        primarySupplierId: formSupplierId,
        description: formDescription,
      });
    } else {
      addItem({
        sku,
        name: formName,
        category: formCategory,
        unit: formUnit,
        purchaseUnit: formPurchaseUnit || formUnit,
        conversionRatio: ratio,
        currentStock: formInitialStock,
        minStock: formMinStock,
        warehouseLocation: formLocation,
        ...pricing,
        primarySupplierId: formSupplierId || undefined,
        description: formDescription || undefined,
      });
    }

    setIsAddItemModalOpen(false);
  };

  const handleOpenAdjust = (item: WarehouseItem) => {
    setSelectedItemForAdjust(item);
    setAdjustQty(1);
    setAdjustType('penyesuaian_masuk');
    setAdjustReason('Penyesuaian stok opname fisik');
    setAdjustOperator('Staff Gudang');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;
    if (adjustQty <= 0) {
      alert('Jumlah penyesuaian harus lebih dari 0.');
      return;
    }
    if (!adjustReason.trim()) {
      alert('Alasan penyesuaian wajib diisi.');
      return;
    }

    adjustStock(
      selectedItemForAdjust.id,
      adjustQty,
      adjustType,
      `ADJ-${Date.now().toString().slice(-4)}`,
      adjustReason,
      adjustOperator
    );

    setIsAdjustModalOpen(false);
    setSelectedItemForAdjust(null);
  };

  const handleShowItemQR = (item: WarehouseItem) => {
    setSelectedItemForQRModal(item);
    setIsItemQRModalOpen(true);
  };

  const totalLowAndOut = criticalCount + outOfStockCount;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Database Master Stock
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">QR Code Ready</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
            Database & Manajemen Rak Gudang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Katalog SKU barang gudang terintegrasi dengan kode QR otomatis untuk pelacakan fisik, audit stok opname, dan alokasi rak penyimpanan.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-col gap-2.5 shrink-0 w-full lg:w-auto">
          {/* Row 1: Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[42px] cursor-pointer select-none"
              title="Tambah Master SKU Barang Baru"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ Tambah SKU</span>
            </button>

            {onOpenScanQR && (
              <button
                onClick={onOpenScanQR}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[42px] cursor-pointer select-none"
                title="Pindai QR Code di Rak Gudang"
              >
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Scan QR Rak</span>
              </button>
            )}
          </div>

          {/* Row 2: Secondary Utility Tools (Clean & Unified Styling) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 p-1.5 bg-slate-50/90 rounded-xl border border-slate-200/80">
            {onOpenPrintLabel && (
              <button
                onClick={() => onOpenPrintLabel()}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-[11px] sm:text-xs rounded-lg border border-slate-200 shadow-2xs transition min-h-[36px] cursor-pointer"
                title="Cetak Stiker Label QR untuk Seluruh Barang Database"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Label QR</span>
              </button>
            )}

            <button
              onClick={() => {
                setReportModalType('stock_valuation');
                setIsReportModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-[11px] sm:text-xs rounded-lg border border-slate-200 shadow-2xs transition min-h-[36px] cursor-pointer"
              title="Cetak Laporan Valuasi Stok atau Lembar Opname Fisik PDF"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="truncate">Opname PDF</span>
            </button>

            <button onClick={() => setIsRiskReportOpen(true)} className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 sm:text-xs" title="Atur dan cetak laporan stok menipis, sekarat, atau kosong"><AlertTriangle className="h-3.5 w-3.5 text-rose-600"/><span className="truncate">Laporan Kritis</span></button>

            <button
              onClick={() => {
                setSelectedItemLogs(null);
                setIsMovementLogsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-[11px] sm:text-xs rounded-lg border border-slate-200 shadow-2xs transition min-h-[36px] cursor-pointer"
              title="Audit Riwayat Mutasi Masuk & Keluar"
            >
              <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Mutasi</span>
            </button>

            <button
              onClick={() => {
                setDataCenterTab('import_items');
                setIsDataCenterOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-[11px] sm:text-xs rounded-lg border border-slate-200 shadow-2xs transition min-h-[36px] cursor-pointer"
              title="Import Data Master Barang via CSV / Excel"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Import CSV</span>
            </button>

            <button
              onClick={() => exportWarehouseItemsCSV(items)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-semibold text-[11px] sm:text-xs rounded-lg border border-slate-200 shadow-2xs transition min-h-[36px] cursor-pointer"
              title="Download CSV Katalog Barang Gudang"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Master SKU</span>
            <div className="text-base sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{items.length} Barang</div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Semua memiliki QR tag</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter('low')}
          className={`p-3.5 sm:p-4 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition select-none ${
            criticalCount > 0
              ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Kritis (ROP)</span>
            <div className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 ${criticalCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {criticalCount} SKU
            </div>
            <p className="text-[10px] sm:text-xs text-amber-600 font-medium mt-0.5">
              {criticalCount > 0 ? 'Perlu diajukan PR' : 'Semua aman'}
            </p>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${criticalCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div
          onClick={() => setStockStatusFilter('out')}
          className={`p-3.5 sm:p-4 rounded-xl border shadow-xs flex items-center justify-between cursor-pointer transition select-none ${
            outOfStockCount > 0
              ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Habis (0)</span>
            <div className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 ${outOfStockCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {outOfStockCount} SKU
            </div>
            <p className="text-[10px] sm:text-xs text-rose-600 font-medium mt-0.5">
              {outOfStockCount > 0 ? 'Urgent pengadaan' : 'Stok tersedia'}
            </p>
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${outOfStockCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Aset Gudang</span>
            <div className="text-base sm:text-2xl font-bold text-emerald-700 mt-0.5 sm:mt-1 truncate">
              {formatRupiah(getInventoryAssetValue())}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Berdasarkan harga terakhir</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar with Status Counts */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs with real counts */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs -mx-1 px-1">
            {[
              { id: 'all', label: `Semua (${items.length})` },
              { id: 'low', label: `Stok Kritis (${criticalCount})`, badge: criticalCount > 0 ? 'bg-amber-100 text-amber-800' : '' },
              { id: 'out', label: `Habis (${outOfStockCount})`, badge: outOfStockCount > 0 ? 'bg-rose-100 text-rose-800' : '' },
              { id: 'safe', label: `Aman (${safeCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStockStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition min-h-[36px] ${
                  stockStatusFilter === tab.id
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category & Search Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700 h-[38px]"
            >
              <option value="all">Semua Kategori</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari SKU, nama, rak..."
                className="w-full text-xs pl-8 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-slate-400 h-[38px]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Warehouse Items Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">SKU & QR Code</th>
                <th className="py-3 px-4 font-semibold">Nama Barang</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold text-center">Stok Saat Ini</th>
                <th className="py-3 px-4 font-semibold text-center">Min. Safety</th>
                <th className="py-3 px-4 font-semibold">Lokasi Gudang / Rak</th>
                <th className="py-3 px-4 font-semibold text-right">HPP / Satuan Dasar</th>
                <th className="py-3 px-4 font-semibold text-right">Nilai Total Stok</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada barang gudang yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                  const isOut = item.currentStock === 0;
                  const totalAsset = getInventoryValue(item);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                      {/* Interactive SKU & QR Button */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleShowItemQR(item)}
                          className="flex items-center gap-1.5 text-left group-hover:text-emerald-700 transition"
                          title="Klik untuk melihat, download, atau cetak QR Code SKU ini"
                        >
                          <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center border border-slate-200 group-hover:border-emerald-300 transition shrink-0">
                            <QrCode className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-800 group-hover:text-emerald-800 text-[11px] block">
                              {item.sku}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-semibold group-hover:underline">
                              Lihat QR Tag
                            </span>
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block text-xs">{item.name}</span>
                        {item.description && (
                          <span className="text-[11px] text-slate-500 line-clamp-1">{item.description}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.category}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              isOut
                                ? 'bg-rose-600 text-white'
                                : isLow
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.currentStock} {item.unit}
                          </span>
                          {item.conversionRatio && item.conversionRatio > 1 && item.purchaseUnit && (
                            <span className="block text-[10px] text-slate-500 font-medium mt-0.5" title={`1 ${item.purchaseUnit} = ${item.conversionRatio} ${item.unit}`}>
                              ≈ {(item.currentStock / item.conversionRatio).toFixed(1).replace('.0', '')} {item.purchaseUnit} (1:{item.conversionRatio})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {item.minStock} {item.unit}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                          {item.warehouseLocation}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700 font-medium">
                        <span className="block">{formatRupiah(getAverageUnitCost(item))}</span>
                        <span className="block text-[9px] text-slate-400 font-normal">
                          Beli {formatRupiah(getPurchaseUnitPrice(item))}/{item.purchaseUnit || item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(totalAsset)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick PR if low stock */}
                          {item.currentStock <= item.minStock && (
                            <button
                              onClick={() => onOpenCreatePRForItem(item)}
                              className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                              title="Buat Permintaan Pembelian (PR)"
                            >
                              + PR
                            </button>
                          )}

                          {/* Instant QR Quick View Modal */}
                          <button
                            onClick={() => handleShowItemQR(item)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Buka QR Tag & Download Stiker"
                          >
                            <QrCode className="w-4 h-4 text-emerald-600" />
                          </button>

                          {/* Deep Track Dossier */}
                          {onOpenDeepTrack && (
                            <button
                              onClick={() => onOpenDeepTrack(item)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Dossier & Analisis Pelacakan Rak Lengkap"
                            >
                              <Activity className="w-4 h-4 text-indigo-600" />
                            </button>
                          )}

                          {/* Quick Adjustment */}
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Penyesuaian Stok (Koreksi/Opname)"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* View specific item logs */}
                          <button
                            onClick={() => {
                              setSelectedItemLogs(item.id);
                              setIsMovementLogsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Riwayat Mutasi SKU Ini"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Edit Master Barang"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => {
                              if (confirm(`Hapus barang [${item.sku}] ${item.name}?`)) {
                                deleteItem(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Mobile Warehouse Cards List */}
      <div className="md:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Tidak ada barang gudang yang sesuai dengan kriteria pencarian.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
            const isOut = item.currentStock === 0;
            const totalAsset = getInventoryValue(item);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      onClick={() => handleShowItemQR(item)}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 px-2 py-0.5 rounded border border-slate-200 transition"
                    >
                      <QrCode className="w-3 h-3 text-emerald-600" />
                      <span>{item.sku}</span>
                    </button>
                    <h3 className="font-bold text-sm text-slate-900 mt-1 truncate">{item.name}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isOut
                        ? 'bg-rose-600 text-white'
                        : isLow
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOut ? 'Habis (0)' : isLow ? 'Stok Kritis' : 'Stok Aman'}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Stok Gudang:</span>
                    <span className="font-bold text-slate-900">
                      {item.currentStock} {item.unit}
                    </span>
                    {item.conversionRatio && item.conversionRatio > 1 && item.purchaseUnit && (
                      <span className="text-[10px] text-slate-500 block">
                        ≈ {(item.currentStock / item.conversionRatio).toFixed(1).replace('.0', '')} {item.purchaseUnit}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">Batas Minimum:</span>
                    <span className="font-semibold text-slate-700">
                      {item.minStock} {item.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">Lokasi Rak:</span>
                    <span className="text-slate-800 font-medium truncate block">
                      {item.warehouseLocation}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">HPP / {item.unit}:</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(getAverageUnitCost(item))}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Beli {formatRupiah(getPurchaseUnitPrice(item))}/{item.purchaseUnit || item.unit}
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Mobile */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  {item.currentStock <= item.minStock && (
                    <button
                      onClick={() => onOpenCreatePRForItem(item)}
                      className="px-2.5 py-1.5 bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 min-h-[38px]"
                    >
                      + PR
                    </button>
                  )}

                  <button
                    onClick={() => handleShowItemQR(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold min-h-[38px]"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Lihat QR</span>
                  </button>

                  <button
                    onClick={() => handleOpenAdjust(item)}
                    className="p-2 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg text-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Penyesuaian Stok (Opname)"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedItemLogs(item.id);
                      setIsMovementLogsModalOpen(true);
                    }}
                    className="p-2 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg text-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Riwayat Mutasi"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 bg-slate-100 active:bg-slate-200 text-slate-700 rounded-lg text-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Hapus barang [${item.sku}] ${item.name}?`)) {
                        deleteItem(item.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 active:bg-rose-50 rounded-lg text-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add / Edit Master Item with Real-Time QR Generator */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">
                    {editingItem ? `Edit Master Barang: ${editingItem.sku}` : 'Tambah Master Barang Baru Gudang'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Otomatis generate QR Code rak & katalog master stok
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left 2 Cols: Form Inputs */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kode / SKU Barang *</label>
                      <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        required
                        aria-label="Kode SKU barang"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        placeholder="Contoh: RAW-PLM-01"
                        className="w-full min-h-[44px] border border-slate-300 rounded-lg p-2.5 font-mono text-base sm:text-sm focus:ring-2 focus:ring-emerald-500/30"
                      />
                      {!editingItem && <button type="button" onClick={() => setFormSku(generateSku())}
                        className="min-h-[44px] rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700">
                        Buat SKU otomatis
                      </button>}
                      <p className="text-xs text-slate-500">Kode unik barang. Gunakan kode otomatis atau ketik kode Anda sendiri.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kategori Barang *</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500/30"
                      >
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Barang Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Polypropylene Polymer Resin Grade A"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Satuan Dasar Gudang *</label>
                      <input
                        type="text"
                        required
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        placeholder="Pcs, Kg, Liter"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Satuan Beli (Kemasan)</label>
                      <input
                        type="text"
                        value={formPurchaseUnit}
                        onChange={(e) => setFormPurchaseUnit(e.target.value)}
                        placeholder="Dus, Box, Zak"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Rasio Konversi</label>
                      <NumberInput
                        type="number"
                        min="1"
                        step="any"
                        value={formConversionRatio}
                        onChange={(e) => setFormConversionRatio(parseFloat(e.target.value) || 1)}
                        placeholder="Contoh: 24"
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  {formConversionRatio > 1 && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2 text-emerald-800 text-[11px]">
                      <Repeat className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Konversi Otomatis:</strong> 1 {formPurchaseUnit || 'Kemasan'} = {formConversionRatio} {formUnit || 'Pcs'}.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!editingItem && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Stok Awal Fisik ({formUnit})</label>
                        <NumberInput
                          type="number"
                          min="0"
                          value={formInitialStock}
                          onChange={(e) => setFormInitialStock(parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                        />
                      </div>
                    )}

                    <div className={editingItem ? 'sm:col-span-2' : ''}>
                      <label className="block font-semibold text-slate-700 mb-1">Stok Minimum (Safety Buffer) ({formUnit}) *</label>
                      <NumberInput
                        type="number"
                        min="0"
                        required
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lokasi Rak / Bin Gudang *</label>
                      <input
                        type="text"
                        required
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="Contoh: Gudang B - Rak RAW-04"
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Harga Beli per {formPurchaseUnit || 'Satuan Beli'} (Rp) *
                      </label>
                      <NumberInput
                        type="number"
                        min="0"
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        HPP otomatis: <strong>{formatRupiah(formPrice / (formConversionRatio > 0 ? formConversionRatio : 1))}</strong>
                        {' '}per {formUnit || 'satuan dasar'}. Nilai stok memakai HPP ini, bukan harga kemasan.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Supplier Utama / Rekomendasi</label>
                    <select
                      value={formSupplierId}
                      onChange={(e) => setFormSupplierId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-xs"
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Col: Live Generated QR Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between text-center">
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-700 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Live QR Code Generator</span>
                    </div>

                    {/* QR Canvas Box */}
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-800 shadow-2xs inline-block">
                      {formLiveQRUrl ? (
                        <img
                          src={formLiveQRUrl}
                          alt="Live Generated QR Code"
                          className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-[10px] text-slate-400">
                          Membuat QR...
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="font-mono font-bold text-slate-800 block text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                        {formSku || 'SKU-NEW'}
                      </span>
                      <p className="font-semibold text-slate-900 text-xs mt-1 truncate max-w-[180px] mx-auto">
                        {formName || 'Nama Barang'}
                      </p>
                      <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                        {formLocation || 'Gudang Utama'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                    QR Code siap dipindai langsung setelah barang tersimpan di database.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi & Spesifikasi Tambahan</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Keterangan spesifikasi teknis barang..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-xs transition"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Daftarkan & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Penyesuaian Stok (Stock Adjustment) */}
      {isAdjustModalOpen && selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Penyesuaian Stok Barang</h3>
                <span className="font-mono text-slate-500">[{selectedItemForAdjust.sku}] {selectedItemForAdjust.name}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <span className="text-slate-600">Stok Saat Ini di Sistem:</span>
              <span className="font-bold text-base text-slate-900">
                {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}
              </span>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Penyesuaian *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option value="penyesuaian_masuk">Penyesuaian (+) Tambah Stok (Koreksi Opname)</option>
                  <option value="penyesuaian_keluar">Penyesuaian (-) Kurang Stok (Koreksi Selisih)</option>
                  <option value="pengambilan_internal">Pengambilan Internal (-) Pemakaian Departemen</option>
                  <option value="retur">Retur (-) Pengembalian ke Vendor</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Penyesuaian ({selectedItemForAdjust.unit}) *
                </label>
                <NumberInput
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Penyesuaian / No. Berita Acara *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Hasil stock opname bulanan rak A-01"
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Petugas Gudang / Operator *</label>
                <input
                  type="text"
                  required
                  value={adjustOperator}
                  onChange={(e) => setAdjustOperator(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  Konfirmasi Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Riwayat Mutasi Stok (Audit Trail) */}
      {isMovementLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {selectedItemLogs
                    ? `Riwayat Mutasi Stok: [${items.find((i) => i.id === selectedItemLogs)?.sku}] ${items.find((i) => i.id === selectedItemLogs)?.name}`
                    : 'Buku Catatan Mutasi Stok Gudang (Audit Trail Log)'}
                </h3>
              </div>
              <button
                onClick={() => setIsMovementLogsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3">SKU & Nama Barang</th>
                      <th className="py-2.5 px-3">Tipe Mutasi</th>
                      <th className="py-2.5 px-3 text-center">Qty Mutasi</th>
                      <th className="py-2.5 px-3 text-center">Stok Awal</th>
                      <th className="py-2.5 px-3 text-center">Stok Akhir</th>
                      <th className="py-2.5 px-3">Ref / No. Dokumen</th>
                      <th className="py-2.5 px-3">Petugas & Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockMovements
                      .filter((m) => !selectedItemLogs || m.itemId === selectedItemLogs)
                      .map((mov) => {
                        const badge = getMovementBadge(mov.type);
                        return (
                          <tr key={mov.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                              {formatDateTime(mov.date)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-800 block">{mov.itemSku}</span>
                              <span className="text-[11px] text-slate-600">{mov.itemName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              <span className={mov.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">{mov.previousStock}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{mov.newStock}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-700 font-semibold">
                              {mov.referenceNo}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="font-semibold block">{mov.operator}</span>
                              <span className="text-[11px] text-slate-500">{mov.notes}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsMovementLogsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-lg hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pusat Data & Ekspor-Impor */}
      {isDataCenterOpen && (
        <DataCenterModal
          isOpen={isDataCenterOpen}
          onClose={() => setIsDataCenterOpen(false)}
          defaultTab={dataCenterTab}
        />
      )}

      {/* Modal: Quick QR Detail & Sticker Generator */}
      <ItemQRQuickModal
        isOpen={isItemQRModalOpen}
        onClose={() => {
          setIsItemQRModalOpen(false);
          setSelectedItemForQRModal(null);
        }}
        item={selectedItemForQRModal}
        onOpenCreatePR={(item) => onOpenCreatePRForItem(item)}
        onOpenAdjust={(item) => handleOpenAdjust(item)}
        onOpenPrintLabel={(item) => onOpenPrintLabel?.(item)}
        onOpenDeepTrack={(item) => onOpenDeepTrack?.(item)}
      />

      {/* Modal: Official Comprehensive Reports Printout */}
      {isReportModalOpen && (
        <ComprehensiveReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportType={reportModalType}
          items={items}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          goodsReceipts={goodsReceipts}
        />
      )}
      {isRiskReportOpen && <StockRiskReportModal items={items} onClose={() => setIsRiskReportOpen(false)} />}
    </div>
  );
};
