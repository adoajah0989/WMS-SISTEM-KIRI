import { PRStatus, POStatus, PriorityLevel, StockCondition, MovementType } from '../types';

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('id-ID').format(val || 0);
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const getPRStatusBadge = (status: PRStatus) => {
  switch (status) {
    case 'draft':
      return { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
    case 'menunggu_persetujuan':
      return { label: 'Menunggu Persetujuan', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    case 'disetujui':
      return { label: 'Disetujui', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
    case 'ditolak':
      return { label: 'Ditolak', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    case 'dikonversi_ke_po':
      return { label: 'Sudah Jadi PO', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
  }
};

export const getPOStatusBadge = (status: POStatus) => {
  switch (status) {
    case 'draft':
      return { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
    case 'diterbitkan':
      return { label: 'Diterbitkan', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' };
    case 'terkirim':
      return { label: 'Terkirim ke Vendor', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' };
    case 'diterima_sebagian':
      return { label: 'Diterima Sebagian', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
    case 'selesai':
      return { label: 'Selesai / Lengkap', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
    case 'dibatalkan':
      return { label: 'Dibatalkan', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
  }
};

export const getPriorityBadge = (priority: PriorityLevel) => {
  switch (priority) {
    case 'rendah':
      return { label: 'Rendah', bg: 'bg-slate-100', text: 'text-slate-600' };
    case 'sedang':
      return { label: 'Sedang', bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'tinggi':
      return { label: 'Tinggi', bg: 'bg-orange-50', text: 'text-orange-700' };
    case 'urgent':
      return { label: 'URGENT', bg: 'bg-red-100', text: 'text-red-800', isUrgent: true };
    default:
      return { label: priority, bg: 'bg-slate-100', text: 'text-slate-600' };
  }
};

export const getConditionBadge = (condition: StockCondition) => {
  switch (condition) {
    case 'baik':
      return { label: 'Baik & Sesuai', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'rusak':
      return { label: 'Rusak / Reject', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'kurang':
      return { label: 'Kurang / Selisih', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
};

export const getMovementBadge = (type: MovementType) => {
  switch (type) {
    case 'penerimaan_po':
      return { label: 'Penerimaan PO (Masuk)', isPositive: true, color: 'text-emerald-700 bg-emerald-50' };
    case 'penyesuaian_masuk':
      return { label: 'Penyesuaian (+) Masuk', isPositive: true, color: 'text-blue-700 bg-blue-50' };
    case 'penyesuaian_keluar':
      return { label: 'Penyesuaian (-) Keluar', isPositive: false, color: 'text-amber-700 bg-amber-50' };
    case 'pengambilan_internal':
      return { label: 'Pengambilan Internal (-)', isPositive: false, color: 'text-slate-700 bg-slate-100' };
    case 'retur':
      return { label: 'Retur ke Vendor (-)', isPositive: false, color: 'text-rose-700 bg-rose-50' };
    case 'opname_adjustment':
      return { label: 'Penyesuaian Opname', isPositive: true, color: 'text-violet-700 bg-violet-50' };
    case 'transfer_keluar':
      return { label: 'Transfer ke Store (-)', isPositive: false, color: 'text-sky-700 bg-sky-50' };
  }
};

export const getPaymentTermLabel = (term: string) => {
  switch (term) {
    case 'cash':
      return 'Tunai (Cash)';
    case 'cod':
      return 'Cash on Delivery (COD)';
    case 'net_7':
      return 'Tempo 7 Hari (Net 7)';
    case 'net_14':
      return 'Tempo 14 Hari (Net 14)';
    case 'net_30':
      return 'Tempo 30 Hari (Net 30)';
    case 'dp_50_net_30':
      return 'DP 50% + Pelunasan 30 Hari';
    default:
      return term;
  }
};
