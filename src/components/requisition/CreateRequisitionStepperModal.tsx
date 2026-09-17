import { NumberInput } from '../common/NumberInput';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  Calendar,
  Flag,
  Info,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Save,
  MoreVertical,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  X,
  AlertTriangle,
  Minus,
  Layers,
  Search,
  ListFilter,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { PRItem, PriorityLevel, WarehouseItem, PRStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../auth/AuthContext';

interface CreateRequisitionStepperModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: WarehouseItem | null;
  onSuccess?: () => void;
}

const DEPARTMENTS = [
  'Gudang & Logistik',
  'Maintenance & Utility',
  'Produksi & Finishing',
  'HRGA & Umum',
  'IT & Elektronik',
  'Komersial & Sales',
  'Quality Control & Lab',
];

const ITEM_CATEGORIES = [
  'Bahan Baku & Kimia Industri',
  'Kemasan & Packaging',
  'Sparepart & Maintenance',
  'ATK & Perlengkapan Kantor',
  'Perlengkapan Safety / K3',
  'Elektronik & Utility',
  'Umum & Operasional',
];

const COMMON_UNITS = ['Pcs', 'Box', 'Dus', 'Kg', 'Liter', 'Unit', 'Rim', 'Roll', 'Meter', 'Pack', 'Kaleng'];

