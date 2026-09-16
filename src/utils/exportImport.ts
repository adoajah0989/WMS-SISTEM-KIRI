import type { WarehouseItem, Supplier, PurchaseOrder, GoodsReceipt, PurchaseRequisition, StockMovement } from '../types/index.ts';
import { getAverageUnitCost, getPurchaseUnitPrice } from './inventoryPricing.ts';

/**
 * Trigger browser file download for a string content
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to escape CSV field value
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).trim();
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes(';')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Smart CSV line splitter supporting quotes, commas, semicolons, tabs
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleanText.trim()) return lines;

  // Determine delimiter from first line (comma, semicolon, or tab)
  const firstLine = cleanText.split('\n')[0];
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  let row: string[] = [];
  let inQuotes = false;
  let currentToken = '';

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // skip next escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(currentToken.trim());
      currentToken = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(currentToken.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentToken = '';
    } else {
      currentToken += char;
    }
  }

  if (currentToken || row.length > 0) {
    row.push(currentToken.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

/* =========================================================================
   1. MASTER BARANG (WAREHOUSE ITEMS) EXPORT & IMPORT
   ========================================================================= */

export function exportWarehouseItemsCSV(items: WarehouseItem[]) {
  const headers = [
    'SKU',
    'Nama Barang',
    'Kategori',
    'Satuan Dasar (Gudang)',
    'Satuan Beli / Kemasan',
    'Rasio Konversi (1 Satuan Beli = X Satuan Dasar)',
    'Stok Saat Ini',
    'Stok Minimum',
    'Lokasi Rak / Gudang',
    'Harga Beli per Satuan Beli (Rp)',
    'Harga Rata-rata per Satuan Dasar (Rp)',
    'Deskripsi / Catatan',
  ];

  const rows = items.map((item) => [
    escapeCSV(item.sku),
    escapeCSV(item.name),
    escapeCSV(item.category),
    escapeCSV(item.unit || 'Pcs'),
    escapeCSV(item.purchaseUnit || item.unit || 'Pcs'),
    escapeCSV(item.conversionRatio || 1),
    escapeCSV(item.currentStock || 0),
    escapeCSV(item.minStock || 0),
    escapeCSV(item.warehouseLocation || 'Gudang Utama'),
    escapeCSV(getPurchaseUnitPrice(item)),
    escapeCSV(getAverageUnitCost(item)),
    escapeCSV(item.description || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `Master_Barang_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename);
}

export function downloadTemplateWarehouseItemsCSV() {
  const headers = [
    'SKU',
    'Nama Barang',
    'Kategori',
    'Satuan Dasar (Gudang)',
    'Satuan Beli / Kemasan',
    'Rasio Konversi',
    'Stok Awal',
    'Stok Minimum',
    'Lokasi Rak',
    'Harga Beli per Satuan Beli (Rp)',
    'Harga Rata-rata per Satuan Dasar (Rp) - Opsional',
    'Deskripsi',
  ];

  const sampleRows = [
    [
      'PKG-KRT-01',
      'Karton Box Master 40x30x25cm',
      'Kemasan & Packaging',
      'Pcs',
      'Dus',
      '24',
      '240',
      '50',
      'Rak A-01',
      '204000',
      '8500',
      'Kemasan kardus single wall',
    ],
    [
      'CHM-SOL-02',
      'Solvent Cleaner Grade A',
      'Bahan Baku & Kimia Industri',
      'Liter',
      'Drum',
      '200',
      '400',
      '100',
      'Gudang Kimia B-02',
      '5500000',
      '27500',
      'Cairan pembersih solvent teknis',
    ],
    [
      'ATK-KTS-01',
      'Kertas HVS A4 80gr',
      'ATK & Perlengkapan Kantor',
      'Lembar',
      'Rim',
      '500',
      '2500',
      '500',
      'Lemari ATK Lt 2',
      '32500',
      '65',
      '1 Rim isi 500 lembar',
    ],
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map(escapeCSV).join(','))].join('\r\n');
  downloadFile(csvContent, 'Template_Import_Master_Barang.csv');
}

export function parseWarehouseItemsCSV(csvText: string): { items: Partial<WarehouseItem>[]; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  const items: Partial<WarehouseItem>[] = [];

  if (!rows || rows.length < 2 || !rows[0]) {
    errors.push('File CSV kosong atau tidak memiliki baris data.');
    return { items, errors };
  }

  // Check header indices
  const headerRow = (rows[0] || []).map((h) => (h || '').replace(/^\uFEFF/, '').toLowerCase().trim());
  const findIdx = (keywords: string[]) =>
    headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));

  const skuIdx = findIdx(['sku', 'kode']);
  const nameIdx = findIdx(['nama', 'name', 'item', 'barang']);
  const categoryIdx = findIdx(['kategori', 'category']);
  const unitIdx = findIdx(['satuan dasar', 'base unit', 'satuan gudang', 'satuan']);
  const purchaseUnitIdx = findIdx(['satuan beli', 'kemasan', 'purchase unit', 'order unit']);
  const ratioIdx = findIdx(['konversi', 'rasio', 'ratio']);
  const stockIdx = findIdx(['stok', 'stock', 'qty']);
  const minStockIdx = findIdx(['minimum', 'min']);
  const locationIdx = findIdx(['lokasi', 'rak', 'location']);
  const purchasePriceIdx = headerRow.findIndex((h) => !h.includes('satuan dasar') && !h.includes('perunit') && !h.includes('per unit') && [
    'harga beli per satuan beli',
    'harga per satuan beli',
    'harga beli per kemasan',
    'harga rata-rata',
    'purchase unit price',
  ].some((keyword) => h.includes(keyword)));
  const basePriceIdx = findIdx([
    'harga rata-rata per satuan dasar',
    'harga per satuan dasar',
    'harga perunit',
    'harga per unit',
    'harga beli satuan',
    'harga beli terakhir',
    'base unit price',
  ]);
  const descIdx = findIdx(['deskripsi', 'keterangan', 'catatan', 'desc']);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const name = nameIdx !== -1 ? row[nameIdx] : row[1] || '';
    if (!name || !name.trim()) {
      errors.push(`Baris ${i + 1}: Nama barang kosong, dilewati.`);
      continue;
    }

    const sku = (skuIdx !== -1 && row[skuIdx]) ? row[skuIdx].trim() : `ITEM-${String(i).padStart(3, '0')}`;
    const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : 'Bahan Baku & Kimia Industri';
    const unit = unitIdx !== -1 && row[unitIdx] ? row[unitIdx].trim() : 'Pcs';
    const purchaseUnit = purchaseUnitIdx !== -1 && row[purchaseUnitIdx] ? row[purchaseUnitIdx].trim() : unit;
    
    let conversionRatio = 1;
    if (ratioIdx !== -1 && row[ratioIdx]) {
      const parsedRatio = parseNumericCell(row[ratioIdx]);
      if (!isNaN(parsedRatio) && parsedRatio > 0) conversionRatio = parsedRatio;
    }

    let currentStock = 0;
    if (stockIdx !== -1 && row[stockIdx]) {
      const parsedStock = parseNumericCell(row[stockIdx]);
      if (!isNaN(parsedStock)) currentStock = parsedStock;
    }

    let minStock = 10;
    if (minStockIdx !== -1 && row[minStockIdx]) {
      const parsedMin = parseNumericCell(row[minStockIdx]);
      if (!isNaN(parsedMin)) minStock = parsedMin;
    }

    const warehouseLocation = locationIdx !== -1 && row[locationIdx] ? row[locationIdx].trim() : 'Gudang Utama';
    
    const purchasePrice = purchasePriceIdx !== -1 ? parseNumericCell(row[purchasePriceIdx]) : NaN;
    const baseUnitPrice = basePriceIdx !== -1 ? parseNumericCell(row[basePriceIdx]) : NaN;
    const hasPurchasePrice = Number.isFinite(purchasePrice) && purchasePrice >= 0;
    const hasBasePrice = Number.isFinite(baseUnitPrice) && baseUnitPrice >= 0;
    const lastPurchasePrice = hasPurchasePrice
      ? purchasePrice
      : hasBasePrice
        ? baseUnitPrice
        : 0;
    const priceBasis = hasPurchasePrice ? 'purchase_unit' as const : 'base_unit' as const;
    const averageUnitCost = hasBasePrice
      ? baseUnitPrice
      : hasPurchasePrice
        ? purchasePrice / conversionRatio
        : 0;

    const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';

    items.push({
      sku,
      name: name.trim(),
      category,
      unit,
      purchaseUnit,
      conversionRatio,
      currentStock,
      minStock,
      warehouseLocation,
      lastPurchasePrice,
      priceBasis,
      averageUnitCost,
      description,
    });
  }

  return { items, errors };
}

/** Parse Indonesian or international formatted numbers without turning 22.000 into 22. */
function parseNumericCell(raw: string | undefined): number {
  if (!raw) return NaN;
  let value = raw.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (!value) return NaN;

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  if (hasComma && hasDot) {
    const decimalSeparator = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? /\./g : /,/g;
    value = value.replace(thousandsSeparator, '').replace(decimalSeparator, '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  } else if (/^-?\d{1,3}(,\d{3})+$/.test(value)) {
    value = value.replace(/,/g, '');
  } else {
    value = value.replace(',', '.');
  }
  return Number(value);
}

/* =========================================================================
   2. MASTER SUPPLIER EXPORT & IMPORT
   ========================================================================= */

export function exportSuppliersCSV(suppliers: Supplier[]) {
  const headers = [
    'Kode Supplier',
    'Nama Supplier / Vendor',
    'Kategori Vendor',
    'PIC / Kontak',
    'No Telepon / WhatsApp',
    'Email',
    'Alamat Lengkap',
    'Kota',
    'Syarat Pembayaran (TOP)',
  ];

  const rows = suppliers.map((sup) => [
    escapeCSV(sup.code),
    escapeCSV(sup.name),
    escapeCSV(sup.category),
    escapeCSV(sup.contactPerson),
    escapeCSV(sup.phone),
    escapeCSV(sup.email),
    escapeCSV(sup.address),
    escapeCSV(sup.city),
    escapeCSV(sup.paymentTermDefault || 'net_30'),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `Master_Supplier_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, filename);
}

export function downloadTemplateSuppliersCSV() {
  const headers = [
    'Kode Supplier',
    'Nama Supplier',
    'Kategori Vendor',
    'Nama Kontak PIC',
    'No Telepon',
    'Email',
    'Alamat',
    'Kota',
    'Syarat Pembayaran Default',
  ];

  const sampleRows = [
    [
      'SUP-001',
      'PT Sumber Kemasan Pratama',
      'Kemasan & Packaging',
      'Budi Santoso',
      '0812-3456-7890',
      'sales@kemasanpratama.co.id',
      'Jl. Industri Rungkut No. 45',
      'Surabaya',
      'net_30',
    ],
    [
      'SUP-002',
      'CV Mega Kimia Nusantara',
      'Bahan Kimia',
      'Hendra Wijaya',
      '0811-9876-5432',
      'info@megakimia.com',
      'Kawasan Industri Cikarang Blok B2',
      'Bekasi',
      'net_14',
    ],
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map(escapeCSV).join(','))].join('\r\n');
  downloadFile(csvContent, 'Template_Import_Master_Supplier.csv');
}

export function parseSuppliersCSV(csvText: string): { suppliers: Partial<Supplier>[]; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  const suppliers: Partial<Supplier>[] = [];

  if (!rows || rows.length < 2 || !rows[0]) {
    errors.push('File CSV kosong atau tidak memiliki baris data supplier.');
    return { suppliers, errors };
  }

  const headerRow = (rows[0] || []).map((h) => (h || '').toLowerCase().trim());
  const findIdx = (keywords: string[]) =>
    headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));

  const codeIdx = findIdx(['kode', 'code']);
  const nameIdx = findIdx(['nama', 'name', 'vendor', 'supplier']);
  const catIdx = findIdx(['kategori', 'category']);
  const picIdx = findIdx(['pic', 'kontak', 'contact', 'person']);
  const phoneIdx = findIdx(['telp', 'telepon', 'phone', 'wa', 'hp']);
  const emailIdx = findIdx(['email', 'surel']);
  const addressIdx = findIdx(['alamat', 'address']);
  const cityIdx = findIdx(['kota', 'city']);
  const termIdx = findIdx(['syarat', 'pembayaran', 'term', 'top']);

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const name = nameIdx !== -1 ? row[nameIdx] : row[1] || '';
    if (!name || !name.trim()) {
      errors.push(`Baris ${i + 1}: Nama supplier kosong, dilewati.`);
      continue;
    }

    const code = codeIdx !== -1 && row[codeIdx] ? row[codeIdx].trim() : `SUP-${String(i).padStart(3, '0')}`;
    const category = catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : 'Umum & Operasional';
    const contactPerson = picIdx !== -1 && row[picIdx] ? row[picIdx].trim() : 'PIC Vendor';
    const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '-';
    const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : '-';
    const address = addressIdx !== -1 && row[addressIdx] ? row[addressIdx].trim() : 'Alamat Supplier';
    const city = cityIdx !== -1 && row[cityIdx] ? row[cityIdx].trim() : 'Indonesia';
    const paymentTermDefault = (termIdx !== -1 && row[termIdx] ? row[termIdx].trim() : 'net_30') as any;

    suppliers.push({
      code,
      name: name.trim(),
      category,
      contactPerson,
      phone,
      email,
      address,
      city,
      paymentTermDefault,
      isActive: true,
    });
  }

  return { suppliers, errors };
}

