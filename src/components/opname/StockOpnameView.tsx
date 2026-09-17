import React, { useMemo, useState } from 'react';
import { ClipboardCheck, History, Layers3, Plus, Save } from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { StockOpnameLine } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { NumberInput } from '../common/NumberInput';
import { formatDate } from '../../utils/formatters';

type Template = 'harian' | 'bulanan' | 'rak' | 'kategori';

export const StockOpnameView: React.FC = () => {
  const { items, warehouses, stockOpnames, createStockOpname } = usePurchasing();
  const { profile } = useAuth();
  const [template, setTemplate] = useState<Template>('harian');
  const [warehouseId, setWarehouseId] = useState(warehouses.find((item) => item.type === 'warehouse')?.id || '');
  const [filterValue, setFilterValue] = useState('');
  const [lines, setLines] = useState<StockOpnameLine[]>([]);
  const racks = useMemo(() => Array.from(new Set(items.map((item) => item.warehouseLocation).filter(Boolean))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(), [items]);
  const differences = lines.filter((line) => line.difference !== 0).length;

  const generateTemplate = () => {
    const selected = items.filter((item) => template === 'rak' ? item.warehouseLocation === filterValue : template === 'kategori' ? item.category === filterValue : true);
    setLines(selected.map((item) => ({ itemId: item.id, sku: item.sku, itemName: item.name, unit: item.unit, rack: item.warehouseLocation, category: item.category, systemStock: item.currentStock, physicalStock: item.currentStock, difference: 0 })));
  };

  const updatePhysical = (index: number, value: number) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, physicalStock: value, difference: value - line.systemStock } : line));

  const submit = () => {
    const warehouse = warehouses.find((item) => item.id === warehouseId);
    if (!warehouse || !lines.length) return;
    if (!confirm(`Selesaikan opname ${lines.length} barang? ${differences} barang memiliki selisih dan akan menyesuaikan stok.`)) return;
    createStockOpname({ date: new Date().toISOString().slice(0, 10), template, warehouseId, warehouseName: warehouse.name, filterValue: filterValue || undefined, lines, countedBy: profile.fullName || profile.email || 'Petugas Gudang' });
    setLines([]);
  };

  return <div className="space-y-4 sm:space-y-5">
    <header><h1 className="text-xl font-bold text-[#292929] sm:text-2xl">Stock Opname</h1><p className="mt-1 text-xs text-[#77766f]">Hitung fisik, lihat selisih, lalu sesuaikan stok dalam satu proses.</p></header>
    <section className="rounded-2xl border border-[#e2e0da] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['harian','bulanan','rak','kategori'] as Template[]).map((value) => <button key={value} onClick={() => { setTemplate(value); setLines([]); setFilterValue(''); }} className={`min-h-11 rounded-xl border text-xs font-semibold capitalize ${template === value ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#dedcd6] bg-white text-[#555]'}`}>{value === 'rak' ? 'Per Rak' : value === 'kategori' ? 'Per Kategori' : value}</button>)}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="h-11 rounded-xl border border-[#d8d6cf] bg-white px-3 text-xs font-semibold">{warehouses.filter((item) => item.type === 'warehouse' && item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {(template === 'rak' || template === 'kategori') && <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} className="h-11 rounded-xl border border-[#d8d6cf] bg-white px-3 text-xs"><option value="">Pilih {template}...</option>{(template === 'rak' ? racks : categories).map((value) => <option key={value} value={value}>{value}</option>)}</select>}
        <button onClick={generateTemplate} disabled={(template === 'rak' || template === 'kategori') && !filterValue} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#72d462] px-4 text-xs font-bold text-[#173614] disabled:bg-[#d9d8d3]"><Plus className="h-4 w-4" />Buat List Opname</button>
      </div>
    </section>

    {lines.length > 0 && <section className="overflow-hidden rounded-2xl border border-[#e2e0da] bg-white">
      <div className="flex items-center justify-between border-b border-[#eceae5] p-4"><div><h2 className="text-sm font-bold">Input hasil hitung</h2><p className="text-[10px] text-[#85847e]">{lines.length} SKU · {differences} selisih</p></div><ClipboardCheck className="h-5 w-5 text-[#397c31]" /></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#faf9f6] text-[10px] uppercase text-[#85847e]"><tr><th className="p-3">Barang</th><th className="p-3">Rak</th><th className="p-3 text-right">Sistem</th><th className="p-3 text-right">Fisik</th><th className="p-3 text-right">Selisih</th></tr></thead><tbody>{lines.map((line,index)=><tr key={line.itemId} className="border-t border-[#efede8]"><td className="p-3"><strong>{line.itemName}</strong><p className="font-mono text-[10px] text-[#85847e]">{line.sku} · {line.category}</p></td><td className="p-3 text-[#666]">{line.rack}</td><td className="p-3 text-right">{line.systemStock} {line.unit}</td><td className="p-3"><NumberInput type="number" min="0" value={line.physicalStock} onChange={(event)=>updatePhysical(index,parseFloat(event.target.value)||0)} className="ml-auto h-10 w-28 rounded-lg border px-2 text-right font-bold" /></td><td className={`p-3 text-right font-bold ${line.difference ? 'text-[#bd4943]' : 'text-[#397c31]'}`}>{line.difference > 0 ? '+' : ''}{line.difference}</td></tr>)}</tbody></table></div>
      <div className="divide-y divide-[#efede8] md:hidden">{lines.map((line,index)=><article key={line.itemId} className="p-4"><div className="flex justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{line.itemName}</h3><p className="mt-1 text-[10px] text-[#85847e]">{line.sku} · {line.rack}</p></div><span className={`text-xs font-bold ${line.difference ? 'text-[#bd4943]' : 'text-[#397c31]'}`}>{line.difference > 0 ? '+' : ''}{line.difference}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f5f4f0] p-3"><span className="text-[10px] text-[#85847e]">Stok sistem</span><strong className="block text-sm">{line.systemStock} {line.unit}</strong></div><div><label className="text-[10px] text-[#85847e]">Hasil fisik</label><NumberInput type="number" min="0" value={line.physicalStock} onChange={(event)=>updatePhysical(index,parseFloat(event.target.value)||0)} className="mt-1 h-11 w-full rounded-xl border px-3 text-right font-bold" /></div></div></article>)}</div>
      <div className="sticky bottom-0 flex justify-end border-t bg-white p-3"><button onClick={submit} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#252525] px-5 text-xs font-bold text-white sm:w-auto"><Save className="h-4 w-4 text-[#82dd70]" />Selesaikan Opname</button></div>
    </section>}

    <section className="rounded-2xl border border-[#e2e0da] bg-white"><div className="flex items-center gap-2 border-b p-4"><History className="h-4 w-4 text-[#397c31]"/><h2 className="text-sm font-bold">Riwayat opname</h2></div>{stockOpnames.length ? <div className="divide-y">{stockOpnames.slice(0,10).map((opname)=><div key={opname.id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-bold">{opname.opnameNumber} · {opname.warehouseName}</p><p className="mt-1 text-[10px] text-[#85847e]">{formatDate(opname.date)} · {opname.template} · {opname.lines.length} SKU</p></div><span className="rounded-lg bg-[#e8f7e4] px-2 py-1 text-[10px] font-semibold text-[#397c31]">Selesai</span></div>)}</div> : <div className="p-8 text-center text-xs text-[#85847e]"><Layers3 className="mx-auto mb-2 h-6 w-6"/>Belum ada opname.</div>}</section>
  </div>;
};