export const CreateRequisitionStepperModal: React.FC<CreateRequisitionStepperModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  onSuccess,
}) => {
  const { items: warehouseItems, createPR } = usePurchasing();
  const { profile } = useAuth();

  // Wizard Step: 1 = Barang, 2 = Detail, 3 = Tinjau
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [confirmedAgreement, setConfirmedAgreement] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields - Step 1: Detail
  const [department, setDepartment] = useState('Gudang & Logistik');
  const [requestorName, setRequestorName] = useState(profile.fullName || profile.email || '');
  const [requiredDate, setRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<PriorityLevel>('sedang');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Form Fields - Step 2: Barang
  const [items, setItems] = useState<PRItem[]>([
    {
      id: `pri-${Date.now()}-0`,
      itemName: '',
      category: 'Kemasan & Packaging',
      unit: 'Pcs',
      quantity: 1,
      estimatedUnitPrice: 0,
      notes: '',
    },
  ]);
  const [stockPickerOpen, setStockPickerOpen] = useState(true);
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'empty' | 'critical' | 'low'>('all');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockRackFilter, setStockRackFilter] = useState('all');
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);

  const toggleItemDetails = (itemKey: string) => {
    setExpandedItemIds((current) => current.includes(itemKey)
      ? current.filter((id) => id !== itemKey)
      : [...current, itemKey]);
  };

  const stockCategories = Array.from(new Set(warehouseItems.map((item) => item.category).filter(Boolean))).sort();
  const stockRacks = Array.from(new Set(warehouseItems.map((item) => item.warehouseLocation).filter(Boolean))).sort();
  const recommendedWarehouseItems = warehouseItems
    .filter((item) => item.currentStock <= item.minStock)
    .filter((item) => {
      const query = stockSearch.trim().toLowerCase();
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
      const matchesCategory = stockCategoryFilter === 'all' || item.category === stockCategoryFilter;
      const matchesRack = stockRackFilter === 'all' || item.warehouseLocation === stockRackFilter;
      const matchesStatus = stockStatusFilter === 'all'
        || (stockStatusFilter === 'empty' && item.currentStock <= 0)
        || (stockStatusFilter === 'critical' && item.currentStock > 0 && item.currentStock <= item.minStock * 0.5)
        || (stockStatusFilter === 'low' && item.currentStock > item.minStock * 0.5 && item.currentStock <= item.minStock);
      return matchesSearch && matchesCategory && matchesRack && matchesStatus;
    })
    .sort((a, b) => (a.currentStock / Math.max(a.minStock, 1)) - (b.currentStock / Math.max(b.minStock, 1)));

  // Pre-fill if initialItem is provided (e.g. from Warehouse or Rack Scan)
  useEffect(() => {
    if (initialItem && isOpen) {
      setDepartment('Gudang & Logistik');
      setPurpose(`Restok persediaan minimum: ${initialItem.name} (${initialItem.sku})`);
      setPriority(initialItem.currentStock <= initialItem.minStock ? 'tinggi' : 'sedang');
      setItems([
        {
          id: `pri-${Date.now()}-init`,
          itemId: initialItem.id,
          sku: initialItem.sku,
          itemName: initialItem.name,
          category: initialItem.category || 'Sparepart & Maintenance',
          unit: initialItem.unit || 'Pcs',
          quantity: Math.max(1, (initialItem.minStock * 2) - initialItem.currentStock),
          estimatedUnitPrice: 0,
          notes: `Stok saat ini ${initialItem.currentStock} ${initialItem.unit} (Min: ${initialItem.minStock})`,
        },
      ]);
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  // Calculation helpers
  const totalEstimatedAmount = 0;

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    setValidationError(null);
    if (!department.trim()) {
      setValidationError('Silakan pilih Departemen pemohon.');
      return false;
    }
    if (!requestorName.trim()) {
      setValidationError('Mohon masukkan nama PIC Pemohon.');
      return false;
    }
    if (!requiredDate) {
      setValidationError('Mohon tentukan tanggal barang dibutuhkan.');
      return false;
    }
    if (!purpose.trim()) {
      setValidationError('Mohon tuliskan keperluan atau tujuan pengadaan barang.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    setValidationError(null);
    if (items.length === 0) {
      setValidationError('Harap tambahkan minimal 1 item barang yang diajukan.');
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemName.trim()) {
        setValidationError(`Item #${i + 1}: Nama barang tidak boleh kosong.`);
        return false;
      }
      if (!it.quantity || it.quantity <= 0) {
        setValidationError(`Item #${i + 1}: Jumlah kuantitas harus lebih dari 0.`);
        return false;
      }
    }
    return true;
  };

  // Step Navigation Handlers
  const handleNextToStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextToStep3 = () => {
    if (validateStep1()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setValidationError(null);
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  // Item row operations
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `pri-${Date.now()}-${prev.length}`,
        itemName: '',
        category: 'Kemasan & Packaging',
        unit: 'Pcs',
        quantity: 1,
        estimatedUnitPrice: 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // If only one, just clear it instead of removing row
      setItems([
        {
          id: `pri-${Date.now()}-reset`,
          itemName: '',
          category: 'Kemasan & Packaging',
          unit: 'Pcs',
          quantity: 1,
          estimatedUnitPrice: 0,
          notes: '',
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PRItem, value: any) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: value } : it))
    );
  };

  const handleSelectWarehouseStock = (index: number, itemId: string) => {
    if (!itemId) {
      handleUpdateItem(index, 'itemId', undefined);
      handleUpdateItem(index, 'sku', undefined);
      return;
    }
    const found = warehouseItems.find((w) => w.id === itemId);
    if (found) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === index
            ? {
                ...it,
                itemId: found.id,
                sku: found.sku,
                itemName: found.name,
                category: found.category || it.category,
                unit: found.unit || it.unit,
                estimatedUnitPrice: 0,
              }
            : it
        )
      );
    }
  };

  const handleToggleStockItem = (itemId: string) => {
    setSelectedStockIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]);
  };

  const handleApplyStockSelection = () => {
    const selected = warehouseItems.filter((item) => selectedStockIds.includes(item.id));
    if (!selected.length) {
      setValidationError('Pilih minimal satu barang kosong atau menipis sebelum menekan Apply.');
      return;
    }
    setItems((current) => {
      const populated = current.filter((item) => item.itemName.trim().length > 0);
      const existingIds = new Set(populated.map((item) => item.itemId).filter(Boolean));
      const additions: PRItem[] = selected.filter((item) => !existingIds.has(item.id)).map((item, index) => ({
        id: `pri-${Date.now()}-stock-${index}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        category: item.category,
        unit: item.purchaseUnit || item.unit,
        stockUnit: item.unit,
        conversionRatio: item.conversionRatio || 1,
        quantity: Math.max(1, Math.ceil(((item.minStock * 2) - item.currentStock) / Math.max(item.conversionRatio || 1, 1))),
        estimatedUnitPrice: 0,
        notes: `Otomatis dari stok: ${item.currentStock} ${item.unit}, minimum ${item.minStock} ${item.unit}`,
      }));
      return [...populated, ...additions];
    });
    if (!purpose.trim()) {
      setPurpose('Restok barang kosong dan menipis berdasarkan kontrol stok gudang');
    }
    setValidationError(null);
    setSelectedStockIds([]);
    setStockPickerOpen(false);
  };

  // Quick fill mock data for demonstration
  const handleLoadDemoData = () => {
    setDepartment('Gudang & Logistik');
    setRequestorName('Budi Santoso');
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setRequiredDate(d.toISOString().split('T')[0]);
    setPriority('sedang');
    setPurpose('Pengadaan kemasan kardus packing & bubble wrap untuk pengiriman batch Q4');
    setNotes('Harap prioritas pengiriman supplier yang bisa tempo 30 hari.');
    
    // Pick first 2 items from warehouse or mock items
    if (warehouseItems.length >= 2) {
      const item1 = warehouseItems[0];
      const item2 = warehouseItems[1];
      setItems([
        {
          id: `pri-${Date.now()}-1`,
          itemId: item1.id,
          sku: item1.sku,
          itemName: item1.name,
          category: item1.category,
          unit: item1.unit,
          quantity: 50,
          estimatedUnitPrice: 0,
          notes: 'Kualitas grade A',
        },
        {
          id: `pri-${Date.now()}-2`,
          itemId: item2.id,
          sku: item2.sku,
          itemName: item2.name,
          category: item2.category,
          unit: item2.unit,
          quantity: 20,
          estimatedUnitPrice: 0,
          notes: 'Tambahan buffer stok',
        },
      ]);
    } else {
      setItems([
        {
          id: `pri-${Date.now()}-1`,
          itemName: 'Kardus Master Box 40x30x25cm',
          category: 'Kemasan & Packaging',
          unit: 'Pcs',
          quantity: 200,
          estimatedUnitPrice: 0,
          notes: 'Bahan double wall tebal',
        },
        {
          id: `pri-${Date.now()}-2`,
          itemName: 'Lakban Bening 2 Inch Super Sticky',
          category: 'Kemasan & Packaging',
          unit: 'Roll',
          quantity: 36,
          estimatedUnitPrice: 0,
          notes: 'Merek Daimaru atau setara',
        },
      ]);
    }
    setShowOptionsMenu(false);
    setValidationError(null);
  };

  // Reset form
  const handleResetForm = () => {
    setRequestorName(profile.fullName || profile.email || '');
    setDepartment('Gudang & Logistik');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setRequiredDate(d.toISOString().split('T')[0]);
    setPriority('sedang');
    setPurpose('');
    setNotes('');
    setItems([
      {
        id: `pri-${Date.now()}-0`,
        itemName: '',
        category: 'Kemasan & Packaging',
        unit: 'Pcs',
        quantity: 1,
        estimatedUnitPrice: 0,
        notes: '',
      },
    ]);
    setCurrentStep(1);
    setShowOptionsMenu(false);
    setValidationError(null);
  };

  // Submit PR (Final or Draft)
  const handleSavePR = (status: PRStatus = 'menunggu_persetujuan') => {
    if (status === 'menunggu_persetujuan') {
      if (!validateStep1()) {
        setCurrentStep(1);
        return;
      }
      if (!validateStep2()) {
        setCurrentStep(2);
        return;
      }
    } else {
      // For draft, at least requestor or purpose should have some text
      if (!requestorName.trim() && !purpose.trim()) {
        setRequestorName('Draft Pemohon');
        setPurpose('Draft Pengajuan Permintaan Barang');
      }
    }

    createPR({
      requestDate: new Date().toISOString().split('T')[0],
      requiredDate,
      department,
      requestorName: requestorName || 'Pemohon',
      priority,
      purpose: purpose || 'Pengajuan kebutuhan barang',
      items: items.filter((i) => i.itemName.trim().length > 0),
      totalEstimatedAmount,
      notes,
      status,
    });

    handleResetForm();
    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#f8f7f4] animate-in fade-in duration-200">
      {/* Modal Container: Full Screen on Mobile, Rounded Card on Desktop */}
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f8f7f4]">
        
        {/* TOP APP BAR / HEADER (Matching user screenshot) */}
        <div className="bg-white text-[#242424] px-4 py-3.5 flex items-center justify-between border-b border-[#e7e5e0] shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-[#77766f] hover:text-[#222] active:scale-95 rounded-full transition"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#e5f6e1] border border-[#cae9c3] text-[#397c31] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#292929] leading-tight">
                Buat Permintaan Barang
              </h2>
              <p className="text-[11px] text-[#85847e] font-normal">
                Purchase Request (PR)
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 text-[#77766f] hover:text-[#222] rounded-lg active:bg-[#f0efeb] transition"
              aria-label="Menu Opsi"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showOptionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowOptionsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 text-slate-800 text-xs animate-in zoom-in-95 duration-100">
                  <button
                    onClick={handleLoadDemoData}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-emerald-50 text-emerald-700 font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Muat Contoh Data</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSavePR('draft');
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-700"
                  >
                    <Save className="w-4 h-4 text-slate-500" />
                    <span>Simpan Sebagai Draft</span>
                  </button>
                  <button
                    onClick={handleResetForm}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-rose-50 text-rose-600"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-500" />
                    <span>Kosongkan Form (Reset)</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-slate-50 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                    <span>Tutup Formulir</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* STEPPER PROGRESS BAR (Matching 1 - 2 - 3 design) */}
        <div className="bg-white border-b border-[#eceae5] px-6 py-3.5 shrink-0">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {/* Step 1: Barang */}
            <button
              onClick={() => setCurrentStep(1)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border-2 border-slate-300 text-slate-500'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                  currentStep === 1 || currentStep > 1
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Barang
              </span>
            </button>

            {/* Connecting line 1-2 */}
            <div
              className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${
                currentStep > 1 ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />

            {/* Step 2: Detail */}
            <button
              onClick={() => {
                if (validateStep2()) setCurrentStep(2);
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border-2 border-slate-300 text-slate-500'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <span
                className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                  currentStep === 2 || currentStep > 2
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Detail
              </span>
            </button>

            {/* Connecting line 2-3 */}
            <div
              className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${
                currentStep > 2 ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />

            {/* Step 3: Tinjau */}
            <button
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                    : 'bg-white border-2 border-slate-300 text-slate-500'
                }`}
              >
                3
              </div>
              <span
                className={`text-[11px] font-semibold mt-1.5 transition-colors ${
                  currentStep === 3
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Tinjau
              </span>
            </button>
          </div>
        </div>

        {/* VALIDATION ERROR BANNER */}
        {validationError && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1">{validationError}</span>
            <button
              onClick={() => setValidationError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-3 overflow-y-auto bg-[#f8f7f4] px-4 py-3 pb-28 sm:px-6 lg:px-8">
          
          {/* ======================================================== */}
          {/* STEP 1: DETAIL (INFORMASI PERMINTAAN)                    */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Section Header with Green Info Icon */}
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Informasi Permintaan
                </h3>
              </div>

              {/* Field: Departemen * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Departemen <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <select
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full pl-10 pr-9 py-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Field: PIC Pemohon * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  PIC Pemohon <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={requestorName}
                    onChange={(e) => {
                      setRequestorName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Nama pemohon"
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Field: Tanggal Dibutuhkan * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Tanggal Dibutuhkan <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={requiredDate}
                    onChange={(e) => {
                      setRequiredDate(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 pl-1">
                  Minimal H+1 dari tanggal pengajuan
                </p>
              </div>

              {/* Field: Prioritas (Segmented Pill Buttons) */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Flag className="w-3.5 h-3.5 text-slate-600" />
                  <span>Prioritas</span>
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPriority('rendah')}
                    className={`py-2.5 text-xs font-semibold rounded-xl transition ${
                      priority === 'rendah'
                        ? 'bg-white text-slate-900 border border-slate-300 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rendah
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority('sedang')}
                    className={`py-2.5 text-xs font-bold rounded-xl transition ${
                      priority === 'sedang'
                        ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sedang
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority('tinggi')}
                    className={`py-2.5 text-xs font-semibold rounded-xl transition ${
                      priority === 'tinggi' || priority === 'urgent'
                        ? 'bg-rose-50 text-rose-800 border-2 border-rose-500 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mendesak
                  </button>
                </div>
              </div>

              {/* Field: Keperluan / Alasan * */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Keperluan / Alasan <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Tujuan pengadaan barang..."
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-2xs resize-none"
                  />
                </div>
              </div>

              {/* Field: Catatan Tambahan (Opsional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Rekomendasi vendor tertentu / instruksi khusus..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: BARANG (DAFTAR BARANG & KEBUTUHAN)                */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Daftar Barang & Kebutuhan
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Total {items.length} item diajukan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-emerald-50 active:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Tambah Item</span>
                </button>
              </div>

              <div className="grid items-start gap-3 xl:grid-cols-[minmax(320px,0.42fr)_minmax(0,1fr)]">
                <div className="min-w-0 xl:sticky xl:top-0">
                  {/* Smart stock picker: choose first, edit quantity afterwards */}
              <section className="overflow-hidden rounded-2xl border border-[#dfddd7] bg-[#faf9f6]">
                <button
                  type="button"
                  onClick={() => setStockPickerOpen((value) => !value)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e5f6e1] text-[#397c31]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-xs text-[#333]">Ambil dari stok kosong & menipis</strong>
                      <span className="mt-0.5 block truncate text-[10px] text-[#85847e]">Pilih berdasarkan status, kategori, atau rak</span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-[#65645f] shadow-sm">{recommendedWarehouseItems.length} item</span>
                </button>

                {stockPickerOpen && <div className="border-t border-[#e7e5e0] bg-white p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999892]" />
                    <input value={stockSearch} onChange={(event) => setStockSearch(event.target.value)} placeholder="Cari nama barang atau SKU..." className="h-11 w-full rounded-xl border border-[#deddd7] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#76ca67] focus:ring-4 focus:ring-[#82dd70]/15" />
                  </div>

                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {([
                      ['all', 'Semua risiko'], ['empty', 'Kosong'], ['critical', 'Sekarat'], ['low', 'Menipis'],
                    ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setStockStatusFilter(value)} className={`min-h-9 shrink-0 rounded-xl px-3 text-[11px] font-semibold ${stockStatusFilter === value ? 'bg-[#252525] text-white' : 'border border-[#dfddd7] bg-white text-[#666]'}`}>{label}</button>)}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="relative"><ListFilter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999892]" /><select value={stockCategoryFilter} onChange={(event) => setStockCategoryFilter(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-[#dfddd7] bg-white pl-8 pr-2 text-xs text-[#555]"><option value="all">Semua kategori</option>{stockCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                    <label className="relative"><Layers className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999892]" /><select value={stockRackFilter} onChange={(event) => setStockRackFilter(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-[#dfddd7] bg-white pl-8 pr-2 text-xs text-[#555]"><option value="all">Semua rak</option>{stockRacks.map((rack) => <option key={rack} value={rack}>{rack}</option>)}</select></label>
                  </div>

                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-0.5">
                    {recommendedWarehouseItems.length === 0 ? <div className="rounded-xl bg-[#f5f4f0] p-5 text-center text-xs text-[#85847e]">Tidak ada barang yang cocok dengan filter.</div> : recommendedWarehouseItems.map((stockItem) => {
                      const checked = selectedStockIds.includes(stockItem.id);
                      const status = stockItem.currentStock <= 0 ? 'Kosong' : stockItem.currentStock <= stockItem.minStock * .5 ? 'Sekarat' : 'Menipis';
                      return <button key={stockItem.id} type="button" onClick={() => handleToggleStockItem(stockItem.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-[#72c862] bg-[#edf8ea]' : 'border-[#e7e5e0] bg-white'}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-[#5eaf51] bg-[#67bf59] text-white' : 'border-[#c8c6bf] bg-white text-transparent'}`}><Check className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><strong className="truncate text-xs text-[#333]">{stockItem.name}</strong><span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold ${status === 'Kosong' ? 'bg-[#ffe7e4] text-[#bd4943]' : status === 'Sekarat' ? 'bg-[#fff0df] text-[#b45f18]' : 'bg-[#fff6d9] text-[#947016]'}`}>{status}</span></span><span className="mt-1 block truncate text-[10px] text-[#85847e]">{stockItem.sku} · {stockItem.category} · {stockItem.warehouseLocation}</span></span>
                        <span className="shrink-0 text-right"><strong className="block text-sm tabular-nums text-[#333]">{stockItem.currentStock}</strong><span className="text-[9px] text-[#85847e]">{stockItem.unit} / min {stockItem.minStock}</span></span>
                      </button>;
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eceae5] pt-3">
                    <span className="text-[11px] text-[#77766f]">{selectedStockIds.length} barang dipilih</span>
                    <button type="button" onClick={handleApplyStockSelection} className="min-h-10 rounded-xl bg-[#252525] px-4 text-xs font-semibold text-white"><span className="text-[#82dd70]">Apply</span> ke PR</button>
                  </div>
                </div>}
                </section>
                </div>

                <div className="min-w-0 space-y-2">
                  {/* Compact item list: dense by default, full controls stay touch-friendly */}
              <div className="space-y-2">
                {items.map((item, index) => {
                  const itemKey = item.id || String(index);
                  const isExpanded = !item.itemName || expandedItemIds.includes(itemKey);
                  const stockItem = warehouseItems.find((warehouseItem) => warehouseItem.id === item.itemId);
                  return (
                    <div key={itemKey} className="rounded-xl border border-[#dfddd7] bg-white p-2.5 shadow-2xs">
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[minmax(0,1fr)_9.5rem_7rem] sm:items-end">
                        <div className="col-span-2 flex min-w-0 items-start gap-2.5 sm:col-span-1 sm:self-center">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e5f6e1] text-[11px] font-bold text-[#397c31]">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <p className="truncate text-[13px] font-bold leading-5 text-[#292929]">{item.itemName || `Item #${index + 1}`}</p>
                              <button type="button" onClick={() => handleRemoveItem(index)} className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#aaa8a1] hover:bg-[#fff0ee] hover:text-[#bd4943]" title="Hapus barang" aria-label={`Hapus ${item.itemName || `item ${index + 1}`}`}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                            <p className="truncate text-[9px] leading-4 text-[#85847e]">{item.sku || 'Belum memilih SKU'} · {item.category}</p>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-[10px] font-medium leading-none text-[#77766f]">Jumlah</label>
                          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-[#d8d6cf] bg-white">
                            <button type="button" onClick={() => handleUpdateItem(index, 'quantity', Math.max(1, (item.quantity || 1) - 1))} className="flex h-full w-9 shrink-0 items-center justify-center text-[#777] active:bg-[#f1f0ec]" aria-label="Kurangi jumlah"><Minus className="h-3.5 w-3.5" /></button>
                            <NumberInput type="number" min="1" value={item.quantity} onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 1)} className="min-w-0 flex-1 text-center text-xs font-bold text-[#292929] outline-none" />
                            <button type="button" onClick={() => handleUpdateItem(index, 'quantity', (item.quantity || 1) + 1)} className="flex h-full w-9 shrink-0 items-center justify-center text-[#292929] active:bg-[#f1f0ec]" aria-label="Tambah jumlah"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-medium leading-none text-[#77766f]">Satuan</label>
                          <select value={item.unit} onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)} className="h-9 w-full rounded-lg border border-[#d8d6cf] bg-white px-2.5 text-xs font-medium text-[#292929]">{COMMON_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                        </div>
                      </div>

                      <div className="mt-2 flex min-h-7 items-center justify-between gap-2 border-t border-[#eceae5] pt-2">
                        <button type="button" onClick={() => toggleItemDetails(itemKey)} className="flex min-h-7 items-center gap-1 text-left text-[11px] font-medium text-[#65645f]">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? 'Tutup detail' : 'Detail'}
                          {!isExpanded && <span className="hidden font-normal text-[#9a9892] sm:inline">· stok & catatan</span>}
                        </button>
                        <span className="shrink-0 rounded-md bg-[#fff4d6] px-2 py-1 text-[9px] font-semibold text-[#8c6417]">Harga setelah approval</span>
                      </div>

                      {isExpanded && <div className="mt-2 space-y-2.5 border-t border-[#eceae5] pt-2.5">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold text-[#666]">Pilih dari stok gudang</label>
                          <select value={item.itemId || ''} onChange={(e) => handleSelectWarehouseStock(index, e.target.value)} className="h-10 w-full rounded-lg border border-[#d8d6cf] bg-[#faf9f6] px-3 text-xs font-medium text-[#444]">
                            <option value="">Ketik manual / pilih katalog stok</option>
                            {warehouseItems.map((warehouseItem) => <option key={warehouseItem.id} value={warehouseItem.id}>[{warehouseItem.sku}] {warehouseItem.name} · stok {warehouseItem.currentStock} {warehouseItem.unit}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div><label className="mb-1 block text-[10px] font-semibold text-[#444]">Nama barang *</label><input type="text" required value={item.itemName} onChange={(e) => handleUpdateItem(index, 'itemName', e.target.value)} placeholder="Nama barang" className="h-10 w-full rounded-lg border border-[#d8d6cf] bg-white px-3 text-xs font-semibold text-[#292929]" /></div>
                          <div><label className="mb-1 block text-[10px] font-semibold text-[#666]">Kategori</label><select value={item.category} onChange={(e) => handleUpdateItem(index, 'category', e.target.value)} className="h-10 w-full rounded-lg border border-[#d8d6cf] bg-white px-3 text-xs text-[#555]">{ITEM_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f5f4f0] px-3 py-2">
                          <span className="text-[10px] text-[#85847e]">Stok saat ini</span>
                          <strong className="text-[11px] text-[#444]">{stockItem ? `${stockItem.currentStock} ${stockItem.unit} · minimum ${stockItem.minStock}` : 'Tidak terhubung ke stok'}</strong>
                        </div>
                        <input type="text" value={item.notes || ''} onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)} placeholder="Spesifikasi / merk (opsional)" className="h-10 w-full rounded-lg border border-[#d8d6cf] bg-white px-3 text-xs text-[#555]" />
                      </div>}
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-[#fff7df] rounded-2xl border border-[#ead9a7] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#795f22] uppercase tracking-wider block">
                    Harga belum diperlukan
                  </span>
                  <span className="text-xs text-[#8c7133]">
                    Diisi purchasing setelah PR disetujui
                  </span>
                </div>
                <span className="text-xs font-bold text-[#795f22]">{items.length} barang</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: TINJAU (RINGKASAN & KONFIRMASI)                  */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Section Header */}
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Tinjau Permintaan Barang
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Periksa kembali data sebelum dikirimkan untuk approval
                  </p>
                </div>
              </div>

              {/* Review Card 1: Info Permintaan */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Informasi Pengajuan
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Edit Detail
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Departemen</span>
                    <span className="font-bold text-slate-800">{department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">PIC Pemohon</span>
                    <span className="font-bold text-slate-800">{requestorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Tgl Dibutuhkan</span>
                    <span className="font-bold text-slate-800">{formatDate(requiredDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Prioritas</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        priority === 'tinggi' || priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : priority === 'sedang'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {priority}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 text-xs">
                  <span className="text-slate-500 block text-[11px]">Keperluan / Alasan:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{purpose}</p>
                </div>

                {notes && (
                  <div className="text-xs bg-white p-2 rounded-xl border border-slate-200 text-slate-600">
                    <strong className="text-slate-800">Catatan:</strong> {notes}
                  </div>
                )}
              </div>

              {/* Review Card 2: Items Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Daftar Barang ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Edit Barang
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {it.itemName || 'Item belum bernama'}
                          </span>
                          {it.sku && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              {it.sku}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{it.quantity} {it.unit}</div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-[#fff4d6] px-2 py-1 text-[10px] font-semibold text-[#8c6417]">Harga setelah approval</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#f5f4f0] text-[#666] rounded-xl text-xs">PR ini hanya mengajukan kebutuhan dan jumlah. Harga akan dicatat dari penawaran supplier setelah approval.</div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-2xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedAgreement}
                  onChange={(e) => setConfirmedAgreement(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  Saya menyatakan bahwa permintaan barang ini telah sesuai dengan kebutuhan operasional dan siap diajukan untuk proses approval.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* STICKY BOTTOM ACTION BAR (Matching user screenshot)      */}
        {/* ======================================================== */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[#e3e1da] bg-white/95 px-4 py-3 shadow-[0_-10px_26px_rgba(35,35,30,.08)] backdrop-blur-lg sm:px-6 lg:px-8" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          
          {/* STEP 1 ACTIONS */}
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={() => handleSavePR('draft')}
                className="flex-1 py-3 px-3 border-2 border-emerald-600 md:flex-none md:min-w-44 active:bg-emerald-50 text-emerald-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <Save className="w-4 h-4 text-emerald-700" />
                <span>Simpan Draft</span>
              </button>

              <button
                type="button"
                onClick={handleNextToStep2}
                className="flex-[1.4] py-3 px-4 bg-emerald-600 md:flex-none md:min-w-52 md:flex-none md:min-w-52 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99]"
              >
                <span>Lanjut ke Detail</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* STEP 2 ACTIONS */}
          {currentStep === 2 && (
            <>
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 px-3 border border-slate-300 md:flex-none md:min-w-40 md:flex-none md:min-w-40 active:bg-slate-100 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                onClick={handleNextToStep3}
                className="flex-[1.4] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99]"
              >
                <span>Lanjut ke Tinjau</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* STEP 3 ACTIONS */}
          {currentStep === 3 && (
            <>
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 px-3 border border-slate-300 active:bg-slate-100 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                disabled={!confirmedAgreement}
                onClick={() => handleSavePR('menunggu_persetujuan')}
                className={`flex-[1.5] py-3 px-4 text-white md:flex-none md:min-w-56 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] ${
                  confirmedAgreement
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-slate-400 cursor-not-allowed opacity-70'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Kirim Permintaan</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