/* =========================================================================
   3. PURCHASE ORDERS & GRN EXPORTS
   ========================================================================= */

export function exportPurchaseOrdersCSV(orders: PurchaseOrder[]) {
  const headers = [
    'No PO',
    'Tanggal Order',
    'Estimasi Kirim',
    'Nama Supplier',
    'Status PO',
    'Term Pembayaran',
    'Jumlah Item',
    'Rincian Barang',
    'Subtotal (Rp)',
    'PPN (Rp)',
    'Ongkir (Rp)',
    'Grand Total (Rp)',
    'Catatan',
  ];

  const rows = orders.map((po) => {
    const itemsSummary = po.items
      .map(
        (i) =>
          `${i.itemName} (${i.quantity} ${i.unit}${
            i.conversionRatio && i.conversionRatio > 1
              ? ` = ${i.quantity * i.conversionRatio} ${i.stockUnit || 'Pcs'}`
              : ''
          } @ Rp ${i.unitPrice})`
      )
      .join(' | ');

    return [
      escapeCSV(po.poNumber),
      escapeCSV(po.orderDate),
      escapeCSV(po.expectedDeliveryDate),
      escapeCSV(po.supplierName),
      escapeCSV(po.status),
      escapeCSV(po.paymentTerm),
      escapeCSV(po.items.length),
      escapeCSV(itemsSummary),
      escapeCSV(po.subtotal),
      escapeCSV(po.ppnAmount),
      escapeCSV(po.shippingFee),
      escapeCSV(po.grandTotal),
      escapeCSV(po.notes || ''),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadFile(csvContent, `Laporan_Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportGoodsReceiptsCSV(receipts: GoodsReceipt[]) {
  const headers = [
    'No GRN',
    'No PO',
    'No Surat Jalan Supplier',
    'Tanggal Diterima',
    'Supplier',
    'Petugas Penerima',
    'Lokasi Gudang',
    'Total Item Diterima',
    'Rincian Barang Masuk',
    'Status',
  ];

  const rows = receipts.map((grn) => {
    const itemsSummary = grn.items
      .map(
        (i) =>
          `${i.itemName} (Diterima: ${i.receivedQuantity} ${i.unit}${
            i.conversionRatio && i.conversionRatio > 1
              ? ` = ${i.receivedQuantity * i.conversionRatio} ${i.stockUnit || 'Pcs'}`
              : ''
          } [Kondisi: ${i.condition}])`
      )
      .join(' | ');

    return [
      escapeCSV(grn.grnNumber),
      escapeCSV(grn.poNumber),
      escapeCSV(grn.deliveryOrderNo),
      escapeCSV(grn.receiveDate),
      escapeCSV(grn.supplierName),
      escapeCSV(grn.receiverName),
      escapeCSV(grn.warehouseLocation),
      escapeCSV(grn.totalItemsReceived),
      escapeCSV(itemsSummary),
      escapeCSV(grn.status),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadFile(csvContent, `Laporan_Penerimaan_GRN_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportRequisitionsCSV(prs: PurchaseRequisition[]) {
  const headers = [
    'No PR',
    'Tanggal Permintaan',
    'Tanggal Dibutuhkan',
    'Departemen',
    'Pemohon',
    'Prioritas',
    'Tujuan Pengadaan',
    'Status',
    'Total Estimasi (Rp)',
    'Rincian Barang',
  ];

  const rows = prs.map((pr) => {
    const itemsSummary = pr.items
      .map((i) => `${i.itemName} (${i.quantity} ${i.unit} @ Rp ${i.estimatedUnitPrice})`)
      .join(' | ');

    return [
      escapeCSV(pr.prNumber),
      escapeCSV(pr.requestDate),
      escapeCSV(pr.requiredDate),
      escapeCSV(pr.department),
      escapeCSV(pr.requestorName),
      escapeCSV(pr.priority),
      escapeCSV(pr.purpose),
      escapeCSV(pr.status),
      escapeCSV(pr.totalEstimatedAmount),
      escapeCSV(itemsSummary),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadFile(csvContent, `Laporan_Permintaan_PR_${new Date().toISOString().split('T')[0]}.csv`);
}
