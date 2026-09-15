import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  CreditCard,
  Edit2,
  Trash2,
  ShoppingCart,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { Supplier, PaymentTerm } from '../../types';
import { formatRupiah, getPaymentTermLabel } from '../../utils/formatters';

export const SupplierView: React.FC = () => {
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, deleteSupplier } = usePurchasing();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Bahan Baku & Kimia Industri');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPaymentTerm, setFormPaymentTerm] = useState<PaymentTerm>('net_30');

  const categories = [
    'Bahan Baku & Kimia Industri',
    'Kemasan & Packaging',
    'Suku Cadang & Sparepart',
    'ATK & Perlengkapan Kantor',
    'Elektrikal & IT Hardware',
    'Logistik & Ekspedisi',
  ];

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormCode(`SUP-${String(suppliers.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormCategory('Bahan Baku & Kimia Industri');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCity('Jakarta');
    setFormPaymentTerm('net_30');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormCode(sup.code);
    setFormName(sup.name);
    setFormCategory(sup.category);
    setFormContactPerson(sup.contactPerson);
    setFormPhone(sup.phone);
    setFormEmail(sup.email);
    setFormAddress(sup.address);
    setFormCity(sup.city);
    setFormPaymentTerm(sup.paymentTermDefault);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Nama Perusahaan dan No. Telepon wajib diisi.');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        code: formCode,
        name: formName,
        category: formCategory,
        contactPerson: formContactPerson,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        paymentTermDefault: formPaymentTerm,
      });
    } else {
      addSupplier({
        code: formCode,
        name: formName,
        category: formCategory,
        contactPerson: formContactPerson,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        paymentTermDefault: formPaymentTerm,
        isActive: true,
      });
    }
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Direktori Supplier & Vendor</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-100 text-indigo-800">
              Vendor Master
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            Data rekanan penyedia bahan baku, kemasan, suku cadang, dan riwayat pesanan (Purchase Order).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Tambah Supplier Baru</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama supplier, kontak, kota..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/30 placeholder-slate-400 h-[38px]"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline ml-3">
          Total <strong>{filteredSuppliers.length}</strong> supplier terdaftar
        </span>
      </div>

      {/* Supplier Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {filteredSuppliers.map((supplier) => {
          const supplierPOs = purchaseOrders.filter((po) => po.supplierId === supplier.id);
          const totalSpent = supplierPOs.reduce((s, p) => s + p.grandTotal, 0);

          return (
            <div
              key={supplier.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-400 block">{supplier.code}</span>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{supplier.name}</h3>
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {supplier.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(supplier)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus supplier ${supplier.name}?`)) {
                          deleteSupplier(supplier.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-2 text-xs text-slate-600 my-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>PIC: <strong className="text-slate-800">{supplier.contactPerson || '-'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px]">{supplier.address}, {supplier.city}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Syarat: <strong className="text-slate-700">{getPaymentTermLabel(supplier.paymentTermDefault)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Footer PO statistics */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 -mx-5 -mb-5 p-3 rounded-b-xl">
                <span className="text-slate-500 flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5" /> {supplierPOs.length} PO Diterbitkan
                </span>
                <span className="font-bold text-slate-900">{formatRupiah(totalSpent)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add / Edit Supplier */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Tambah Supplier Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Vendor *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan / Toko *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: PT Mitra Sukses Logistik"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Pasokan *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kontak Person (PIC)</label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Bpk / Ibu..."
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Telepon / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sales@vendor.com"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Kantor / Pabrik</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Kawasan Industri..."
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kota</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Jakarta / Surabaya"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Syarat Pembayaran Standar</label>
                <select
                  value={formPaymentTerm}
                  onChange={(e) => setFormPaymentTerm(e.target.value as PaymentTerm)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option value="net_30">Tempo 30 Hari (Net 30)</option>
                  <option value="net_14">Tempo 14 Hari (Net 14)</option>
                  <option value="net_7">Tempo 7 Hari (Net 7)</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="cash">Tunai (Cash)</option>
                  <option value="dp_50_net_30">DP 50% + Pelunasan 30 Hari</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                >
                  {editingSupplier ? 'Simpan Perubahan' : 'Simpan Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
