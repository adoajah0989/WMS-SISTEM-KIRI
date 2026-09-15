import React, { useState, useEffect } from 'react';
import {
  PurchaseOrder,
  GoodsReceipt,
  PurchaseRequisition,
  WarehouseItem,
  Supplier,
} from '../../types';
import {
  formatRupiah,
  formatDate,
  formatDateTime,
  getPaymentTermLabel,
  getPRStatusBadge,
  getPriorityBadge,
} from '../../utils/formatters';
import {
  Printer,
  X,
  CheckCircle2,
  Building,
  Phone,
  Mail,
  MapPin,
  QrCode,
  FileText,
  Layers,
  AlertTriangle,
  Download,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import { generateQRCodeDataUrl } from '../../utils/qrGenerator';

/* =========================================================================
   1. PURCHASE ORDER (PO) PRINT MODAL
   ========================================================================= */
interface POPrintModalProps {
  po: PurchaseOrder;
  onClose: () => void;
}

export const POPrintModal: React.FC<POPrintModalProps> = ({ po, onClose }) => {
  const [authQR, setAuthQR] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function makeQR() {
      const payload = JSON.stringify({
        doc: 'PO',
        poNumber: po.poNumber,
        vendor: po.supplierName,
        total: po.grandTotal,
        date: po.orderDate,
      });
      const url = await generateQRCodeDataUrl(payload, { width: 140, margin: 0 });
      if (isMounted && url) {
        setAuthQR(url);
      }
    }
    makeQR();
    return () => {
      isMounted = false;
    };
  }, [po]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:m-0">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Dokumen Resmi Purchase Order: {po.poNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                Format surat pesanan pengadaan resmi dengan kop & tanda tangan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
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

        {/* Document Printable Area */}
        <div className="printable-area p-8 sm:p-12 overflow-y-auto print:p-2 print:overflow-visible bg-white text-slate-900 font-sans text-xs">
          {/* Header & Logo */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center text-white font-black text-xl tracking-tighter">
                  K
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
                    KIRI PURCHASING
                  </h1>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                    PT KIRI INDONESIA SEJAHTERA
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">
                Kawasan Industri Terpadu Blok A-15, Jl. Industri Raya No. 88, Jakarta Barat 11720
                <br />
                Telp: (021) 555-8900 | Email: purchasing@kiri.co.id | NPWP: 01.345.678.9-034.000
              </p>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="inline-block bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-base sm:text-lg font-black tracking-wider uppercase mb-2">
                PURCHASE ORDER
              </div>
              <table className="text-xs text-right">
                <tbody>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">No. PO:</td>
                    <td className="font-bold text-slate-900 font-mono text-sm">{po.poNumber}</td>
                  </tr>
                  {po.prNumber && (
                    <tr>
                      <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Ref. PR:</td>
                      <td className="font-mono text-slate-700">{po.prNumber}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Tanggal Terbit:</td>
                    <td className="font-semibold text-slate-900">{formatDate(po.orderDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Target Kirim:</td>
                    <td className="font-semibold text-slate-900">{formatDate(po.expectedDeliveryDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor & Shipping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1.5 text-indigo-700">
                VENDOR / PENYEDIA BARANG:
              </span>
              <p className="font-bold text-sm text-slate-900">{po.supplierName}</p>
              <p className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{po.supplierAddress}</p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-600 space-y-0.5 text-[11px]">
                <p><span className="font-semibold text-slate-700">Kontak Person (PIC):</span> {po.supplierContactPerson || '-'}</p>
                <p><span className="font-semibold text-slate-700">Telepon / WA:</span> {po.supplierPhone}</p>
                <p><span className="font-semibold text-slate-700">Email:</span> {po.supplierEmail}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1.5 text-emerald-700">
                ALAMAT PENGIRIMAN & PEMBAYARAN:
              </span>
              <p className="font-bold text-sm text-slate-900">Gudang Logistik Inbound KIRI</p>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Kawasan Pergudangan Prima Blok C-4, Jl. Raya Kamal No. 12, Cengkareng, Jakarta Barat 11730
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-slate-600 space-y-0.5 text-[11px]">
                <p><span className="font-semibold text-slate-700">Syarat Pembayaran (TOP):</span> {getPaymentTermLabel(po.paymentTerm)}</p>
                <p><span className="font-semibold text-slate-700">Penerima Gudang:</span> Petugas Inbound Warehouse (Supardi)</p>
                <p><span className="font-semibold text-slate-700">Status PO:</span> <span className="font-bold text-slate-900 uppercase">{po.status.replace('_', ' ')}</span></p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-10">No</th>
                  <th className="py-2.5 px-3 font-bold w-28">Kode / SKU</th>
                  <th className="py-2.5 px-3 font-bold">Deskripsi & Nama Barang</th>
                  <th className="py-2.5 px-3 font-bold text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-center w-20">Satuan</th>
                  <th className="py-2.5 px-3 font-bold text-right w-28">Harga Satuan</th>
                  <th className="py-2.5 px-3 font-bold text-right w-16">Diskon</th>
                  <th className="py-2.5 px-3 font-bold text-right w-32">Subtotal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {po.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">{item.sku}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      <span>{item.unit}</span>
                      {item.conversionRatio && item.conversionRatio > 1 && (
                        <span className="block text-[9px] text-slate-500 font-medium">
                          (1:{item.conversionRatio} {item.stockUnit || 'Pcs'})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-mono">{formatRupiah(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{item.discountPercent ? `${item.discountPercent}%` : '-'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes & Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 text-xs break-inside-avoid">
            <div className="flex-1 space-y-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Catatan Pengiriman:</span>
                <p className="whitespace-pre-line leading-relaxed">{po.notes || 'Pengiriman wajib disertai surat jalan asli dan mencantumkan nomor PO ini.'}</p>
              </div>
              <div className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded-xl p-3 leading-relaxed">
                <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Syarat & Ketentuan Umum:</span>
                <p className="whitespace-pre-line">{po.termsAndConditions || '1. Barang harus tersegel, baru, dan sesuai standar spesifikasi mutu pabrikan.\n2. Pembayaran ditransfer sesuai tempo setelah Berita Acara Penerimaan Barang (GRN) terbit.'}</p>
              </div>
            </div>

            <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs shrink-0">
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Barang:</span>
                  <span className="font-semibold text-slate-900 font-mono">{formatRupiah(po.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PPN ({po.ppnPercent}%):</span>
                  <span className="font-semibold text-slate-900 font-mono">{formatRupiah(po.ppnAmount)}</span>
                </div>
                {po.shippingFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Pengiriman:</span>
                    <span className="font-semibold text-slate-900 font-mono">{formatRupiah(po.shippingFee)}</span>
                  </div>
                )}
                <div className="border-t-2 border-slate-300 pt-2.5 mt-1 flex justify-between text-sm font-black text-slate-900">
                  <span>TOTAL NILAI PO:</span>
                  <span className="text-emerald-700 font-mono text-base">{formatRupiah(po.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Verification Stamp */}
          <div className="pt-4 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-14 font-medium">Dibuat Oleh (Purchasing),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{po.issuedBy || 'Staff Pengadaan'}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Purchasing Department</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Disetujui Oleh (Direksi/Manajer),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{po.approvedBy || 'Manajer Operasional'}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Authorized Approval</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Konfirmasi Supplier / Rekanan,</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{po.supplierContactPerson || po.supplierName}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Tanda Tangan & Cap Stempel</p>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
              <div className="flex items-center gap-2">
                {authQR && <img src={authQR} alt="QR Auth" className="w-9 h-9" />}
                <div>
                  <span className="font-semibold text-slate-600 block">SISTEM INTEGRASI KIRI WMS & PURCHASING</span>
                  <span>Dokumen sah digital &bull; Dicetak: {new Date().toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono">DOC-ID: {po.id.slice(0, 12).toUpperCase()}</span>
                <span className="block">Halaman 1 dari 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. GOODS RECEIPT NOTE (GRN) PRINT MODAL
   ========================================================================= */
interface GRNPrintModalProps {
  grn: GoodsReceipt;
  onClose: () => void;
}

export const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ grn, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:m-0">
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Cetak Surat Bukti Penerimaan Barang (GRN): {grn.grnNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                Berita acara penerimaan barang masuk ke gudang & verifikasi fisik
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
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

        {/* Document Printable Area */}
        <div className="printable-area p-8 sm:p-12 overflow-y-auto print:p-2 print:overflow-visible bg-white text-slate-900 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                  K
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
                    KIRI PURCHASING & WMS
                  </h1>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                    DEPARTEMEN LOGISTIK & WAREHOUSE
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">
                Bukti Penerimaan Barang (Goods Receipt Note) - Verifikasi Fisik & Input Stok Otomatis
                <br />
                Gudang Pusat Inbound Dock, Jakarta Barat
              </p>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="inline-block bg-teal-800 text-white px-3.5 py-1.5 rounded-lg text-base sm:text-lg font-black tracking-wider uppercase mb-2">
                BUKTI PENERIMAAN BARANG
              </div>
              <table className="text-xs text-right">
                <tbody>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">No. Bukti (GRN):</td>
                    <td className="font-bold text-slate-900 font-mono text-sm">{grn.grnNumber}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">No. Referensi PO:</td>
                    <td className="font-bold text-slate-900 font-mono">{grn.poNumber}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">No. Surat Jalan (DO):</td>
                    <td className="font-semibold text-slate-900">{grn.deliveryOrderNo}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Tanggal Diterima:</td>
                    <td className="font-semibold text-slate-900">{formatDate(grn.receiveDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor & Warehouse Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Diterima Dari Rekanan (Vendor):</span>
              <p className="font-bold text-sm text-slate-900">{grn.supplierName}</p>
              <p className="text-slate-600 mt-1">Status Pengiriman: <span className="font-bold uppercase text-emerald-700">{grn.status.replace('_', ' ')}</span></p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Lokasi Penerimaan Gudang:</span>
              <p className="font-bold text-slate-900">{grn.warehouseLocation || 'Gudang Utama Inbound Dock A'}</p>
              <p className="text-slate-600 mt-1">Petugas Inbound: <span className="font-bold text-slate-900">{grn.receiverName}</span></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-10">No</th>
                  <th className="py-2.5 px-3 font-bold w-28">Kode SKU</th>
                  <th className="py-2.5 px-3 font-bold">Nama Barang</th>
                  <th className="py-2.5 px-3 font-bold text-center w-20">Qty PO</th>
                  <th className="py-2.5 px-3 font-bold text-center w-24">Qty Diterima</th>
                  <th className="py-2.5 px-3 font-bold text-center w-20">Satuan</th>
                  <th className="py-2.5 px-3 font-bold text-center w-24">Kondisi Fisik</th>
                  <th className="py-2.5 px-3 font-bold">Lokasi Rak / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {grn.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">{item.sku}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.orderedQuantity}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-800 text-sm">
                      {item.receivedQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700">
                      <span>{item.unit}</span>
                      {item.conversionRatio && item.conversionRatio > 1 && (
                        <span className="block text-[9px] text-emerald-700 font-bold">
                          (+{item.receivedQuantity * item.conversionRatio} {item.stockUnit || 'Pcs'})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.condition === 'baik' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {item.condition.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {item.warehouseLocation && (
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                          [{item.warehouseLocation}]
                        </span>
                      )}
                      {item.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs mb-6 break-inside-avoid">
            <span className="font-bold text-slate-800 block mb-1">Catatan Hasil Pemeriksaan:</span>
            <p className="text-slate-600 leading-relaxed">
              {grn.notes || 'Seluruh barang telah diperiksa fisik, jumlah kuantitas, kesesuaian spesifikasi, dan telah teralokasikan pada rak gudang masing-masing.'}
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-14 font-medium">Pengirim (Driver / Ekspedisi),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">( ................................... )</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Nama Terang & No. Telepon</p>
              </div>
              <div>
                <p className="text-slate-500 mb-14 font-medium">Petugas Pemeriksa Gudang,</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{grn.receiverName}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Staff Inbound Warehouse</p>
              </div>
              <div>
                <p className="text-slate-500 mb-14 font-medium">Kepala Gudang,</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">Rahmat Hidayat</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Warehouse Supervisor</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
              <span>Sistem Manajemen Pergudangan & Logistik KIRI &bull; Dicetak: {new Date().toLocaleString('id-ID')}</span>
              <span className="font-mono">GRN-ID: {grn.id.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. PURCHASE REQUISITION (PR) PRINT MODAL
   ========================================================================= */
interface PRPrintModalProps {
  pr: PurchaseRequisition;
  onClose: () => void;
}

export const PRPrintModal: React.FC<PRPrintModalProps> = ({ pr, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const priorityBadge = getPriorityBadge(pr.priority);
  const statusBadge = getPRStatusBadge(pr.status);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-4 sm:my-8 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:m-0">
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Cetak Formulir Permintaan Pembelian (PR): {pr.prNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                Formulir pengajuan pengadaan barang internal antar departemen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
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

        {/* Document Printable Area */}
        <div className="printable-area p-8 sm:p-12 overflow-y-auto print:p-2 print:overflow-visible bg-white text-slate-900 font-sans text-xs">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                  K
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
                    KIRI PURCHASING
                  </h1>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                    FORMULIR PERMINTAAN PEMBELIAN INTERNAL
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">
                Dokumen pengajuan pengadaan barang / suku cadang / bahan baku
              </p>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="inline-block bg-indigo-900 text-white px-3.5 py-1.5 rounded-lg text-base sm:text-lg font-black tracking-wider uppercase mb-2">
                PURCHASE REQUISITION
              </div>
              <table className="text-xs text-right">
                <tbody>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">No. PR:</td>
                    <td className="font-bold text-slate-900 font-mono text-sm">{pr.prNumber}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Tanggal Pengajuan:</td>
                    <td className="font-semibold text-slate-900">{formatDate(pr.requestDate)}</td>
                  </tr>
                  <tr>
                    <td className="text-slate-500 pr-2.5 py-0.5 font-medium">Tanggal Dibutuhkan:</td>
                    <td className="font-semibold text-slate-900">{formatDate(pr.requiredDate)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Department & Priority Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Departemen & Pemohon:</span>
              <p className="font-bold text-sm text-slate-900">{pr.department}</p>
              <p className="text-slate-700 mt-1">Nama PIC: <span className="font-semibold text-slate-900">{pr.requestorName}</span></p>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Prioritas & Status Pengajuan:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${priorityBadge.bg} ${priorityBadge.text}`}>
                  Prioritas: {priorityBadge.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${statusBadge.bg} ${statusBadge.text}`}>
                  Status: {statusBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs mb-5">
            <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wider">
              Tujuan & Keperluan Pembelian:
            </span>
            <p className="text-slate-700 leading-relaxed">{pr.purpose}</p>
          </div>

          {/* Items Table */}
          <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-10">No</th>
                  <th className="py-2.5 px-3 font-bold w-28">Kode SKU</th>
                  <th className="py-2.5 px-3 font-bold">Deskripsi & Nama Barang</th>
                  <th className="py-2.5 px-3 font-bold text-center w-16">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-center w-20">Satuan</th>
                  <th className="py-2.5 px-3 font-bold text-right w-28">Est. Harga Satuan</th>
                  <th className="py-2.5 px-3 font-bold text-right w-32">Total Estimasi (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pr.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">{item.sku || '-'}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-center text-slate-700">{item.unit}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-mono">{formatRupiah(item.estimatedUnitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(item.quantity * item.estimatedUnitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td colSpan={6} className="py-2.5 px-3 text-right text-slate-800 uppercase">
                    Total Estimasi Anggaran Pengadaan:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 font-mono text-sm">
                    {formatRupiah(pr.totalEstimatedAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-14 font-medium">Pemohon (Staff),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{pr.requestorName}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">{pr.department}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Kepala Departemen,</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">( ................................... )</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Departemen Head Approval</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Persetujuan Purchasing / Direksi,</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{pr.approvedBy || '( ................................... )'}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">{pr.approvedAt ? formatDate(pr.approvedAt) : 'Tanggal Persetujuan'}</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
              <span>Formulir PR KIRI Enterprise &bull; Dicetak: {new Date().toLocaleString('id-ID')}</span>
              <span className="font-mono">PR-ID: {pr.id.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. COMPREHENSIVE OFFICIAL REPORT PRINT MODAL (Gudang, Valuasi, Opname, PO, GRN)
   ========================================================================= */
interface ComprehensiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType?: 'stock_valuation' | 'stock_audit' | 'po_summary' | 'grn_summary';
  items: WarehouseItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
}

export const ComprehensiveReportModal: React.FC<ComprehensiveReportModalProps> = ({
  isOpen,
  onClose,
  reportType: initialReportType = 'stock_valuation',
  items,
  suppliers,
  purchaseOrders,
  goodsReceipts,
}) => {
  const [activeReport, setActiveReport] = useState<'stock_valuation' | 'stock_audit' | 'po_summary' | 'grn_summary'>(initialReportType);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    setActiveReport(initialReportType);
  }, [initialReportType]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const filteredItems = items.filter(
    (item) => categoryFilter === 'all' || item.category === categoryFilter
  );

  const totalAssetValue = filteredItems.reduce(
    (sum, item) => sum + item.currentStock * item.lastPurchasePrice,
    0
  );
  const totalPhysicalItems = filteredItems.reduce((sum, item) => sum + item.currentStock, 0);
  const criticalCount = filteredItems.filter((i) => i.currentStock <= i.minStock && i.currentStock > 0).length;
  const outOfStockCount = filteredItems.filter((i) => i.currentStock === 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-4 sm:my-8 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:m-0">
        {/* Modal Action Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Pusat Cetak Laporan Resmi (Executive Report Printout)
              </h3>
              <p className="text-[11px] text-slate-400">
                Laporan inventaris rapi, lembar opname audit fisik, dan rekapitulasi transaksi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan / Simpan PDF</span>
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

        {/* Controls Toolbar (No-Print) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 no-print text-xs shrink-0">
          {/* Report Type Tabs */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveReport('stock_valuation')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeReport === 'stock_valuation'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Laporan Valuasi Stok
            </button>
            <button
              onClick={() => setActiveReport('stock_audit')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeReport === 'stock_audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Lembar Kerja Stok Opname
            </button>
            <button
              onClick={() => setActiveReport('po_summary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeReport === 'po_summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Rekap Purchase Order
            </button>
            <button
              onClick={() => setActiveReport('grn_summary')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeReport === 'grn_summary'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Rekap Penerimaan (GRN)
            </button>
          </div>

          {(activeReport === 'stock_valuation' || activeReport === 'stock_audit') && (
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600">Filter Kategori:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="all">Semua Kategori ({items.length} Barang)</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Document Printable Area */}
        <div className="printable-area p-8 sm:p-12 overflow-y-auto print:p-2 print:overflow-visible bg-white text-slate-900 font-sans text-xs">
          {/* Header & Kop */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center text-white font-black text-xl tracking-tighter">
                  K
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none">
                    KIRI WAREHOUSE & PURCHASING
                  </h1>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                    PT KIRI INDONESIA SEJAHTERA &bull; DIVISI SUPPLY CHAIN & LOGISTIK
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-md">
                Kawasan Industri Terpadu Blok A-15, Jakarta Barat &bull; Telp: (021) 555-8900
              </p>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end">
              <div className="inline-block bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-sm sm:text-base font-black tracking-wider uppercase mb-1">
                {activeReport === 'stock_valuation' && 'LAPORAN POSISI STOK & VALUASI ASET GUDANG'}
                {activeReport === 'stock_audit' && 'LEMBAR KERJA AUDIT STOK OPNAME FISIK'}
                {activeReport === 'po_summary' && 'LAPORAN REKAPITULASI PURCHASE ORDER'}
                {activeReport === 'grn_summary' && 'LAPORAN REKAPITULASI PENERIMAAN BARANG (GRN)'}
              </div>
              <p className="text-[11px] text-slate-500">
                Tanggal Penarikan Data: <span className="font-bold text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
              <p className="text-[10px] text-slate-400">
                Kategori Filter: <span className="font-semibold text-slate-700">{categoryFilter === 'all' ? 'Semua Kategori' : categoryFilter}</span>
              </p>
            </div>
          </div>

          {/* REPORT 1: POSISI STOK & VALUASI */}
          {activeReport === 'stock_valuation' && (
            <div className="space-y-4">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Master SKU</span>
                  <span className="text-base font-black text-slate-900">{filteredItems.length} Barang</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Stok Fisik</span>
                  <span className="text-base font-black text-slate-900">{totalPhysicalItems} Unit</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Status Kritis / Habis</span>
                  <span className="text-base font-black text-amber-700">{criticalCount} Kritis / {outOfStockCount} Habis</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Nilai Valuasi Aset</span>
                  <span className="text-base font-black text-emerald-800 font-mono">{formatRupiah(totalAssetValue)}</span>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2 px-2.5 font-bold text-center w-8">No</th>
                      <th className="py-2 px-2.5 font-bold w-24">Kode SKU</th>
                      <th className="py-2 px-2.5 font-bold">Nama Barang</th>
                      <th className="py-2 px-2.5 font-bold">Kategori</th>
                      <th className="py-2 px-2.5 font-bold">Lokasi Rak</th>
                      <th className="py-2 px-2.5 font-bold text-center w-16">Stok Fisik</th>
                      <th className="py-2 px-2.5 font-bold text-center w-14">Min.</th>
                      <th className="py-2 px-2.5 font-bold text-center w-16">Status</th>
                      <th className="py-2 px-2.5 font-bold text-right w-24">Harga Beli</th>
                      <th className="py-2 px-2.5 font-bold text-right w-28">Total Nilai Aset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.map((item, idx) => {
                      const totalAsset = item.currentStock * item.lastPurchasePrice;
                      const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                      const isOut = item.currentStock === 0;

                      return (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2 px-2.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-800 text-[11px]">{item.sku}</td>
                          <td className="py-2 px-2.5 font-semibold text-slate-900">{item.name}</td>
                          <td className="py-2 px-2.5 text-slate-600">{item.category}</td>
                          <td className="py-2 px-2.5 text-slate-700 font-medium">{item.warehouseLocation}</td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-900">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-500">{item.minStock}</td>
                          <td className="py-2 px-2.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isOut ? 'bg-rose-100 text-rose-800' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isOut ? 'HABIS' : isLow ? 'KRITIS' : 'AMAN'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono text-slate-700">{formatRupiah(item.lastPurchasePrice)}</td>
                          <td className="py-2 px-2.5 text-right font-bold font-mono text-slate-900">{formatRupiah(totalAsset)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={9} className="py-2.5 px-3 text-right text-slate-900 uppercase">
                        TOTAL KESELURUHAN VALUASI ASET:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 font-mono text-sm">
                        {formatRupiah(totalAssetValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 2: LEMBAR STOK OPNAME AUDIT */}
          {activeReport === 'stock_audit' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Panduan Tim Pemeriksa Stok Opname:</span>
                  <p className="text-slate-600 text-[11px]">
                    Lakukan penghitungan fisik pada masing-masing rak, catat jumlah riil pada kolom 'Fisik Riil', beri tanda tangan petugas pada kolom verifikasi.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Tanggal Audit:</span>
                  <span className="font-bold text-slate-800 font-mono">____ / ____ / 2026</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2.5 px-2.5 font-bold text-center w-8">No</th>
                      <th className="py-2.5 px-2.5 font-bold w-24">Kode SKU</th>
                      <th className="py-2.5 px-2.5 font-bold">Nama Barang</th>
                      <th className="py-2.5 px-2.5 font-bold w-32">Lokasi Rak</th>
                      <th className="py-2.5 px-2.5 font-bold text-center w-20">Stok Sistem</th>
                      <th className="py-2.5 px-2.5 font-bold text-center w-24 bg-slate-800">Fisik Riil</th>
                      <th className="py-2.5 px-2.5 font-bold text-center w-20 bg-slate-800">Selisih (+/-)</th>
                      <th className="py-2.5 px-2.5 font-bold w-36">Kondisi & Catatan Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredItems.map((item, idx) => (
                      <tr key={item.id} className="h-10">
                        <td className="py-2 px-2.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800 text-[11px]">{item.sku}</td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2 px-2.5 text-slate-700 font-medium">{item.warehouseLocation}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-slate-800 bg-slate-50">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-2 px-2.5 text-center border-l border-r border-slate-300 font-bold"></td>
                        <td className="py-2 px-2.5 text-center border-r border-slate-300"></td>
                        <td className="py-2 px-2.5 text-slate-400 text-[10px]"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 3: REKAP PO */}
          {activeReport === 'po_summary' && (
            <div className="space-y-4">
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2.5 px-3 font-bold text-center w-8">No</th>
                      <th className="py-2.5 px-3 font-bold w-28">No. PO</th>
                      <th className="py-2.5 px-3 font-bold w-24">Tgl Pesan</th>
                      <th className="py-2.5 px-3 font-bold">Nama Supplier / Rekanan</th>
                      <th className="py-2.5 px-3 font-bold text-center w-20">Status</th>
                      <th className="py-2.5 px-3 font-bold text-center w-20">Termin</th>
                      <th className="py-2.5 px-3 font-bold text-right w-24">Subtotal</th>
                      <th className="py-2.5 px-3 font-bold text-right w-20">PPN</th>
                      <th className="py-2.5 px-3 font-bold text-right w-28">Grand Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {purchaseOrders.map((po, idx) => (
                      <tr key={po.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{po.poNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatDate(po.orderDate)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{po.supplierName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                            {po.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{po.paymentTerm}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatRupiah(po.subtotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatRupiah(po.ppnAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatRupiah(po.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={8} className="py-2.5 px-3 text-right text-slate-900 uppercase">
                        TOTAL AKUMULASI PENGADAAN PO:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 font-mono text-sm">
                        {formatRupiah(purchaseOrders.reduce((sum, p) => sum + p.grandTotal, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 4: REKAP GRN */}
          {activeReport === 'grn_summary' && (
            <div className="space-y-4">
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2.5 px-3 font-bold text-center w-8">No</th>
                      <th className="py-2.5 px-3 font-bold w-28">No. Bukti GRN</th>
                      <th className="py-2.5 px-3 font-bold w-28">Ref. No. PO</th>
                      <th className="py-2.5 px-3 font-bold w-24">Tgl Terima</th>
                      <th className="py-2.5 px-3 font-bold">Supplier</th>
                      <th className="py-2.5 px-3 font-bold">No. Surat Jalan</th>
                      <th className="py-2.5 px-3 font-bold text-center w-20">Status</th>
                      <th className="py-2.5 px-3 font-bold">Petugas Penerima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {goodsReceipts.map((grn, idx) => (
                      <tr key={grn.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{grn.grnNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{grn.poNumber}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatDate(grn.receiveDate)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{grn.supplierName}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{grn.deliveryOrderNo}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            {grn.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">{grn.receiverName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signatures for Official Report */}
          <div className="pt-8 mt-6 border-t-2 border-slate-900 break-inside-avoid">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-slate-500 mb-14 font-medium">Disiapkan Oleh (Staff),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">Staff Supply Chain & Inventory</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Inventory Controller</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Diverifikasi (Kepala Gudang),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">Rahmat Hidayat</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Warehouse Supervisor</p>
              </div>

              <div>
                <p className="text-slate-500 mb-14 font-medium">Disetujui Oleh (Manajer Keuangan/Direktur),</p>
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">Bambang Sugiarto, S.E., M.M.</div>
                <p className="text-[10px] text-slate-500 mt-0.5">Finance & Operations Director</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-400">
              <span>Laporan Resmi Enterprise Supply Chain KIRI WMS &bull; Dicetak: {new Date().toLocaleString('id-ID')}</span>
              <span>Dokumen Rahasia &bull; PT KIRI INDONESIA SEJAHTERA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
