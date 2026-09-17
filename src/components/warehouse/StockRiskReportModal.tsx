import React, { useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { WarehouseItem } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { getInventoryValue } from '../../utils/inventoryPricing';
import { printDocument } from '../../utils/printDocument';

interface Props { items: WarehouseItem[]; onClose: () => void; }
type Status = 'menipis' | 'sekarat' | 'kosong';

export const StockRiskReportModal: React.FC<Props> = ({ items, onClose }) => {
  const [statuses, setStatuses] = useState<Status[]>(['menipis','sekarat','kosong']);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [columns, setColumns] = useState({ category: true, rack: true, stock: true, minimum: true, value: false });
  const rows = useMemo(() => items.map((item) => ({ item, status: item.currentStock <= 0 ? 'kosong' as const : item.currentStock <= item.minStock * .5 ? 'sekarat' as const : item.currentStock <= item.minStock ? 'menipis' as const : null })).filter((row) => row.status && statuses.includes(row.status)), [items,statuses]);
  const toggleStatus = (status: Status) => setStatuses((current) => current.includes(status) ? current.filter((value) => value !== status) : [...current,status]);
  const handlePrint = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!rows.length) return;
    void printDocument(event.currentTarget);
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4 print:static print:block print:bg-white print:p-0">
    <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px] print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4"><div><h2 className="text-base font-bold">Laporan Stok Kritis</h2><p className="text-[11px] text-[#777]">Pilih isi laporan sebelum dicetak.</p></div><button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f2ef]"><X className="h-4 w-4"/></button></div>
      <div className="no-print grid gap-3 border-b bg-[#faf9f6] p-4 sm:grid-cols-2"><div><label className="text-[11px] font-semibold">Tanggal laporan</label><input type="date" value={date} onChange={(event)=>setDate(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-xs"/></div><div><label className="text-[11px] font-semibold">Status yang ditampilkan</label><div className="mt-1 flex gap-1.5">{(['menipis','sekarat','kosong'] as Status[]).map((status)=><button key={status} onClick={()=>toggleStatus(status)} className={`min-h-11 flex-1 rounded-xl border text-xs font-semibold capitalize ${statuses.includes(status)?'border-[#252525] bg-[#252525] text-white':'bg-white text-[#666]'}`}>{status}</button>)}</div></div><div className="sm:col-span-2"><label className="text-[11px] font-semibold">Kolom laporan</label><div className="mt-2 flex flex-wrap gap-2">{Object.entries(columns).map(([key,value])=><label key={key} className="flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 text-xs capitalize"><input type="checkbox" checked={value} onChange={()=>setColumns((current)=>({...current,[key]:!value}))}/>{key==='value'?'Nilai aset':key}</label>)}</div></div></div>
      <div className="printable-area p-5 print:p-4"><div className="mb-5 flex items-start justify-between border-b-2 border-[#252525] pb-4"><div><h1 className="text-xl font-black">KIRI SUPPLY</h1><p className="text-xs text-[#666]">Laporan Barang Menipis, Sekarat & Kosong</p></div><div className="text-right"><p className="text-xs font-bold">Tanggal {new Date(`${date}T00:00:00`).toLocaleDateString('id-ID')}</p><p className="text-[10px] text-[#777]">{rows.length} SKU ditampilkan</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-[#252525] text-white"><tr><th className="p-2.5">SKU / Barang</th>{columns.category&&<th className="p-2.5">Kategori</th>}{columns.rack&&<th className="p-2.5">Rak</th>}{columns.stock&&<th className="p-2.5 text-right">Stok</th>}{columns.minimum&&<th className="p-2.5 text-right">Minimum</th>}{columns.value&&<th className="p-2.5 text-right">Nilai</th>}<th className="p-2.5">Status</th></tr></thead><tbody>{rows.map(({item,status})=><tr key={item.id} className="border-b"><td className="p-2.5"><strong>{item.name}</strong><p className="font-mono text-[9px] text-[#777]">{item.sku}</p></td>{columns.category&&<td className="p-2.5">{item.category}</td>}{columns.rack&&<td className="p-2.5">{item.warehouseLocation}</td>}{columns.stock&&<td className="p-2.5 text-right font-bold">{item.currentStock} {item.unit}</td>}{columns.minimum&&<td className="p-2.5 text-right">{item.minStock} {item.unit}</td>}{columns.value&&<td className="p-2.5 text-right">{formatRupiah(getInventoryValue(item))}</td>}<td className="p-2.5 font-bold capitalize">{status}</td></tr>)}</tbody></table></div>{!rows.length&&<p className="py-12 text-center text-xs text-[#777]">Tidak ada barang sesuai status yang dipilih.</p>}
      </div>
      <div className="no-print sticky bottom-0 flex gap-2 border-t bg-white p-4"><button onClick={onClose} className="min-h-11 flex-1 rounded-xl border text-xs font-semibold">Tutup</button><button onClick={handlePrint} disabled={!rows.length} className="flex min-h-11 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-[#252525] text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#aaa]"><Printer className="h-4 w-4 text-[#82dd70]"/>Cetak / Simpan PDF</button></div>
    </div>
  </div>;
};
