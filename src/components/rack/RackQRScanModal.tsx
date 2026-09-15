import { NumberInput } from '../common/NumberInput';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode,
  Camera,
  X,
  Search,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  ShoppingCart,
  FileText,
  TrendingDown,
  Activity,
  ArrowRight,
  Plus,
  Sliders,
  Printer,
  RotateCcw,
  Package,
  Layers,
  Upload,
  Calendar,
  User,
  Building2,
  Repeat,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { usePurchasing } from '../../context/PurchasingContext';
import {
  WarehouseItem,
  GoodsReceipt,
  PurchaseOrder,
  PurchaseRequisition,
  StockMovement,
} from '../../types';
import {
  formatRupiah,
  formatDate,
  formatDateTime,
  formatNumber,
  getPOStatusBadge,
  getPRStatusBadge,
  getMovementBadge,
} from '../../utils/formatters';
import { parseScannedQR } from '../../utils/qrGenerator';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface RackQRScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: WarehouseItem | null;
  preselectedItem?: WarehouseItem | null;
  onOpenCreatePRForItem?: (item: WarehouseItem) => void;
  onOpenCreatePR?: (item: WarehouseItem) => void;
  onOpenCreateGRNForPO?: (po: PurchaseOrder) => void;
  onOpenGRN?: (po: PurchaseOrder) => void;
  onOpenPrintLabelForItem?: (item: WarehouseItem) => void;
  onPrintLabel?: (item: WarehouseItem) => void;
}

