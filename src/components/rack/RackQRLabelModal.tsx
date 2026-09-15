import { printDocument } from '../../utils/printDocument';
import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  QrCode,
  Download,
  Filter,
  CheckCircle2,
  Package,
  Layers,
  MapPin,
  Settings2,
  Sliders,
  Scissors,
  Check,
} from 'lucide-react';
import { WarehouseItem } from '../../types';
import { generateItemQRDataUrl } from '../../utils/qrGenerator';

interface RackQRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: WarehouseItem[];
  itemsList?: WarehouseItem[];
  preselectedItem?: WarehouseItem | null;
  preselectedItemId?: string;
}

export const RackQRLabelModal: React.FC<RackQRLabelModalProps> = ({
  isOpen,
  onClose,
  items,
  itemsList: propItemsList,
  preselectedItem,
  preselectedItemId: propPreselectedItemId,
}) => {
  const safeItems = items || propItemsList || [];
  const targetInitialId = propPreselectedItemId || preselectedItem?.id || (safeItems[0]?.id || '');

  const [printMode, setPrintMode] = useState<'single' | 'batch'>(
    targetInitialId ? 'single' : 'batch'
  );
  const [selectedItemId, setSelectedItemId] = useState<string>(targetInitialId);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact' | 'thermal'>('standard');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Print customization toggles
  const [showCutGuide, setShowCutGuide] = useState(true);
  const [showHeaderLogo, setShowHeaderLogo] = useState(true);
  const [showUnitConversion, setShowUnitConversion] = useState(true);
  const [showFooterDate, setShowFooterDate] = useState(true);

  // Sync selected item when preselectedItemId or preselectedItem changes
  useEffect(() => {
    const activeId = propPreselectedItemId || preselectedItem?.id;
    if (activeId) {
      setSelectedItemId(activeId);
      setPrintMode('single');
    } else if (!selectedItemId && safeItems.length > 0) {
      setSelectedItemId(safeItems[0]?.id || '');
    }
  }, [propPreselectedItemId, preselectedItem, safeItems]);

  // Generate QR codes for the items
  useEffect(() => {
    let isMounted = true;
    async function loadQRs() {
      setIsGenerating(true);
      const urls: Record<string, string> = {};

      const itemsToGen =
        printMode === 'single'
          ? safeItems.filter((i) => i.id === selectedItemId)
          : filterCategory === 'all'
          ? safeItems
          : safeItems.filter((i) => i.category === filterCategory);

      for (const item of itemsToGen) {
        try {
          const url = await generateItemQRDataUrl(item, {
            width: labelSize === 'compact' ? 140 : 180,
            margin: 0,
          });
          urls[item.id] = url;
        } catch (e) {
          console.error('Error generating QR for', item.sku, e);
        }
      }

      if (isMounted) {
        setQrCodeUrls(urls);
        setIsGenerating(false);
      }
    }

    if (isOpen) {
      loadQRs();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, printMode, selectedItemId, filterCategory, safeItems, labelSize]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(safeItems.map((i) => i.category)));

  const itemsToPrint =
    printMode === 'single'
      ? safeItems.filter((i) => i.id === selectedItemId)
      : filterCategory === 'all'
      ? safeItems
      : safeItems.filter((i) => i.category === filterCategory);

  const handlePrint = (event: React.MouseEvent<HTMLButtonElement>) => {
    void printDocument(event.currentTarget);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-2 sm:my-6 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:m-0">
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Cetak Stiker Label QR Rak & Lokasi Barang
              </h3>
              <p className="text-[11px] text-slate-400">
                Format label presisi dengan QR Code terkalibrasi untuk pemindaian instan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isGenerating || itemsToPrint.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label ({itemsToPrint.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode & Customization Controls Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 space-y-3 no-print text-xs shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
              <button
                onClick={() => setPrintMode('single')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  printMode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Satu Barang
              </button>
              <button
                onClick={() => setPrintMode('batch')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  printMode === 'batch'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cetak Massal ({safeItems.length} Barang)
              </button>
            </div>

            {/* Item or Category Selector */}
            {printMode === 'single' ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <label className="font-semibold text-slate-600 shrink-0">Pilih Barang:</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/30 truncate"
                >
                  {safeItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.sku}] {item.name} ({item.warehouseLocation || 'Rak Gudang'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="font-semibold text-slate-600">Filter Kategori:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="all">Semua Kategori ({safeItems.length} Barang)</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({safeItems.filter((x) => x.category === cat).length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Layout Presets */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Preset Ukuran:</span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setLabelSize('standard')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    labelSize === 'standard' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="2 Kolom A4 (100x65mm) - Standar Rak"
                >
                  Standar Rak (2 Kolom)
                </button>
                <button
                  onClick={() => setLabelSize('compact')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    labelSize === 'compact' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="3 Kolom A4 (70x42mm) - Stiker Lembar"
                >
                  Kompak (3 Kolom)
                </button>
                <button
                  onClick={() => setLabelSize('thermal')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    labelSize === 'thermal' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Thermal 80mm Roll"
                >
                  Thermal Roll 80mm
                </button>
              </div>
            </div>
          </div>

          {/* Optional Display Toggles */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={showCutGuide}
                onChange={(e) => setShowCutGuide(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Garis Panduan Potong (Cut Guide)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={showHeaderLogo}
                onChange={(e) => setShowHeaderLogo(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Header Kiri Warehouse</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={showUnitConversion}
                onChange={(e) => setShowUnitConversion(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Info Satuan & Konversi Beli</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <input
                type="checkbox"
                checked={showFooterDate}
                onChange={(e) => setShowFooterDate(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Tanggal & Petunjuk Tempel</span>
            </label>
          </div>
        </div>

        {/* Printable Preview Area */}
        <div className="printable-area flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-2 print:overflow-visible">
          {itemsToPrint.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 no-print">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Tidak ada barang yang dipilih untuk dicetak.</p>
            </div>
          ) : (
            <div
              className={`grid ${
                labelSize === 'thermal'
                  ? 'grid-cols-1 max-w-sm mx-auto gap-3 print:max-w-none print:w-full print:grid-cols-1 print:gap-3'
                  : labelSize === 'compact'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2'
                  : 'grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3'
              }`}
            >
              {itemsToPrint.map((item) => {
                const qrUrl = qrCodeUrls[item.id];
                return (
                  <div
                    key={item.id}
                    className={`sticker-card bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-sm relative overflow-hidden flex flex-col justify-between break-inside-avoid print:shadow-none ${
                      showCutGuide ? 'outline-1 outline-dashed outline-slate-300 print:outline-slate-400 m-1' : 'm-1'
                    }`}
                    style={{
                      minHeight: labelSize === 'compact' ? '170px' : labelSize === 'thermal' ? '190px' : '210px',
                    }}
                  >
                    {/* Header Banner */}
                    {showHeaderLogo && (
                      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-slate-900 text-emerald-400 flex items-center justify-center font-black text-[11px]">
                            K
                          </div>
                          <span className="font-extrabold text-[11px] tracking-wider uppercase text-slate-900">
                            KIRI WAREHOUSE
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {qrUrl && (
                            <a
                              href={qrUrl}
                              download={`QR-${item.sku}.png`}
                              className="no-print p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
                              title="Download PNG QR"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">
                            LOKASI RAK
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main Content: QR Code + Item Info */}
                    <div className="flex items-start gap-3 mb-1.5">
                      {/* QR Code Block */}
                      <div className="shrink-0 bg-white border border-slate-400 p-1 rounded-lg flex flex-col items-center justify-center">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={`QR ${item.sku}`}
                            className={
                              labelSize === 'compact'
                                ? 'w-20 h-20'
                                : labelSize === 'thermal'
                                ? 'w-24 h-24'
                                : 'w-26 h-26 sm:w-28 sm:h-28'
                            }
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                            Memuat QR...
                          </div>
                        )}
                        <span className="font-mono text-[8px] font-black text-slate-800 tracking-wider mt-0.5">
                          SCAN ME
                        </span>
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div>
                          <span className="font-mono text-xs font-black text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-300 inline-block">
                            {item.sku}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug mt-1 line-clamp-2">
                            {item.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {item.category}
                          </span>
                        </div>

                        {/* Location Box (High Contrast) */}
                        <div className="bg-amber-100 border-2 border-amber-500 px-2 py-0.5 rounded-md text-amber-950 text-xs font-black flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-amber-800 shrink-0" />
                          <span className="truncate">{item.warehouseLocation || 'Gudang Utama'}</span>
                        </div>

                        {/* Unit & Multi-UOM */}
                        {showUnitConversion && (
                          <div className="text-[10px] text-slate-600 pt-0.5 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span>Satuan Stok:</span>
                              <span className="font-bold text-slate-900">{item.unit}</span>
                            </div>
                            {item.conversionRatio && item.conversionRatio > 1 && item.purchaseUnit && (
                              <div className="flex items-center justify-between text-emerald-800 font-bold text-[9px]">
                                <span>Satuan Beli:</span>
                                <span>1 {item.purchaseUnit} = {item.conversionRatio} {item.unit}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer decoration & date */}
                    {showFooterDate && (
                      <div className="border-t border-dashed border-slate-300 pt-1 flex items-center justify-between text-[8px] text-slate-400 mt-1">
                        <span>* Tempel di posisi depan rak gudang</span>
                        <span>{new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between no-print text-xs">
          <div className="text-slate-500">
            Total <span className="font-bold text-slate-800">{itemsToPrint.length}</span> label rak siap dicetak
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating || itemsToPrint.length === 0}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
