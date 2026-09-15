import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  Eye,
  AlertCircle,
  Building,
  Calendar,
  User,
  Clock,
  Layers,
  FileCheck,
  Printer,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { PurchaseRequisition, PRItem, PRStatus, PriorityLevel } from '../../types';
import {
  formatRupiah,
  formatDate,
  getPRStatusBadge,
  getPriorityBadge,
} from '../../utils/formatters';
import { PRPrintModal } from '../common/PrintTemplates';

interface RequisitionViewProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  onConvertToPOFromPR: (pr: PurchaseRequisition) => void;
}

export const RequisitionView: React.FC<RequisitionViewProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  onConvertToPOFromPR,
}) => {
  const {
    requisitions,
    items: warehouseItems,
    suppliers,
    createPR,
    updatePRStatus,
    deletePR,
  } = usePurchasing();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [printPR, setPrintPR] = useState<PurchaseRequisition | null>(null);

  // Approval/Reject Modal State
  const [approvalModalPR, setApprovalModalPR] = useState<PurchaseRequisition | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approverName, setApproverName] = useState('Manajer Operasional');
  const [rejectReason, setRejectReason] = useState('');

  // Form State for Creating PR
  const [formDepartment, setFormDepartment] = useState('Gudang & Logistik');
  const [formRequestor, setFormRequestor] = useState('');
  const [formRequiredDate, setFormRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formPriority, setFormPriority] = useState<PriorityLevel>('sedang');
  const [formPurpose, setFormPurpose] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<PRItem[]>([
    {
      id: `pri-${Date.now()}`,
      itemName: '',
      category: 'Bahan Baku & Kimia Industri',
      unit: 'Pcs',
      quantity: 1,
      estimatedUnitPrice: 0,
      notes: '',
    },
  ]);

  // Departments list
  const departments = ['Semua Departemen', 'Gudang & Logistik', 'Maintenance & Utility', 'Produksi & Finishing', 'HRGA & Umum', 'IT & Elektronik', 'Komersial & Sales'];

  // Filtered PR list
  const filteredPRs = requisitions.filter((pr) => {
    const matchStatus = statusFilter === 'all' || pr.status === statusFilter;
    const matchDept = departmentFilter === 'all' || pr.department === departmentFilter;
    const matchSearch =
      searchQuery === '' ||
      pr.prNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.requestorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.items.some((i) => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchDept && matchSearch;
  });

  // Handler for adding item row in PR form
  const handleAddItemRow = () => {
    setFormItems((prev) => [
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

  // Handler for selecting existing warehouse item
  const handleSelectWarehouseItem = (index: number, itemId: string) => {
    const selected = warehouseItems.find((w) => w.id === itemId);
    if (!selected) return;

    setFormItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              itemId: selected.id,
              sku: selected.sku,
              itemName: selected.name,
              category: selected.category,
              unit: selected.unit,
              estimatedUnitPrice: selected.lastPurchasePrice,
            }
          : item
      )
    );
  };

  const handleUpdateItemRow = (index: number, field: keyof PRItem, value: any) => {
    setFormItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitPR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRequestor.trim() || !formPurpose.trim()) {
      alert('Mohon lengkapi nama pemohon dan tujuan keperluan barang.');
      return;
    }
    if (formItems.some((i) => !i.itemName.trim() || i.quantity <= 0)) {
      alert('Pastikan seluruh item memiliki nama barang dan jumlah kuantitas lebih dari 0.');
      return;
    }

    const totalEstimatedAmount = formItems.reduce(
      (sum, item) => sum + item.quantity * (item.estimatedUnitPrice || 0),
      0
    );

    createPR({
      requestDate: new Date().toISOString().split('T')[0],
      requiredDate: formRequiredDate,
      department: formDepartment,
      requestorName: formRequestor,
      priority: formPriority,
      purpose: formPurpose,
      items: formItems,
      totalEstimatedAmount,
      notes: formNotes,
    });

    setIsCreateModalOpen(false);
    // Reset form
    setFormRequestor('');
    setFormPurpose('');
    setFormNotes('');
    setFormItems([
      {
        id: `pri-${Date.now()}`,
        itemName: '',
        category: 'Kemasan & Packaging',
        unit: 'Pcs',
        quantity: 1,
        estimatedUnitPrice: 0,
        notes: '',
      },
    ]);
  };

  const handleConfirmApproval = () => {
    if (!approvalModalPR) return;
    if (approvalAction === 'approve') {
      updatePRStatus(approvalModalPR.id, 'disetujui', approverName);
    } else {
      if (!rejectReason.trim()) {
        alert('Mohon masukkan alasan penolakan.');
        return;
      }
      updatePRStatus(approvalModalPR.id, 'ditolak', rejectReason);
    }
    setApprovalModalPR(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Permintaan Barang (PR)</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-800">
              Purchase Requisition
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengajuan permintaan barang internal sebelum diterbitkan menjadi Purchase Order (PO).
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[42px] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat PR Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs -mx-1 px-1">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'menunggu_persetujuan', label: 'Menunggu' },
              { id: 'disetujui', label: 'Disetujui' },
              { id: 'dikonversi_ke_po', label: 'Sudah Jadi PO' },
              { id: 'ditolak', label: 'Ditolak' },
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

          {/* Department filter & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700 h-[38px]"
            >
              <option value="all">Semua Departemen</option>
              {departments.slice(1).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor PR / pemohon..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-slate-400 h-[38px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PR Desktop Table List */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">No. PR & Tanggal</th>
                <th className="py-3 px-4 font-semibold">Departemen & Pemohon</th>
                <th className="py-3 px-4 font-semibold">Prioritas</th>
                <th className="py-3 px-4 font-semibold">Tujuan Keperluan</th>
                <th className="py-3 px-4 font-semibold text-center">Jml Item</th>
                <th className="py-3 px-4 font-semibold text-right">Estimasi Biaya</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPRs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada permintaan pembelian (PR) yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPRs.map((pr) => {
                  const statusBadge = getPRStatusBadge(pr.status);
                  const priorityBadge = getPriorityBadge(pr.priority);

                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{pr.prNumber}</span>
                        <span className="text-[11px] text-slate-500">Tgl: {formatDate(pr.requestDate)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{pr.department}</span>
                        <span className="text-[11px] text-slate-500">Pemohon: {pr.requestorName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${priorityBadge.bg} ${priorityBadge.text}`}
                        >
                          {priorityBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-700 truncate" title={pr.purpose}>
                          {pr.purpose}
                        </p>
                        <span className="text-[11px] text-slate-400">Perlu tgl: {formatDate(pr.requiredDate)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-700">{pr.items.length} Item</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(pr.totalEstimatedAmount)}
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
                          {/* View Detail */}
                          <button
                            onClick={() => setSelectedPR(pr)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Lihat Detail PR"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print PR Button */}
                          <button
                            onClick={() => setPrintPR(pr)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Cetak Formulir PR Resmi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Approval / Reject for Pending PRs */}
                          {pr.status === 'menunggu_persetujuan' && (
                            <>
                              <button
                                onClick={() => {
                                  setApprovalModalPR(pr);
                                  setApprovalAction('approve');
                                }}
                                className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1"
                                title="Setujui PR"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setApprovalModalPR(pr);
                                  setApprovalAction('reject');
                                }}
                                className="px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition flex items-center gap-1"
                                title="Tolak PR"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </>
                          )}

                          {/* Convert to PO for Approved PRs */}
                          {pr.status === 'disetujui' && (
                            <button
                              onClick={() => onConvertToPOFromPR(pr)}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1"
                              title="Terbitkan Purchase Order dari PR ini"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Terbitkan PO
                            </button>
                          )}

                          {/* Delete if draft or rejected */}
                          {(pr.status === 'draft' || pr.status === 'ditolak') && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus pengajuan PR ${pr.prNumber}?`)) {
                                  deletePR(pr.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Mobile Responsive PR Card List */}
      <div className="md:hidden space-y-3">
        {filteredPRs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Tidak ada permintaan pembelian (PR) yang sesuai dengan filter.</p>
          </div>
        ) : (
          filteredPRs.map((pr) => {
            const statusBadge = getPRStatusBadge(pr.status);
            const priorityBadge = getPriorityBadge(pr.priority);

            return (
              <div
                key={pr.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900 block">
                      {pr.prNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Tgl: {formatDate(pr.requestDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${priorityBadge.bg} ${priorityBadge.text}`}
                    >
                      {priorityBadge.label}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-semibold text-slate-800">{pr.department}</span>
                    <span className="text-slate-500 text-[11px]">PIC: {pr.requestorName}</span>
                  </div>
                  <p className="text-slate-700 font-medium line-clamp-2 pt-1 border-t border-slate-100">
                    {pr.purpose}
                  </p>
                </div>

                {/* Total & Items Count */}
                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{pr.items.length} Item barang</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatRupiah(pr.totalEstimatedAmount)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelectedPR(pr)}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                  </button>

                  <button
                    onClick={() => setPrintPR(pr)}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                    title="Cetak Formulir PR"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {pr.status === 'menunggu_persetujuan' && (
                    <>
                      <button
                        onClick={() => {
                          setApprovalModalPR(pr);
                          setApprovalAction('approve');
                        }}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setApprovalModalPR(pr);
                          setApprovalAction('reject');
                        }}
                        className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-700 active:bg-rose-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Tolak
                      </button>
                    </>
                  )}

                  {pr.status === 'disetujui' && (
                    <button
                      onClick={() => onConvertToPOFromPR(pr)}
                      className="flex-1 py-2.5 px-3 bg-indigo-600 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 min-h-[42px] shadow-2xs"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Buat PO
                    </button>
                  )}

                  {(pr.status === 'draft' || pr.status === 'ditolak') && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus pengajuan PR ${pr.prNumber}?`)) {
                          deletePR(pr.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[42px]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Buat PR Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">Buat Permintaan Barang (PR)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPR} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Requestor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departemen *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {departments.slice(1).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIC Pemohon *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRequestor}
                    onChange={(e) => setFormRequestor(e.target.value)}
                    placeholder="Nama pemohon"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tgl Dibutuhkan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formRequiredDate}
                    onChange={(e) => setFormRequiredDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              {/* Priority & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="rendah">Rendah (Rutin)</option>
                    <option value="sedang">Sedang (Standar)</option>
                    <option value="tinggi">Tinggi (Mendesak)</option>
                    <option value="urgent">URGENT (Kritis)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keperluan / Alasan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder="Tujuan pengadaan barang..."
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              {/* Items List Section */}
              <div className="border-t border-slate-200/80 pt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Daftar Barang ({formItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-700 font-bold">Item #{index + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                          >
                            Hapus Baris
                          </button>
                        )}
                      </div>

                      {/* Quick select from warehouse items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Pilih dari Stok Gudang (Opsional)
                          </label>
                          <select
                            onChange={(e) => handleSelectWarehouseItem(index, e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-700"
                          >
                            <option value="">-- Ketik manual atau pilih stok --</option>
                            {warehouseItems.map((w) => (
                              <option key={w.id} value={w.id}>
                                [{w.sku}] {w.name} ({w.currentStock} {w.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nama Barang *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.itemName}
                            onChange={(e) => handleUpdateItemRow(index, 'itemName', e.target.value)}
                            placeholder="Nama atau deskripsi item"
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                          />
                        </div>
                      </div>

                      {/* Qty, Unit, Price, Subtotal */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Qty *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItemRow(index, 'quantity', parseFloat(e.target.value) || 1)
                            }
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Satuan
                          </label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleUpdateItemRow(index, 'unit', e.target.value)}
                            placeholder="Pcs/Kg/Unit"
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Est. Harga (Rp)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.estimatedUnitPrice}
                            onChange={(e) =>
                              handleUpdateItemRow(
                                index,
                                'estimatedUnitPrice',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Subtotal
                          </label>
                          <div className="text-xs font-bold text-slate-900 p-2 bg-white rounded-lg border border-slate-200 truncate">
                            {formatRupiah(item.quantity * (item.estimatedUnitPrice || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total estimation */}
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800">
                    Total Estimasi:
                  </span>
                  <span className="text-sm sm:text-base font-bold text-emerald-900">
                    {formatRupiah(
                      formItems.reduce(
                        (sum, item) => sum + item.quantity * (item.estimatedUnitPrice || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-xs transition"
                >
                  Kirim Pengajuan PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail PR */}
      {selectedPR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Detail Permintaan Pembelian: {selectedPR.prNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedPR(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5">Departemen:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPR.department}</span>
                  <span className="text-slate-500 block mt-1">Pemohon: {selectedPR.requestorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Status & Prioritas:</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPRStatusBadge(selectedPR.status).bg} ${getPRStatusBadge(selectedPR.status).text}`}>
                      {getPRStatusBadge(selectedPR.status).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getPriorityBadge(selectedPR.priority).bg} ${getPriorityBadge(selectedPR.priority).text}`}>
                      {getPriorityBadge(selectedPR.priority).label}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Keperluan Pembelian:</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                  {selectedPR.purpose}
                </p>
              </div>

              {/* Items */}
              <div>
                <span className="font-bold text-slate-700 block mb-2">Rincian Barang yang Diminta:</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Est. Harga Satuan</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPR.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-2.5 text-slate-500">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block">{item.itemName}</span>
                            {item.sku && <span className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-800">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-2.5 text-right text-slate-600">{formatRupiah(item.estimatedUnitPrice)}</td>
                          <td className="p-2.5 text-right font-semibold text-slate-900">
                            {formatRupiah(item.quantity * item.estimatedUnitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-right">
                  <span className="text-slate-500 font-medium mr-2">Total Estimasi:</span>
                  <span className="font-bold text-emerald-800 text-sm">{formatRupiah(selectedPR.totalEstimatedAmount)}</span>
                </div>
              </div>

              {selectedPR.approvedBy && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                  <span className="font-bold block mb-0.5">Disetujui Oleh: {selectedPR.approvedBy}</span>
                  <span className="text-[11px] text-emerald-600">Pada: {formatDate(selectedPR.approvedAt)}</span>
                </div>
              )}

              {selectedPR.rejectionReason && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800">
                  <span className="font-bold block mb-0.5">Alasan Penolakan:</span>
                  <p className="text-[11px]">{selectedPR.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const prToPrint = selectedPR;
                  setSelectedPR(null);
                  setPrintPR(prToPrint);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Surat PR Resmi</span>
              </button>
              <button
                onClick={() => setSelectedPR(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl hover:bg-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Approval / Reject */}
      {approvalModalPR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {approvalAction === 'approve' ? 'Setujui Permintaan Barang' : 'Tolak Permintaan Barang'}
            </h3>
            <p className="text-xs text-slate-500">
              Nomor PR: <span className="font-mono font-bold text-slate-800">{approvalModalPR.prNumber}</span> ({approvalModalPR.department})
            </p>

            {approvalAction === 'approve' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pejabat / Manajer yang Menyetujui:
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan Permintaan:
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Anggaran departemen sudah melebihi kuota bulan ini..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setApprovalModalPR(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmApproval}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg ${
                  approvalAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Konfirmasi {approvalAction === 'approve' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PR Print Template Modal */}
      {printPR && (
        <PRPrintModal pr={printPR} onClose={() => setPrintPR(null)} />
      )}
    </div>
  );
};