export const RackQRScanModal: React.FC<RackQRScanModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  preselectedItem,
  onOpenCreatePRForItem: propsOnOpenCreatePRForItem,
  onOpenCreatePR,
  onOpenCreateGRNForPO: propsOnOpenCreateGRNForPO,
  onOpenGRN,
  onOpenPrintLabelForItem: propsOnOpenPrintLabelForItem,
  onPrintLabel,
}) => {
  const handleOpenCreatePR = propsOnOpenCreatePRForItem || onOpenCreatePR;
  const handleOpenCreateGRN = propsOnOpenCreateGRNForPO || onOpenGRN;
  const handleOpenPrintLabel = propsOnOpenPrintLabelForItem || onPrintLabel;
  const activeInitial = initialItem || preselectedItem || null;

  const {
    items = [],
    goodsReceipts = [],
    purchaseOrders = [],
    requisitions = [],
    stockMovements = [],
    adjustStock,
  } = usePurchasing();

  // Scanner UI States
  const [activeMode, setActiveMode] = useState<'camera' | 'search' | 'image'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<WarehouseItem | null>(activeInitial);

  // Detail Sub-Tab
  const [dossierTab, setDossierTab] = useState<
    'overview' | 'last_inbound' | 'active_pos' | 'requisitions' | 'daily_usage'
  >('overview');

  // Quick Adjustment in Rack Modal
  const [isQuickAdjustOpen, setIsQuickAdjustOpen] = useState(false);
  const [quickAdjustQty, setQuickAdjustQty] = useState(1);
  const [quickAdjustType, setQuickAdjustType] = useState<
    'pengambilan_internal' | 'penyesuaian_keluar' | 'penyesuaian_masuk'
  >('pengambilan_internal');
  const [quickAdjustReason, setQuickAdjustReason] = useState('Pengambilan operasional di rak');
  const [quickAdjustOperator, setQuickAdjustOperator] = useState('Petugas Lapangan');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const scannerContainerId = 'rack-camera-viewport-box';

  // Sync initial item if passed when opening modal
  useEffect(() => {
    if (isOpen && activeInitial) {
      setMatchedItem(activeInitial);
      setDossierTab('overview');
      setScanWarning(null);
    }
  }, [isOpen, activeInitial]);

  // Safe Stop Camera helper
  const safeStopCamera = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch (err) {
          // Non-critical stop warning
          console.debug('Safe camera stop warning:', err);
        }

        try {
          scanner.clear();
        } catch (err) {
          console.debug('Safe camera clear warning:', err);
        }
      }
    } finally {
      setIsCameraActive(false);
      setIsCameraStarting(false);
      isStartingRef.current = false;
      isStoppingRef.current = false;
    }
  }, []);

  // Handle successful code capture
  const handleSuccessfulScan = useCallback(
    async (rawText: string) => {
      if (!rawText) return;
      setScannedText(rawText);
      setScanWarning(null);

      // 1. Safely stop camera first so DOM is clean
      await safeStopCamera();

      // 2. Safely match item from items database
      try {
        const item = parseScannedQR(rawText, items);
        if (item) {
          setMatchedItem(item);
          setDossierTab('overview');
        } else {
          setMatchedItem(null);
          setScanWarning(
            `Kode QR terbaca: "${rawText.length > 50 ? rawText.slice(0, 47) + '...' : rawText}", namun SKU atau data barang tidak terdaftar di database master inventaris gudang.`
          );
        }
      } catch (err) {
        console.error('Error matching scanned QR:', err);
        setScanWarning('Gagal memproses format QR Code yang dipindai.');
      }
    },
    [items, safeStopCamera]
  );

  // Start Camera Scanner
  const startCamera = useCallback(async () => {
    if (isStartingRef.current || isStoppingRef.current) return;
    isStartingRef.current = true;
    setIsCameraStarting(true);
    setCameraError(null);
    setScanWarning(null);

    // Check mediaDevices support
    if (
      typeof window === 'undefined' ||
      !navigator ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        'Perangkat atau browser tidak mengizinkan akses langsung ke kamera. Silakan gunakan fitur Cari SKU Manual, Unggah Gambar QR, atau tombol Uji Coba Cepat di bawah.'
      );
      setIsCameraStarting(false);
      isStartingRef.current = false;
      return;
    }

    try {
      // Ensure previous instance is stopped
      if (scannerRef.current) {
        await safeStopCamera();
      }

      // Check if container element exists in DOM
      const container = document.getElementById(scannerContainerId);
      if (!container) {
        setIsCameraStarting(false);
        isStartingRef.current = false;
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 12,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Normal frame scan tick
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(
        'Kamera tidak dapat diakses (izin kamera belum diberikan atau sedang digunakan aplikasi lain). Silakan gunakan tab Cari SKU atau Unggah Foto QR.'
      );
      setIsCameraActive(false);
    } finally {
      setIsCameraStarting(false);
      isStartingRef.current = false;
    }
  }, [handleSuccessfulScan, safeStopCamera]);

  // Reset to scan another item
  const handleResetScan = () => {
    setMatchedItem(null);
    setScannedText(null);
    setScanWarning(null);
    setIsQuickAdjustOpen(false);
    setDossierTab('overview');
    if (activeMode === 'camera') {
      setTimeout(() => {
        startCamera();
      }, 150);
    }
  };

  // Lifecycle when modal opens in camera mode
  useEffect(() => {
    if (isOpen && activeMode === 'camera' && !matchedItem) {
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => {
        clearTimeout(timer);
        safeStopCamera();
      };
    } else {
      safeStopCamera();
    }
    return () => {
      safeStopCamera();
    };
  }, [isOpen, activeMode, matchedItem, startCamera, safeStopCamera]);

  // Handle Image File Scan
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError(null);
      setScanWarning(null);
      
      // Use temporary scan instance
      const tempId = 'rack-camera-upload-temp';
      let tempContainer = document.getElementById(tempId);
      if (!tempContainer) {
        tempContainer = document.createElement('div');
        tempContainer.id = tempId;
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);
      }

      const html5QrCode = new Html5Qrcode(tempId);
      const result = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      
      if (result) {
        handleSuccessfulScan(result);
      }
    } catch (err) {
      setCameraError('Kode QR tidak terdeteksi pada file gambar yang diunggah. Pastikan gambar jelas dan memuat kode QR.');
    }
  };

  if (!isOpen) return null;

  // Compute tracking analytics for the matched item
  const itemMovements = matchedItem
    ? (stockMovements || []).filter(
        (m) => m && (m.itemId === matchedItem.id || m.itemSku === matchedItem.sku)
      )
    : [];

  // 1. Last Goods Receipt (Kapan Terakhir Masuk)
  const itemGRNs: { grn: GoodsReceipt; itemDetail: any }[] = [];
  (goodsReceipts || []).forEach((grn) => {
    if (!grn || !Array.isArray(grn.items)) return;
    const foundItem = grn.items.find(
      (i) => i && (i.itemId === matchedItem?.id || i.sku === matchedItem?.sku)
    );
    if (foundItem) {
      itemGRNs.push({ grn, itemDetail: foundItem });
    }
  });
  itemGRNs.sort((a, b) => {
    const dateA = a.grn?.receiveDate ? new Date(a.grn.receiveDate).getTime() : 0;
    const dateB = b.grn?.receiveDate ? new Date(b.grn.receiveDate).getTime() : 0;
    return dateB - dateA;
  });
  const lastInbound = itemGRNs[0] || null;

  // 2. Active Orders In Flight (Order yang sedang berjalan)
  const activePOs = (purchaseOrders || []).filter((po) => {
    if (!po || po.status === 'selesai' || po.status === 'dibatalkan' || po.status === 'draft') return false;
    if (!Array.isArray(po.items)) return false;
    return po.items.some(
      (i) => i && (i.itemId === matchedItem?.id || i.sku === matchedItem?.sku)
    );
  });

  // 3. Purchase Requisitions (Pengajuan)
  const itemPRs = (requisitions || []).filter((pr) => {
    if (!pr || !Array.isArray(pr.items)) return false;
    return pr.items.some(
      (i) => i && (i.itemId === matchedItem?.id || i.sku === matchedItem?.sku)
    );
  });

  // 4. Daily Usage & Consumption Rate
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const outboundMovements = itemMovements.filter((m) => {
    if (!m || !m.date) return false;
    const isOutbound =
      m.type === 'pengambilan_internal' ||
      m.type === 'penyesuaian_keluar' ||
      m.type === 'retur';
    return isOutbound && new Date(m.date) >= thirtyDaysAgo;
  });

  const totalUsed30Days = outboundMovements.reduce(
    (acc, m) => acc + Math.abs(m.quantity || 0),
    0
  );
  const avgDailyUsage = totalUsed30Days > 0 ? parseFloat((totalUsed30Days / 30).toFixed(1)) : 0;
  const daysRunway =
    matchedItem && avgDailyUsage > 0
      ? Math.round(matchedItem.currentStock / avgDailyUsage)
      : null;

  // 7-day breakdown for mini usage chart
  const last7DaysBreakdown = [6, 5, 4, 3, 2, 1, 0].map((daysBack) => {
    const d = new Date();
    d.setDate(now.getDate() - daysBack);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });

    const dayOutbound = itemMovements
      .filter((m) => {
        if (!m || !m.date) return false;
        const mDate = m.date.split('T')[0];
        return (
          mDate === dateStr &&
          (m.type === 'pengambilan_internal' ||
            m.type === 'penyesuaian_keluar' ||
            m.type === 'retur')
        );
      })
      .reduce((sum, m) => sum + Math.abs(m.quantity || 0), 0);

    return { dateStr, dayName, qty: dayOutbound };
  });

  const maxDayQty = Math.max(...last7DaysBreakdown.map((d) => d.qty), 1);

  // Handle Quick Rack Stock Adjustment Execution
  const handleExecuteQuickAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedItem) return;

    adjustStock(
      matchedItem.id,
      quickAdjustQty,
      quickAdjustType,
      `RACK-ADJ-${Date.now().toString().slice(-4)}`,
      quickAdjustReason,
      quickAdjustOperator
    );

    // Refresh matched item stock
    const updated = items.find((i) => i.id === matchedItem.id);
    if (updated) {
      setMatchedItem(updated);
    }
    setIsQuickAdjustOpen(false);
  };

  return (
    <ErrorBoundary fallbackTitle="Kendala pada Modul Scanner QR">
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 overflow-hidden flex flex-col max-h-[94vh] border border-slate-200">
          {/* Modal Top Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Pelacakan Barang & Rak (QR Scanner)
                  </h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-semibold">
                    Live Tracking
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pindai kode QR stiker rak untuk mengecek status barang, order berjalan & usage
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                safeStopCamera();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector Tabs (Visible when no item selected yet) */}
          {!matchedItem && (
            <div className="bg-slate-100/90 border-b border-slate-200 p-2 flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0">
              <button
                onClick={() => {
                  setActiveMode('camera');
                  setCameraError(null);
                  setScanWarning(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeMode === 'camera'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Kamera Scanner</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('search');
                  safeStopCamera();
                  setScanWarning(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeMode === 'search'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Cari SKU / Rak</span>
              </button>

              <button
                onClick={() => {
                  setActiveMode('image');
                  safeStopCamera();
                  setScanWarning(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeMode === 'image'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Unggah Gambar QR</span>
              </button>
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
            {/* VIEW A: Scanner & Search Input (If no item matched) */}
            {!matchedItem && (
              <div className="max-w-xl mx-auto space-y-5">
                {/* Warning message if unrecognised QR scanned */}
                {scanWarning && (
                  <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-950">{scanWarning}</p>
                      <p className="mt-1 text-amber-800">
                        Pastikan stiker QR berasal dari sistem Kiri Purchasing atau pilih barang manual di daftar bawah.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setScanWarning(null);
                            if (activeMode === 'camera') startCamera();
                          }}
                          className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[11px] transition"
                        >
                          Coba Scan Lagi
                        </button>
                        <button
                          onClick={() => {
                            setActiveMode('search');
                            safeStopCamera();
                            setScanWarning(null);
                          }}
                          className="px-3 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-semibold text-[11px] transition"
                        >
                          Cari Nama / SKU Barang
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CAMERA SCANNER VIEWPORT */}
                {activeMode === 'camera' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="relative w-full max-w-sm mx-auto aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
                      <div id={scannerContainerId} className="w-full h-full" />
                      {(!isCameraActive || isCameraStarting) && !cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white/80 bg-slate-900">
                          <Camera className="w-12 h-12 text-emerald-400 animate-pulse mb-2" />
                          <span className="text-xs font-semibold">Mengaktifkan Lensa Kamera...</span>
                          <span className="text-[10px] text-slate-400 mt-1">Izinkan akses kamera pada peramban Anda</span>
                        </div>
                      )}
                    </div>

                    {cameraError && (
                      <div className="mt-3 bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 text-xs flex items-start gap-2.5 text-left">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-rose-900">Kamera Tidak Tersedia</p>
                          <p className="mt-0.5 text-rose-700">{cameraError}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveMode('search');
                                setCameraError(null);
                              }}
                              className="px-3 py-1 bg-rose-700 text-white rounded-lg font-bold text-[11px] hover:bg-rose-800"
                            >
                              Cari Barang Manual
                            </button>
                            <button
                              onClick={() => startCamera()}
                              className="px-3 py-1 bg-white border border-rose-300 text-rose-800 rounded-lg font-semibold text-[11px] hover:bg-rose-100"
                            >
                              Coba Hubungkan Ulang
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-3 font-medium">
                      Arahkan kamera smartphone atau webcam ke stiker QR Code yang terpasang di rak gudang.
                    </p>
                  </div>
                )}

                {/* MANUAL SEARCH SKU / NAME */}
                {activeMode === 'search' && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="Ketik SKU barang (contoh: SKU-1001), nama barang, atau nomor rak..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                      />
                    </div>

                    {/* Search Results List */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                      {items
                        .filter((i) => {
                          if (!i) return false;
                          if (!manualSearch) return true;
                          const q = manualSearch.toLowerCase();
                          const sku = (i.sku || '').toLowerCase();
                          const name = (i.name || '').toLowerCase();
                          const loc = (i.warehouseLocation || '').toLowerCase();
                          return sku.includes(q) || name.includes(q) || loc.includes(q);
                        })
                        .slice(0, 10)
                        .map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setMatchedItem(item);
                              setDossierTab('overview');
                            }}
                            className="w-full p-3 text-left hover:bg-indigo-50/50 flex items-center justify-between transition text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {item.sku}
                                </span>
                                <span className="font-semibold text-slate-900">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-600" />
                                  {item.warehouseLocation || 'Gudang Utama'}
                                </span>
                                <span>&bull;</span>
                                <span>
                                  Stok:{' '}
                                  <strong>
                                    {item.currentStock} {item.unit}
                                  </strong>
                                </span>
                              </div>
                            </div>
                            <span className="text-indigo-600 font-bold text-[11px] hover:underline flex items-center gap-1">
                              Pilih <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* IMAGE UPLOAD SCAN */}
                {activeMode === 'image' && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                    <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 transition cursor-pointer bg-slate-50/60 flex flex-col items-center justify-center relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload className="w-10 h-10 text-indigo-500 mb-2" />
                      <span className="font-bold text-slate-800 text-sm">
                        Pilih Foto / Screenshot QR Code
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        Mendukung format JPG, PNG, WEBP dari galeri atau kamera
                      </span>
                    </div>

                    {cameraError && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs flex items-center gap-2 text-left">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* QUICK SIMULATION PRESET CHIPS (1-Click Test for Staff) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Uji Coba Cepat (Pilih Barang di Rak):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMatchedItem(item);
                          setDossierTab('overview');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium border border-slate-200 transition"
                      >
                        <span className="font-mono font-bold text-indigo-700">{item.sku}</span>
                        <span className="truncate max-w-[120px]">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B: RICH ITEM & RACK TRACKING DOSSIER */}
            {matchedItem && (
              <div className="space-y-4">
                {/* TOP ITEM HERO CARD */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-150">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
                          {matchedItem.sku}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">
                          {matchedItem.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          <span>Rak: {matchedItem.warehouseLocation || 'Gudang Utama'}</span>
                        </div>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                        {matchedItem.name}
                      </h2>
                      {matchedItem.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{matchedItem.description}</p>
                      )}
                    </div>

                    {/* Actions Header */}
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                      <button
                        onClick={() => handleOpenPrintLabel?.(matchedItem)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
                        title="Cetak Stiker Label QR Rak"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Cetak QR</span>
                      </button>
                      <button
                        onClick={handleResetScan}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Scan Ulang</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                    {/* Current Stock */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Stok Fisik di Rak
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-slate-900">
                          {matchedItem.currentStock}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {matchedItem.unit}
                        </span>
                      </div>
                      {matchedItem.conversionRatio && matchedItem.conversionRatio > 1 && (
                        <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                          ≈{' '}
                          {(matchedItem.currentStock / matchedItem.conversionRatio)
                            .toFixed(1)
                            .replace('.0', '')}{' '}
                          {matchedItem.purchaseUnit} (1:{matchedItem.conversionRatio})
                        </span>
                      )}
                    </div>

                    {/* Safety Stock */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Safety Buffer (Min)
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-slate-900">
                          {matchedItem.minStock}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {matchedItem.unit}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold block mt-0.5 ${
                          matchedItem.currentStock <= matchedItem.minStock
                            ? 'text-rose-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {matchedItem.currentStock === 0
                          ? 'Stok Kosong!'
                          : matchedItem.currentStock <= matchedItem.minStock
                          ? 'Stok Menipis!'
                          : 'Kondisi Aman'}
                      </span>
                    </div>

                    {/* Daily Burn Rate */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Usage Rata-rata Harian
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-indigo-700">
                          {avgDailyUsage}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {matchedItem.unit}/hari
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {daysRunway !== null
                          ? `Estimasi tahan ~${daysRunway} hari`
                          : 'Belum ada data'}
                      </span>
                    </div>

                    {/* In-Flight Orders */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Order Berjalan (PO)
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-amber-700">
                          {activePOs.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">PO Aktif</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {activePOs.length > 0
                          ? 'Sedang dalam pengiriman'
                          : 'Tidak ada PO berjalan'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOSSIER SUB-TABS */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setDossierTab('overview')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      dossierTab === 'overview'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Ringkasan Lengkap</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('last_inbound')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      dossierTab === 'last_inbound'
                        ? 'border-teal-600 text-teal-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Kapan Terakhir Masuk ({itemGRNs.length})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('active_pos')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      dossierTab === 'active_pos'
                        ? 'border-amber-600 text-amber-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Order Berjalan ({activePOs.length})</span>
                    {activePOs.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </button>

                  <button
                    onClick={() => setDossierTab('requisitions')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      dossierTab === 'requisitions'
                        ? 'border-blue-600 text-blue-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pengajuan (PR) ({itemPRs.length})</span>
                  </button>

                  <button
                    onClick={() => setDossierTab('daily_usage')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      dossierTab === 'daily_usage'
                        ? 'border-purple-600 text-purple-700 bg-white'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    <span>Usage & Mutasi</span>
                  </button>
                </div>

                {/* TAB 1: OVERVIEW / RINGKASAN LENGKAP */}
                {dossierTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Last Inbound Highlight Card */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                            <Truck className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">
                            Penerimaan Terakhir (Masuk Gudang)
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          Last Inbound
                        </span>
                      </div>

                      {lastInbound ? (
                        <div className="bg-teal-50/50 border border-teal-100 p-3 rounded-lg text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tanggal Masuk:</span>
                            <span className="font-bold text-slate-900">
                              {formatDate(lastInbound.grn.receiveDate)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">No. Surat Penerimaan:</span>
                            <span className="font-mono font-bold text-teal-800">
                              {lastInbound.grn.grnNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Referensi PO:</span>
                            <span className="font-mono font-medium text-slate-800">
                              {lastInbound.grn.poNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Supplier:</span>
                            <span className="font-semibold text-slate-900">
                              {lastInbound.grn.supplierName}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-teal-200/60 pt-1 mt-1">
                            <span className="text-slate-600 font-semibold">Jumlah Diterima:</span>
                            <span className="font-extrabold text-teal-800 text-sm">
                              +{lastInbound.itemDetail.receivedQuantity} {lastInbound.itemDetail.unit}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Penerima: {lastInbound.grn.receiverName}</span>
                            <span className="capitalize">
                              Kondisi: {lastInbound.itemDetail.condition}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-lg text-xs text-slate-500">
                          Belum ada riwayat penerimaan barang masuk untuk item ini.
                        </div>
                      )}
                    </div>

                    {/* Active POs Highlight Card */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-900">
                            Order Berjalan (Sedang Ditunggu)
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          In-Flight POs
                        </span>
                      </div>

                      {activePOs.length > 0 ? (
                        <div className="space-y-2">
                          {activePOs.map((po) => {
                            const poItem = po.items.find(
                              (i) => i.itemId === matchedItem.id || i.sku === matchedItem.sku
                            );
                            const remaining = Math.max(
                              0,
                              (poItem?.quantity || 0) - (poItem?.receivedQuantity || 0)
                            );

                            return (
                              <div
                                key={po.id}
                                className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-amber-900">
                                    {po.poNumber}
                                  </span>
                                  {(() => {
                                    const b = getPOStatusBadge(po.status);
                                    return (
                                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${b.bg} ${b.text} ${b.border}`}>
                                        {b.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>
                                    Vendor: <strong>{po.supplierName}</strong>
                                  </span>
                                  <span>ETA: {formatDate(po.expectedDeliveryDate)}</span>
                                </div>
                                <div className="flex justify-between border-t border-amber-200/60 pt-1 font-medium">
                                  <span>
                                    Total PO: {poItem?.quantity} {poItem?.unit}
                                  </span>
                                  <span className="text-amber-800 font-bold">
                                    Sisa Belum Tiba: {remaining} {poItem?.unit}
                                  </span>
                                </div>
                                <div className="pt-1">
                                  <button
                                    onClick={() => {
                                      onClose();
                                      handleOpenCreateGRN?.(po);
                                    }}
                                    className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded-lg transition text-center flex items-center justify-center gap-1"
                                  >
                                    <Truck className="w-3 h-3" />
                                    <span>Input Penerimaan Barang (GRN)</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-lg text-xs text-slate-500">
                          Tidak ada pesanan pembelian (PO) yang sedang berjalan untuk barang ini.
                        </div>
                      )}
                    </div>

                    {/* Quick Rack Actions Bar */}
                    <div className="md:col-span-2 bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-indigo-950">
                          Aksi Cepat Petugas Lapangan di Rak
                        </h4>
                        <p className="text-xs text-indigo-800">
                          Catat pengambilan stok internal atau buat pengajuan pembelian langsung
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setIsQuickAdjustOpen(true)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                        >
                          <Sliders className="w-4 h-4" />
                          <span>Ambil / Mutasi Stok</span>
                        </button>

                        <button
                          onClick={() => {
                            onClose();
                            handleOpenCreatePR?.(matchedItem);
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl shadow-2xs transition"
                        >
                          <Plus className="w-4 h-4 text-emerald-600" />
                          <span>Ajukan PR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: KAPAN TERAKHIR MASUK */}
                {dossierTab === 'last_inbound' && (
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Riwayat Penerimaan Barang Masuk (Inbound GRN)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Daftar surat penerimaan barang dan kedatangan dari vendor
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-full">
                        Total: {itemGRNs.length} Dokumen
                      </span>
                    </div>

                    {itemGRNs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-xl">
                        Belum ada riwayat penerimaan barang masuk.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {itemGRNs.map(({ grn, itemDetail }) => (
                          <div
                            key={grn.id}
                            className="p-3.5 bg-white hover:bg-slate-50/80 transition text-xs space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  {grn.grnNumber}
                                </span>
                                <span className="text-slate-500">&bull;</span>
                                <span className="font-semibold text-slate-900">
                                  {grn.supplierName}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px]">
                                Tgl Masuk: <strong>{formatDate(grn.receiveDate)}</strong> (
                                {formatDateTime(grn.createdAt)})
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg text-[11px]">
                              <div>
                                <span className="text-slate-400 block">No. Ref PO:</span>
                                <span className="font-mono font-medium text-slate-800">
                                  {grn.poNumber}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">No. Surat Jalan:</span>
                                <span className="font-medium text-slate-800">
                                  {grn.deliveryOrderNo}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Jumlah Masuk:</span>
                                <span className="font-bold text-emerald-700 text-xs">
                                  +{itemDetail.receivedQuantity} {itemDetail.unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Pemeriksa:</span>
                                <span className="font-medium text-slate-800">
                                  {grn.receiverName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ORDER YANG SEDANG BERJALAN (ACTIVE POS DETAIL) */}
                {dossierTab === 'active_pos' && (
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Purchase Order yang Sedang Berjalan (In-Flight)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Pesanan resmi ke supplier yang sedang menunggu pengiriman atau parsial
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                        {activePOs.length} PO Aktif
                      </span>
                    </div>

                    {activePOs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-xl">
                        Tidak ada Purchase Order yang sedang berjalan untuk item ini.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activePOs.map((po) => {
                          const poItem = po.items.find(
                            (i) => i.itemId === matchedItem.id || i.sku === matchedItem.sku
                          );
                          const qtyOrdered = poItem?.quantity || 0;
                          const qtyReceived = poItem?.receivedQuantity || 0;
                          const remaining = Math.max(0, qtyOrdered - qtyReceived);
                          const progressPct =
                            qtyOrdered > 0 ? Math.round((qtyReceived / qtyOrdered) * 100) : 0;

                          return (
                            <div
                              key={po.id}
                              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900 text-sm">
                                      {po.poNumber}
                                    </span>
                                    {(() => {
                                      const b = getPOStatusBadge(po.status);
                                      return (
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${b.bg} ${b.text} ${b.border}`}>
                                          {b.label}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    Supplier: <strong>{po.supplierName}</strong> (
                                    {po.supplierPhone})
                                  </p>
                                </div>

                                <div className="text-left sm:text-right text-xs">
                                  <span className="text-slate-500">Estimasi Tiba (ETA):</span>
                                  <p className="font-bold text-slate-900 text-sm">
                                    {formatDate(po.expectedDeliveryDate)}
                                  </p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div>
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                  <span className="text-slate-600">
                                    Progres Kedatangan: {qtyReceived} / {qtyOrdered} {poItem?.unit}{' '}
                                    ({progressPct}%)
                                  </span>
                                  <span className="text-amber-700 font-bold">
                                    Sisa Belum Tiba: {remaining} {poItem?.unit}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    onClose();
                                    handleOpenCreateGRN?.(po);
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs transition"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Input Penerimaan Barang (GRN)</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: PENGAJUAN (PURCHASE REQUISITIONS) */}
                {dossierTab === 'requisitions' && (
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Riwayat & Status Pengajuan Pembelian (PR)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Permintaan pengadaan dari user/divisi untuk barang ini
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          handleOpenCreatePR?.(matchedItem);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat PR Baru</span>
                      </button>
                    </div>

                    {itemPRs.length === 0 ? (
                      <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-xl">
                        Belum ada permintaan pembelian (PR) untuk item ini.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {itemPRs.map((pr) => {
                          const prItem = pr.items.find(
                            (i) => i.itemId === matchedItem.id || i.sku === matchedItem.sku
                          );
                          return (
                            <div
                              key={pr.id}
                              className="p-3.5 bg-white hover:bg-slate-50 transition text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900">
                                    {pr.prNumber}
                                  </span>
                                  {(() => {
                                    const b = getPRStatusBadge(pr.status);
                                    return (
                                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${b.bg} ${b.text} ${b.border}`}>
                                        {b.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <span className="text-slate-500 text-[11px]">
                                  Tgl Dibutuhkan: <strong>{formatDate(pr.requiredDate)}</strong>
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-slate-600">
                                <span>
                                  Peminta: <strong>{pr.requestorName}</strong> ({pr.department})
                                </span>
                                <span>
                                  Qty Diajukan:{' '}
                                  <strong className="text-slate-900 font-bold">
                                    {prItem?.quantity} {prItem?.unit}
                                  </strong>
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded">
                                Keperluan: "{pr.purpose}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: USAGE HARIAN & MUTASI STOK */}
                {dossierTab === 'daily_usage' && (
                  <div className="space-y-4">
                    {/* Daily Consumption Analytics Card */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          Analisis Usage Harian & Tren Pemakaian
                        </h4>
                        <p className="text-xs text-slate-500">
                          Tingkat konsumsi barang di rak berdasarkan kartu stok pengeluaran 7-30
                          hari terakhir
                        </p>
                      </div>

                      {/* 7-Day Mini Bar Chart */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 block mb-3">
                          Pemakaian 7 Hari Terakhir:
                        </span>
                        <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
                          {last7DaysBreakdown.map((d) => {
                            const heightPct =
                              maxDayQty > 0 ? Math.round((d.qty / maxDayQty) * 100) : 0;
                            return (
                              <div
                                key={d.dateStr}
                                className="flex flex-col items-center gap-1 h-full justify-end"
                              >
                                <span className="text-[10px] font-bold text-slate-700">
                                  {d.qty > 0 ? `${d.qty}` : '0'}
                                </span>
                                <div
                                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${
                                    d.qty > 0 ? 'bg-indigo-600' : 'bg-slate-200'
                                  }`}
                                  style={{ height: `${Math.max(8, heightPct)}%` }}
                                />
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {d.dayName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Usage Key Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-purple-50 border border-purple-200/80 p-3 rounded-xl">
                          <span className="text-purple-700 font-semibold block">
                            Rata-rata Usage Harian
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black text-purple-900">
                              {avgDailyUsage}
                            </span>
                            <span className="text-slate-600 font-semibold">
                              {matchedItem.unit}/hari
                            </span>
                          </div>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl">
                          <span className="text-indigo-700 font-semibold block">
                            Total Pemakaian 30 Hari
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black text-indigo-900">
                              {totalUsed30Days}
                            </span>
                            <span className="text-slate-600 font-semibold">
                              {matchedItem.unit}
                            </span>
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
                          <span className="text-emerald-700 font-semibold block">
                            Ketahanan Stok (Runway)
                          </span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-black text-emerald-900">
                              {daysRunway !== null ? `~${daysRunway}` : '-'}
                            </span>
                            <span className="text-slate-600 font-semibold">Hari</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Movements List */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900">
                          Kartu Stok & Log Mutasi Rak
                        </h4>
                        <span className="text-xs font-semibold text-slate-500">
                          {itemMovements.length} Catatan
                        </span>
                      </div>

                      {itemMovements.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-xl">
                          Belum ada riwayat mutasi stok untuk barang ini.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                          {itemMovements.map((mov) => (
                            <div
                              key={mov.id}
                              className="p-3 text-xs flex items-center justify-between gap-2 hover:bg-slate-50"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const b = getMovementBadge(mov.type);
                                    return (
                                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${b.color}`}>
                                        {b.label}
                                      </span>
                                    );
                                  })()}
                                  <span className="font-mono text-slate-700 font-semibold">
                                    {mov.referenceNo}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">{mov.notes}</p>
                                <span className="text-[10px] text-slate-400">
                                  {formatDateTime(mov.date)} &bull; Oleh: {mov.operator}
                                </span>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`text-sm font-extrabold block ${
                                    mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}{' '}
                                  {matchedItem.unit}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Sisa Stok: {mov.newStock} {matchedItem.unit}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* QUICK ADJUSTMENT MODAL / DRAWER */}
                {isQuickAdjustOpen && (
                  <div className="bg-indigo-900/90 text-white p-5 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-bold text-sm">
                          Mutasi Cepat di Rak: {matchedItem.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => setIsQuickAdjustOpen(false)}
                        className="p-1 text-indigo-300 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleExecuteQuickAdjustment} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-indigo-200 mb-1 font-semibold">
                            Jenis Mutasi:
                          </label>
                          <select
                            value={quickAdjustType}
                            onChange={(e) => setQuickAdjustType(e.target.value as any)}
                            className="w-full bg-indigo-950 border border-indigo-700 text-white rounded-lg p-2 font-medium"
                          >
                            <option value="pengambilan_internal">
                              Pengambilan Internal / Pemakaian
                            </option>
                            <option value="penyesuaian_keluar">
                              Penyesuaian Keluar (Rusak/Hilang)
                            </option>
                            <option value="penyesuaian_masuk">
                              Penyesuaian Masuk (Stok Temuan)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-indigo-200 mb-1 font-semibold">
                            Jumlah ({matchedItem.unit}):
                          </label>
                          <NumberInput
                            type="number"
                            min="1"
                            required
                            value={quickAdjustQty}
                            onChange={(e) => setQuickAdjustQty(parseInt(e.target.value) || 1)}
                            className="w-full bg-indigo-950 border border-indigo-700 text-white rounded-lg p-2 font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-indigo-200 mb-1 font-semibold">
                            Alasan / Keperluan:
                          </label>
                          <input
                            type="text"
                            required
                            value={quickAdjustReason}
                            onChange={(e) => setQuickAdjustReason(e.target.value)}
                            placeholder="Contoh: Pemakaian divisi produksi / sampling lab"
                            className="w-full bg-indigo-950 border border-indigo-700 text-white rounded-lg p-2"
                          />
                        </div>

                        <div>
                          <label className="block text-indigo-200 mb-1 font-semibold">
                            Nama Petugas:
                          </label>
                          <input
                            type="text"
                            required
                            value={quickAdjustOperator}
                            onChange={(e) => setQuickAdjustOperator(e.target.value)}
                            className="w-full bg-indigo-950 border border-indigo-700 text-white rounded-lg p-2"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickAdjustOpen(false)}
                          className="px-3 py-1.5 bg-indigo-800 text-indigo-200 hover:text-white rounded-lg font-semibold"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm"
                        >
                          Simpan Mutasi Stok
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
