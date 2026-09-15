import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import {
  exportWarehouseItemsCSV,
  downloadTemplateWarehouseItemsCSV,
  parseWarehouseItemsCSV,
  exportSuppliersCSV,
  downloadTemplateSuppliersCSV,
  parseSuppliersCSV,
  exportPurchaseOrdersCSV,
  exportGoodsReceiptsCSV,
  exportRequisitionsCSV,
} from '../../utils/exportImport';
import { WarehouseItem, Supplier } from '../../types';
import { ComprehensiveReportModal } from './PrintTemplates';

interface DataCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'backup_restore' | 'import_items' | 'import_suppliers' | 'export_reports';
  defaultTab?: 'backup_restore' | 'import_items' | 'import_suppliers' | 'export_reports';
}

export const DataCenterModal: React.FC<DataCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'backup_restore',
  defaultTab,
}) => {
  const {
    items,
    suppliers,
    purchaseOrders,
    goodsReceipts,
    requisitions,
    exportDatabaseJSON,
    importFullBackup,
    importWarehouseItems,
    importSuppliers,
  } = usePurchasing();

  const [activeTab, setActiveTab] = useState<'backup_restore' | 'import_items' | 'import_suppliers' | 'export_reports'>(
    defaultTab || initialTab
  );

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [defaultTab, initialTab]);

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<'stock_valuation' | 'stock_audit' | 'po_summary' | 'grn_summary'>('stock_valuation');

  // Backup restore state
  const [jsonFileContent, setJsonFileContent] = useState<any | null>(null);
  const [jsonFileName, setJsonFileName] = useState<string>('');

  // Item import state
  const [itemImportMode, setItemImportMode] = useState<'merge' | 'replace'>('merge');
  const [itemRawText, setItemRawText] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<Partial<WarehouseItem>[]>([]);
  const [itemParseErrors, setItemParseErrors] = useState<string[]>([]);
  const [itemFileName, setItemFileName] = useState<string>('');

  // Supplier import state
  const [supplierImportMode, setSupplierImportMode] = useState<'merge' | 'replace'>('merge');
  const [supplierRawText, setSupplierRawText] = useState<string>('');
  const [parsedSuppliers, setParsedSuppliers] = useState<Partial<Supplier>[]>([]);
  const [supplierParseErrors, setSupplierParseErrors] = useState<string[]>([]);
  const [supplierFileName, setSupplierFileName] = useState<string>('');

  if (!isOpen) return null;

  // JSON File upload handler
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        setJsonFileContent(parsed);
      } catch (err: any) {
        alert('File JSON tidak valid: ' + err.message);
        setJsonFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyFullRestore = () => {
    if (!jsonFileContent) return;
    const isOk = confirm('Pulihkan seluruh database dari file backup ini? Data saat ini akan digantikan.');
    if (!isOk) return;

    const success = importFullBackup(jsonFileContent);
    if (success) {
      onClose();
    }
  };

  // CSV Items File upload handler
  const handleItemCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setItemFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setItemRawText(text);
      const { items: resultItems, errors } = parseWarehouseItemsCSV(text);
      setParsedItems(resultItems);
      setItemParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleItemTextChange = (text: string) => {
    setItemRawText(text);
    if (text.trim()) {
      const { items: resultItems, errors } = parseWarehouseItemsCSV(text);
      setParsedItems(resultItems);
      setItemParseErrors(errors);
    } else {
      setParsedItems([]);
      setItemParseErrors([]);
    }
  };

  const handleApplyItemImport = () => {
    if (parsedItems.length === 0) {
      alert('Tidak ada data barang yang valid untuk diimpor.');
      return;
    }

    const count = importWarehouseItems(parsedItems, itemImportMode);
    alert(`Berhasil mengimpor ${count} data barang ke database gudang!`);
    setItemRawText('');
    setParsedItems([]);
    setItemFileName('');
    onClose();
  };

  // CSV Supplier File upload handler
  const handleSupplierCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSupplierFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setSupplierRawText(text);
      const { suppliers: resultSuppliers, errors } = parseSuppliersCSV(text);
      setParsedSuppliers(resultSuppliers);
      setSupplierParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleSupplierTextChange = (text: string) => {
    setSupplierRawText(text);
    if (text.trim()) {
      const { suppliers: resultSuppliers, errors } = parseSuppliersCSV(text);
      setParsedSuppliers(resultSuppliers);
      setSupplierParseErrors(errors);
    } else {
      setParsedSuppliers([]);
      setSupplierParseErrors([]);
    }
  };

  const handleApplySupplierImport = () => {
    if (parsedSuppliers.length === 0) {
      alert('Tidak ada data supplier yang valid untuk diimpor.');
      return;
    }

    const count = importSuppliers(parsedSuppliers, supplierImportMode);
    alert(`Berhasil mengimpor ${count} data supplier ke sistem!`);
    setSupplierRawText('');
    setParsedSuppliers([]);
    setSupplierFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Pusat Data: Backup & Import / Export</h3>
              <p className="text-[11px] text-slate-400">
                Impor dan ekspor data stok, konversi satuan, supplier, dan PO secara instan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('backup_restore')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backup_restore'
                ? 'bg-white text-slate-900 border-t-2 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Full Backup & Restore (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('import_items')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'import_items'
                ? 'bg-white text-slate-900 border-t-2 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Import Master Barang (CSV/Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('import_suppliers')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'import_suppliers'
                ? 'bg-white text-slate-900 border-t-2 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Import Master Supplier (CSV)</span>
          </button>

          <button
            onClick={() => setActiveTab('export_reports')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'export_reports'
                ? 'bg-white text-slate-900 border-t-2 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Laporan (Excel/CSV)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FULL BACKUP & RESTORE JSON */}
          {activeTab === 'backup_restore' && (
            <div className="space-y-6">
              {/* Section: Download Backup */}
              <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600" />
                    Unduh File Backup Database Lengkap
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Menyimpan seluruh data sistem saat ini: <strong>{items.length} barang</strong>,{' '}
                    <strong>{suppliers.length} supplier</strong>, <strong>{purchaseOrders.length} PO</strong>,{' '}
                    <strong>{goodsReceipts.length} GRN</strong>.
                  </p>
                </div>
                <button
                  onClick={exportDatabaseJSON}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.JSON)</span>
                </button>
              </div>

              {/* Section: Restore Backup */}
              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Pulihkan / Restore Database dari File Backup
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih file JSON backup yang pernah Anda unduh sebelumnya untuk mengembalikan kondisi data.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center bg-slate-50/50 transition">
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleJsonFileUpload}
                    id="json-file-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="json-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 hover:underline">
                      {jsonFileName ? jsonFileName : 'Klik untuk pilih file backup (.json)'}
                    </span>
                    <span className="text-[11px] text-slate-400">File format JSON hasil ekspor sistem KIRI</span>
                  </label>
                </div>

                {jsonFileContent && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ringkasan Isi File Backup:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block">Master Barang</span>
                        <span className="font-bold">{jsonFileContent.items?.length || 0} items</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block">Supplier</span>
                        <span className="font-bold">{jsonFileContent.suppliers?.length || 0} vendor</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block">Purchase Orders</span>
                        <span className="font-bold">{jsonFileContent.purchaseOrders?.length || 0} PO</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block">Penerimaan GRN</span>
                        <span className="font-bold">{jsonFileContent.goodsReceipts?.length || 0} GRN</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleApplyFullRestore}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Terapkan Pemulihan Sekarang</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT MASTER BARANG (CSV/EXCEL) */}
          {activeTab === 'import_items' && (
            <div className="space-y-5">
              {/* Step 1: Download Template */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Langkah 1: Unduh Format Template CSV / Excel</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gunakan template resmi yang telah menyertakan kolom <strong>Satuan Dasar, Satuan Beli & Rasio Konversi</strong>.
                  </p>
                </div>
                <button
                  onClick={downloadTemplateWarehouseItemsCSV}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Template Excel (.CSV)</span>
                </button>
              </div>

              {/* Step 2: Upload or Paste */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Langkah 2: Upload File atau Tempel (Paste) Data CSV</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="itemMode"
                        checked={itemImportMode === 'merge'}
                        onChange={() => setItemImportMode('merge')}
                        className="text-indigo-600"
                      />
                      <span>Gabung / Update (Merge)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="itemMode"
                        checked={itemImportMode === 'replace'}
                        onChange={() => setItemImportMode('replace')}
                        className="text-rose-600"
                      />
                      <span>Ganti Semua Data (Replace)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center bg-slate-50/40 transition flex flex-col justify-center items-center">
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleItemCsvFileUpload}
                      id="item-csv-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="item-csv-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Upload className="w-6 h-6 text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-600">
                        {itemFileName ? itemFileName : 'Pilih File .CSV dari Komputer'}
                      </span>
                      <span className="text-[10px] text-slate-400">Format CSV (Pemisah Koma atau Titik Koma)</span>
                    </label>
                  </div>

                  {/* Direct Paste Box */}
                  <div>
                    <textarea
                      rows={4}
                      value={itemRawText}
                      onChange={(e) => handleItemTextChange(e.target.value)}
                      placeholder="Atau tempel (paste) teks baris CSV di sini..."
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Preview Table */}
              {parsedItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Pratinjau Data Siap Impor ({parsedItems.length} Barang):
                    </span>
                    <button
                      onClick={handleApplyItemImport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Impor {parsedItems.length} Barang ke Database</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2 border-b">SKU</th>
                          <th className="p-2 border-b">Nama Barang</th>
                          <th className="p-2 border-b">Kategori</th>
                          <th className="p-2 border-b">Satuan Gudang</th>
                          <th className="p-2 border-b">Satuan Beli</th>
                          <th className="p-2 border-b">Rasio Konversi</th>
                          <th className="p-2 border-b text-right">Stok Awal</th>
                          <th className="p-2 border-b text-right">Harga Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-[11px] font-semibold text-slate-700">{item.sku}</td>
                            <td className="p-2 font-medium text-slate-900">{item.name}</td>
                            <td className="p-2 text-slate-500">{item.category}</td>
                            <td className="p-2 text-slate-600 font-semibold">{item.unit || 'Pcs'}</td>
                            <td className="p-2 text-indigo-600 font-semibold">{item.purchaseUnit || item.unit || 'Pcs'}</td>
                            <td className="p-2 text-slate-700">
                              {item.conversionRatio && item.conversionRatio > 1
                                ? `1 ${item.purchaseUnit} = ${item.conversionRatio} ${item.unit}`
                                : '1 : 1'}
                            </td>
                            <td className="p-2 text-right font-mono">{item.currentStock || 0}</td>
                            <td className="p-2 text-right font-mono">Rp {(item.lastPurchasePrice || 0).toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMPORT MASTER SUPPLIER (CSV) */}
          {activeTab === 'import_suppliers' && (
            <div className="space-y-5">
              {/* Step 1: Download Template */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Langkah 1: Unduh Format Template CSV Supplier</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kolom mencakup: Kode, Nama Vendor, PIC, No Telepon/WA, Email, Alamat, Kota, Syarat TOP.
                  </p>
                </div>
                <button
                  onClick={downloadTemplateSuppliersCSV}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Template Supplier (.CSV)</span>
                </button>
              </div>

              {/* Step 2: Upload or Paste */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Langkah 2: Upload File atau Tempel (Paste) Data CSV</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="supMode"
                        checked={supplierImportMode === 'merge'}
                        onChange={() => setSupplierImportMode('merge')}
                        className="text-indigo-600"
                      />
                      <span>Gabung / Update (Merge)</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="supMode"
                        checked={supplierImportMode === 'replace'}
                        onChange={() => setSupplierImportMode('replace')}
                        className="text-rose-600"
                      />
                      <span>Ganti Semua (Replace)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center bg-slate-50/40 transition flex flex-col justify-center items-center">
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleSupplierCsvFileUpload}
                      id="sup-csv-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="sup-csv-input"
                      className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                    >
                      <Upload className="w-6 h-6 text-indigo-500" />
                      <span className="text-xs font-semibold text-indigo-600">
                        {supplierFileName ? supplierFileName : 'Pilih File .CSV Supplier'}
                      </span>
                      <span className="text-[10px] text-slate-400">File format CSV data rekanan</span>
                    </label>
                  </div>

                  <div>
                    <textarea
                      rows={4}
                      value={supplierRawText}
                      onChange={(e) => handleSupplierTextChange(e.target.value)}
                      placeholder="Atau tempel (paste) baris data supplier di sini..."
                      className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Preview Table */}
              {parsedSuppliers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Pratinjau Data Siap Impor ({parsedSuppliers.length} Supplier):
                    </span>
                    <button
                      onClick={handleApplySupplierImport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Impor {parsedSuppliers.length} Supplier ke Sistem</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] sticky top-0">
                        <tr>
                          <th className="p-2 border-b">Kode</th>
                          <th className="p-2 border-b">Nama Supplier</th>
                          <th className="p-2 border-b">PIC</th>
                          <th className="p-2 border-b">Telepon</th>
                          <th className="p-2 border-b">Email</th>
                          <th className="p-2 border-b">Kota</th>
                          <th className="p-2 border-b">TOP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {parsedSuppliers.map((sup, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-[11px] font-semibold text-slate-700">{sup.code}</td>
                            <td className="p-2 font-medium text-slate-900">{sup.name}</td>
                            <td className="p-2 text-slate-600">{sup.contactPerson}</td>
                            <td className="p-2 text-slate-600">{sup.phone}</td>
                            <td className="p-2 text-slate-600">{sup.email}</td>
                            <td className="p-2 text-slate-600">{sup.city}</td>
                            <td className="p-2 font-mono text-slate-600">{sup.paymentTermDefault}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXPORT LAPORAN EXCEL / CSV */}
          {activeTab === 'export_reports' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Pilih format data yang ingin Anda unduh dalam format spreadsheet Excel/CSV untuk rekapitulasi, pembukuan, atau audit internal:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Master Barang */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Package className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Master Data Barang Gudang</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Daftar seluruh SKU, nama barang, satuan stok, satuan beli, rasio konversi, jumlah stok saat ini, dan nilai aset.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setReportModalType('stock_valuation');
                        setIsReportModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Laporan PDF</span>
                    </button>
                    <button
                      onClick={() => exportWarehouseItemsCSV(items)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition border border-slate-200"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Stock Audit / Opname Fisik */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Lembar Audit Stok Opname Fisik</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Formulir cetak lembar kerja audit fisik lapangan (Stock Opname Sheet) lengkap dengan kolom paraf verifikator.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setReportModalType('stock_audit');
                      setIsReportModalOpen(true);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Lembar Opname Fisik PDF</span>
                  </button>
                </div>

                {/* Export Purchase Orders */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Rekap Purchase Orders (PO)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Riwayat seluruh surat pesanan PO, status pengiriman, nominal subtotal, pajak PPN, dan grand total.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setReportModalType('po_summary');
                        setIsReportModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Rekap PO PDF</span>
                    </button>
                    <button
                      onClick={() => exportPurchaseOrdersCSV(purchaseOrders)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition border border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Export Goods Receipts */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition space-y-3 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Rekap Penerimaan Barang (GRN)</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Catatan bukti penerimaan barang masuk ke gudang, no surat jalan supplier, dan status kondisi fisik barang.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {
                        setReportModalType('grn_summary');
                        setIsReportModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Rekap GRN PDF</span>
                    </button>
                    <button
                      onClick={() => exportGoodsReceiptsCSV(goodsReceipts)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition border border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Comprehensive Report Modal */}
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
    </div>
  );
};
