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
  Sparkles,
  RotateCcw,
  X,
  AlertTriangle,
  Minus,
  Layers,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { PRItem, PriorityLevel, WarehouseItem, PRStatus } from '../../types';
import { formatRupiah, formatDate } from '../../utils/formatters';

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

  // Wizard Step: 1 = Detail, 2 = Barang, 3 = Tinjau
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [confirmedAgreement, setConfirmedAgreement] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form Fields - Step 1: Detail
  const [department, setDepartment] = useState('Gudang & Logistik');
  const [requestorName, setRequestorName] = useState('');
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
          estimatedUnitPrice: initialItem.lastPurchasePrice || 0,
          notes: `Stok saat ini ${initialItem.currentStock} ${initialItem.unit} (Min: ${initialItem.minStock})`,
        },
      ]);
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  // Calculation helpers
  const totalEstimatedAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.estimatedUnitPrice || 0),
    0
  );

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
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextToStep3 = () => {
    if (validateStep2()) {
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
                estimatedUnitPrice: found.lastPurchasePrice || it.estimatedUnitPrice || 0,
              }
            : it
        )
      );
    }
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
          estimatedUnitPrice: item1.lastPurchasePrice || 25000,
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
          estimatedUnitPrice: item2.lastPurchasePrice || 120000,
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
          estimatedUnitPrice: 7500,
          notes: 'Bahan double wall tebal',
        },
        {
          id: `pri-${Date.now()}-2`,
          itemName: 'Lakban Bening 2 Inch Super Sticky',
          category: 'Kemasan & Packaging',
          unit: 'Roll',
          quantity: 36,
          estimatedUnitPrice: 14000,
          notes: 'Merek Daimaru atau setara',
        },
      ]);
    }
    setShowOptionsMenu(false);
    setValidationError(null);
  };

  // Reset form
  const handleResetForm = () => {
    setRequestorName('');
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

    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-xs md:p-4 md:items-center md:justify-center overflow-hidden animate-in fade-in duration-200">
      {/* Modal Container: Full Screen on Mobile, Rounded Card on Desktop */}
      <div className="flex flex-col w-full h-full md:max-w-xl md:h-[94vh] md:max-h-[850px] bg-white md:rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* TOP APP BAR / HEADER (Matching user screenshot) */}
        <div className="bg-[#0B192C] text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white active:scale-95 rounded-full transition"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Buat Permintaan Barang
              </h2>
              <p className="text-[11px] text-slate-300 font-normal">
                Purchase Request (PR)
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 text-slate-300 hover:text-white rounded-lg active:bg-slate-800 transition"
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
        <div className="bg-white border-b border-slate-100 px-6 py-3.5 shrink-0">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {/* Step 1: Detail */}
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
                Detail
              </span>
            </button>

            {/* Connecting line 1-2 */}
            <div
              className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${
                currentStep > 1 ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />

            {/* Step 2: Barang */}
            <button
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
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
                Barang
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
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-5 bg-white">
          
          {/* ======================================================== */}
          {/* STEP 1: DETAIL (INFORMASI PERMINTAAN)                    */}
          {/* ======================================================== */}
          {currentStep === 1 && (
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
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
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

              {/* Items List */}
              <div className="space-y-3.5">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 shadow-2xs transition hover:border-slate-300"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Item #{index + 1}
                        </span>
                        {item.sku && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono font-semibold">
                            {item.sku}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Warehouse Stock Selector (Optional helper) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pilih dari Stok Gudang (Opsional)
                      </label>
                      <div className="relative">
                        <select
                          value={item.itemId || ''}
                          onChange={(e) => handleSelectWarehouseStock(index, e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                        >
                          <option value="">-- Ketik nama manual atau pilih katalog stok --</option>
                          {warehouseItems.map((w) => (
                            <option key={w.id} value={w.id}>
                              [{w.sku}] {w.name} (Stok: {w.currentStock} {w.unit})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Item Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                        Nama Barang <span className="text-emerald-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={item.itemName}
                        onChange={(e) => handleUpdateItem(index, 'itemName', e.target.value)}
                        placeholder="Contoh: Lakban 2 Inch / Oli Mesin 10W-40"
                        className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kategori Barang
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateItem(index, 'category', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2 text-slate-700"
                      >
                        {ITEM_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Qty with Stepper Buttons & Satuan */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                          Jumlah (Qty) <span className="text-emerald-600">*</span>
                        </label>
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(index, 'quantity', Math.max(1, (item.quantity || 1) - 1))
                            }
                            className="p-2 text-slate-500 hover:text-slate-800 active:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <NumberInput
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 1)
                            }
                            className="w-full text-center text-xs sm:text-sm font-bold text-slate-900 focus:outline-none p-1.5"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(index, 'quantity', (item.quantity || 1) + 1)
                            }
                            className="p-2 text-slate-500 hover:text-slate-800 active:bg-slate-100"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                          Satuan Kemasan
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                          className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Estimasi Harga & Subtotal */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Est. Harga Satuan (Rp)
                        </label>
                        <NumberInput
                          type="number"
                          min="0"
                          value={item.estimatedUnitPrice || ''}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'estimatedUnitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Estimasi Subtotal
                        </label>
                        <div className="text-xs font-bold text-slate-900 p-2.5 bg-white rounded-xl border border-slate-200 truncate">
                          {formatRupiah((item.quantity || 0) * (item.estimatedUnitPrice || 0))}
                        </div>
                      </div>
                    </div>

                    {/* Item Notes */}
                    <div>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)}
                        placeholder="Spesifikasi / merk yang diinginkan (opsional)"
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 2 Grand Total Card */}
              <div className="p-3.5 bg-emerald-50/90 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                    Total Estimasi Biaya
                  </span>
                  <span className="text-xs text-emerald-700">
                    {items.length} macam barang
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-emerald-950">
                  {formatRupiah(totalEstimatedAmount)}
                </span>
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
                    onClick={() => setCurrentStep(1)}
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
                    onClick={() => setCurrentStep(2)}
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
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {it.quantity} {it.unit} @ {formatRupiah(it.estimatedUnitPrice || 0)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 block">
                          {formatRupiah((it.quantity || 0) * (it.estimatedUnitPrice || 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div className="p-3 bg-emerald-600 text-white rounded-xl flex items-center justify-between shadow-xs">
                  <span className="text-xs font-semibold">Total Estimasi Keseluruhan:</span>
                  <span className="text-base font-black">
                    {formatRupiah(totalEstimatedAmount)}
                  </span>
                </div>
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
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg flex items-center gap-3 z-10">
          
          {/* STEP 1 ACTIONS */}
          {currentStep === 1 && (
            <>
              <button
                type="button"
                onClick={() => handleSavePR('draft')}
                className="flex-1 py-3 px-3 border-2 border-emerald-600 active:bg-emerald-50 text-emerald-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
              >
                <Save className="w-4 h-4 text-emerald-700" />
                <span>Simpan Draft</span>
              </button>

              <button
                type="button"
                onClick={handleNextToStep2}
                className="flex-[1.4] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99]"
              >
                <span>Lanjut ke Barang</span>
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
                className="flex-1 py-3 px-3 border border-slate-300 active:bg-slate-100 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition"
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
                className={`flex-[1.5] py-3 px-4 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-[0.99] ${
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
