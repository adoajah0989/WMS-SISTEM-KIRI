import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  MapPin,
  Package,
  Layers,
  TrendingUp,
  Activity,
  Sliders,
  Plus,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { WarehouseItem } from '../../types';
import { generateRackQRPayload, generateQRCodeDataUrl } from '../../utils/qrGenerator';
import { formatRupiah, formatNumber } from '../../utils/formatters';

interface ItemQRQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WarehouseItem | null;
  onOpenCreatePR?: (item: WarehouseItem) => void;
  onOpenAdjust?: (item: WarehouseItem) => void;
  onOpenPrintLabel?: (item: WarehouseItem) => void;
  onOpenDeepTrack?: (item: WarehouseItem) => void;
}

export const ItemQRQuickModal: React.FC<ItemQRQuickModalProps> = ({
  isOpen,
  onClose,
  item,
  onOpenCreatePR,
  onOpenAdjust,
  onOpenPrintLabel,
  onOpenDeepTrack,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadQR() {
      if (item) {
        const payload = generateRackQRPayload(item);
        const url = await generateQRCodeDataUrl(payload, {
          width: 400,
          margin: 1,
          darkColor: '#0f172a',
          lightColor: '#ffffff',
        });
        if (isMounted && url) {
          setQrDataUrl(url);
        }
      }
    }

    if (isOpen && item) {
      loadQR();
      setIsCopied(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
  const isOut = item.currentStock === 0;
  const payloadString = generateRackQRPayload(item);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(payloadString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    setIsDownloading(true);

    try {
      // Create a canvas with a styled sticker label
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 750;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Outer border
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Header banner
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(10, 10, canvas.width - 20, 90);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('KIRI WAREHOUSE', 40, 65);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('RACK QR TAG', canvas.width - 40, 65);
        ctx.textAlign = 'left';

        // Load QR image into canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw QR in center
          ctx.drawImage(img, 120, 120, 360, 360);

          // SKU box
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(40, 500, canvas.width - 80, 50);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.strokeRect(40, 500, canvas.width - 80, 50);

          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`SKU: ${item.sku}`, canvas.width / 2, 534);

          // Item Name
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 26px sans-serif';
          let displayName = item.name;
          if (displayName.length > 32) displayName = displayName.slice(0, 30) + '...';
          ctx.fillText(displayName, canvas.width / 2, 590);

          // Location Box
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(60, 620, canvas.width - 120, 48);
          ctx.strokeStyle = '#f59e0b';
          ctx.strokeRect(60, 620, canvas.width - 120, 48);

          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(`Lokasi: ${item.warehouseLocation || 'Gudang Utama'}`, canvas.width / 2, 652);

          // Footer info
          ctx.fillStyle = '#64748b';
          ctx.font = '14px sans-serif';
          ctx.fillText(`Satuan: ${item.unit} | Safety Min: ${item.minStock} ${item.unit}`, canvas.width / 2, 705);

          // Convert to blob and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `QR-RAK-${item.sku}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
            setIsDownloading(false);
          }, 'image/png');
        };
        img.src = qrDataUrl;
      }
    } catch (e) {
      console.error('Failed to export QR canvas', e);
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                QR Code Rak & Master SKU
              </h3>
              <p className="text-[11px] text-slate-400">
                Pindai untuk pelacakan, opname, dan surat jalan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Main QR Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden">
            {/* Top Bar inside Card */}
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {item.sku}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

            {/* QR Code Graphic */}
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm relative group">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${item.sku}`}
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-xs text-slate-400">
                  Menghasilkan QR...
                </div>
              )}
              <div className="text-[10px] font-mono font-bold text-slate-500 mt-1 uppercase tracking-wider">
                KIRI RACK CODE
              </div>
            </div>

            {/* Item Details */}
            <div className="mt-3.5 w-full">
              <h4 className="font-bold text-base text-slate-900">{item.name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>

              {/* Location Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold mt-2">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{item.warehouseLocation || 'Gudang Utama'}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">Stok Gudang</span>
              <span className="font-bold text-slate-900 text-base">
                {formatNumber(item.currentStock)} {item.unit}
              </span>
              {item.conversionRatio && item.conversionRatio > 1 && item.purchaseUnit && (
                <span className="text-[10px] text-emerald-700 block font-medium mt-0.5">
                  ≈ {(item.currentStock / item.conversionRatio).toFixed(1).replace('.0', '')}{' '}
                  {item.purchaseUnit} (1:{item.conversionRatio})
                </span>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px] block">Batas Minimum</span>
              <span className="font-bold text-slate-700 text-base">
                {formatNumber(item.minStock)} {item.unit}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Harga: {formatRupiah(item.lastPurchasePrice)}
              </span>
            </div>
          </div>

          {/* QR Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPNG}
              disabled={isDownloading || !qrDataUrl}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[42px]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isDownloading ? 'Menyimpan...' : 'Download Stiker (PNG)'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenPrintLabel?.(item);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition min-h-[42px]"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Cetak Label Stiker</span>
            </button>
          </div>

          {/* Copy Payload & Deep Tracking Bar */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={handleCopyPayload}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition min-h-[38px]"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Payload Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Payload QR</span>
                </>
              )}
            </button>

            {onOpenDeepTrack && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDeepTrack(item);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition min-h-[38px]"
                title="Buka Dossier & Analisis Pelacakan Rak"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dossier Rak</span>
              </button>
            )}

            {onOpenAdjust && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdjust(item);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Penyesuaian Stok (Opname)"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}

            {onOpenCreatePR && item.currentStock <= item.minStock && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCreatePR(item);
                }}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                title="Buat Permintaan Pembelian"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
