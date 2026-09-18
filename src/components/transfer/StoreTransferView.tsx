import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, PackagePlus, Plus, Send, Trash2, Truck } from 'lucide-react';
import { usePurchasing } from '../../context/PurchasingContext';
import { StockTransferItem } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { NumberInput } from '../common/NumberInput';
import { formatDateTime } from '../../utils/formatters';

export const StoreTransferView: React.FC = () => {
  const { items, warehouses, storeTransfers, createStoreTransfer, confirmStoreTransfer, activeWarehouse } = usePurchasing();
  const { profile } = useAuth();
  const destinationOptions = warehouses.filter((item) => item.isActive && item.id !== activeWarehouse.id);
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<StockTransferItem[]>([]);

  const addItem = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item || rows.some((entry) => entry.itemId === item.id)) return;
    setRows((current) => [...current, { itemId: item.id, sku: item.sku, itemName: item.name, unit: item.unit, quantity: 1 }]);
  };

  const submit = () => {
    const source = activeWarehouse;
    const destination = destinationOptions.find((item) => item.id === destinationId);
    if (!source || !destination || !rows.length) return;
    const result = createStoreTransfer({ date: new Date().toISOString(), sourceWarehouseId: source.id, sourceWarehouseName: source.name, destinationStoreId: destination.id, destinationStoreName: destination.name, items: rows, sentBy: profile.fullName || profile.email || 'Petugas Gudang', notes });
    if (result) { setRows([]); setNotes(''); }
  };

  return <div className="space-y-4 sm:space-y-5">
    <header><h1 className="text-xl font-bold text-[#292929] sm:text-2xl">Transfer Gudang & Store</h1><p className="mt-1 text-xs text-[#77766f]">Kirim dari warehouse aktif; stok tujuan bertambah setelah penerimaan dikonfirmasi.</p></header>
    <section className="rounded-2xl border border-[#e2e0da] bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className="flex h-11 min-w-0 items-center rounded-xl border border-[#d8d6cf] bg-[#f7f6f3] px-3 text-xs font-bold text-[#397c31]">{activeWarehouse.name}</div><ArrowRight className="h-4 w-4 text-[#85847e]"/><select value={destinationId} onChange={(event)=>setDestinationId(event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#d8d6cf] bg-white px-2 text-xs font-semibold"><option value="">Pilih tujuan...</option>{destinationOptions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="mt-3"><select value="" onChange={(event)=>addItem(event.target.value)} className="h-11 w-full rounded-xl border border-[#d8d6cf] bg-[#faf9f6] px-3 text-xs"><option value="">+ Pilih barang untuk dikirim...</option>{items.filter((item)=>item.currentStock>0).map((item)=><option key={item.id} value={item.id}>[{item.sku}] {item.name} · stok {item.currentStock} {item.unit}</option>)}</select></div>
      <div className="mt-3 space-y-2">{rows.map((row,index)=>{const stock=items.find((item)=>item.id===row.itemId)?.currentStock||0;return <div key={row.itemId} className="flex items-center gap-2 rounded-xl border border-[#e4e2dc] p-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{row.itemName}</p><p className="mt-0.5 text-[10px] text-[#85847e]">{row.sku} · tersedia {stock} {row.unit}</p></div><NumberInput type="number" min="1" max={stock} value={row.quantity} onChange={(event)=>setRows((current)=>current.map((entry,rowIndex)=>rowIndex===index?{...entry,quantity:Math.min(stock,parseFloat(event.target.value)||1)}:entry))} className="h-10 w-20 rounded-lg border px-2 text-right font-bold"/><span className="text-[10px] text-[#777]">{row.unit}</span><button onClick={()=>setRows((current)=>current.filter((_,rowIndex)=>rowIndex!==index))} className="flex h-10 w-10 items-center justify-center rounded-lg text-[#aaa8a1] hover:bg-[#fff0ee] hover:text-[#bd4943]"><Trash2 className="h-4 w-4"/></button></div>})}</div>
      <input value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="Catatan pengiriman (opsional)" className="mt-3 h-11 w-full rounded-xl border border-[#d8d6cf] px-3 text-xs"/>
      <button onClick={submit} disabled={!rows.length || !destinationId} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#252525] text-xs font-bold text-white disabled:bg-[#c8c6bf]"><Send className="h-4 w-4 text-[#82dd70]"/>Kirim Transfer</button>
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#e2e0da] bg-white"><div className="flex items-center justify-between border-b p-4"><div><h2 className="text-sm font-bold">Riwayat transfer</h2><p className="text-[10px] text-[#85847e]">{storeTransfers.filter((item)=>item.status==='dikirim').length} masih dalam perjalanan</p></div><Truck className="h-5 w-5 text-[#3974d9]"/></div>{storeTransfers.length ? <div className="divide-y">{storeTransfers.map((transfer)=><article key={transfer.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold">{transfer.transferNumber}</p><p className="mt-1 text-[10px] text-[#85847e]">{transfer.sourceWarehouseName} → {transfer.destinationStoreName}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${transfer.status==='diterima'?'bg-[#e8f7e4] text-[#397c31]':'bg-[#eaf1ff] text-[#315f9d]'}`}>{transfer.status==='diterima'?'Diterima':'Dikirim'}</span></div><div className="mt-3 rounded-xl bg-[#faf9f6] p-3 text-[11px] text-[#555]">{transfer.items.map((item)=><p key={item.itemId}>{item.itemName}: <strong>{item.quantity} {item.unit}</strong></p>)}</div><div className="mt-2 flex items-center justify-between text-[10px] text-[#85847e]"><span>{formatDateTime(transfer.createdAt)} · {transfer.sentBy}</span>{transfer.status==='dikirim'&&<button onClick={()=>{const receiver=prompt('Nama penerima store:',profile.fullName||'PIC Store');if(receiver)confirmStoreTransfer(transfer.id,receiver);}} className="flex min-h-9 items-center gap-1 rounded-xl bg-[#72d462] px-3 font-bold text-[#173614]"><CheckCircle2 className="h-3.5 w-3.5"/>Konfirmasi diterima</button>}</div></article>)}</div>:<div className="p-8 text-center text-xs text-[#85847e]"><PackagePlus className="mx-auto mb-2 h-7 w-7"/>Belum ada transfer.</div>}</section>
  </div>;
};
