export type PRStatus = 'draft' | 'menunggu_persetujuan' | 'disetujui' | 'ditolak' | 'dikonversi_ke_po';
export type PRPricingStatus = 'belum_diminta' | 'menunggu_penawaran' | 'harga_diterima';
export type PriorityLevel = 'rendah' | 'sedang' | 'tinggi' | 'urgent';

export type POStatus = 'draft' | 'diterbitkan' | 'terkirim' | 'diterima_sebagian' | 'selesai' | 'dibatalkan';
export type PaymentTerm = 'cash' | 'cod' | 'net_7' | 'net_14' | 'net_30' | 'dp_50_net_30';

export type StockCondition = 'baik' | 'rusak' | 'kurang';
export type MovementType = 'penerimaan_po' | 'penyesuaian_masuk' | 'penyesuaian_keluar' | 'pengambilan_internal' | 'retur' | 'opname_adjustment' | 'transfer_keluar';

export interface WarehouseItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string; // Base unit / Satuan dasar gudang (e.g. Pcs, Kg, Meter, Liter, Lembar)
  purchaseUnit?: string; // Satuan beli / kemasan default (e.g. Dus, Box, Rim, Roll, Drum, Zak, Lusin)
  conversionRatio?: number; // 1 purchaseUnit = X unit dasar (e.g. 1 Dus = 24 Pcs, ratio = 24)
  currentStock: number; // in base units
  minStock: number;
  warehouseLocation: string; // e.g. Rak A-01, Gudang Utama
  lastPurchasePrice: number; // Last price entered; interpreted by priceBasis
  priceBasis?: 'purchase_unit' | 'base_unit'; // Missing means legacy base-unit price
  averageUnitCost?: number; // Weighted-average inventory cost per base unit
  primarySupplierId?: string;
  description?: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  type: MovementType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  referenceNo: string; // PO-xxxx or GRN-xxxx or ADJ-xxxx
  date: string;
  notes: string;
  operator: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  paymentTermDefault: PaymentTerm;
  isActive: boolean;
}

export interface PRItem {
  id: string;
  itemId?: string; // If mapped to inventory
  sku?: string;
  itemName: string;
  category: string;
  unit: string; // Unit requested (e.g. Dus or Pcs)
  stockUnit?: string; // Base warehouse unit
  conversionRatio?: number; // 1 unit = X stockUnit
  quantity: number;
  estimatedUnitPrice: number;
  notes?: string;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string; // PR-202608-001
  requestDate: string;
  requiredDate: string;
  department: string;
  requestorName: string;
  priority: PriorityLevel;
  purpose: string;
  items: PRItem[];
  totalEstimatedAmount: number;
  pricingStatus?: PRPricingStatus;
  quotedSupplierId?: string;
  quotedSupplierName?: string;
  quotationNumber?: string;
  quotedAt?: string;
  pricedBy?: string;
  status: PRStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  convertedToPoId?: string;
  createdAt: string;
}

export interface POItem {
  id: string;
  itemId?: string;
  sku: string;
  itemName: string;
  unit: string; // Order unit (e.g. Dus, Box, Rim, Pcs, Roll, Kg)
  purchaseUnit?: string; // Optional alias for order unit
  stockUnit?: string; // Base stock unit in warehouse (e.g. Pcs, Lembar, Meter)
  conversionRatio?: number; // 1 orderUnit = X stockUnit (default 1)
  quantity: number; // in order unit
  unitPrice: number; // price per order unit
  discountPercent: number;
  subtotal: number;
  receivedQuantity: number; // in order unit
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // PO-202608-001
  prId?: string;
  prNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierContactPerson: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerm: PaymentTerm;
  items: POItem[];
  subtotal: number;
  ppnPercent: number; // e.g. 11 or 0
  ppnAmount: number;
  shippingFee: number;
  grandTotal: number;
  status: POStatus;
  notes?: string;
  termsAndConditions?: string;
  approvedBy: string;
  issuedBy: string;
  createdAt: string;
}

export interface GRNItem {
  id: string;
  poItemId: string;
  itemId?: string;
  sku: string;
  itemName: string;
  unit: string; // Order unit (e.g. Dus)
  purchaseUnit?: string; // Order unit alias
  stockUnit?: string; // Base stock unit (e.g. Pcs)
  conversionRatio?: number; // 1 order unit = X stock units
  orderedQuantity: number; // in order unit
  previouslyReceived: number; // in order unit
  remainingQuantity: number; // in order unit
  receivedQuantity: number; // in order unit
  condition: StockCondition;
  warehouseLocation: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string; // GRN-202608-001
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  deliveryOrderNo: string; // No. Surat Jalan Supplier
  receiveDate: string;
  receiverName: string;
  warehouseLocation: string;
  items: GRNItem[];
  totalItemsReceived: number;
  status: 'lengkap' | 'sebagian' | 'ada_reject';
  notes?: string;
  createdAt: string;
}

export interface WarehouseConfig {
  id: string;
  code: string;
  name: string;
  type: 'warehouse' | 'store';
  city: string;
  isActive: boolean;
}

export interface InventoryCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface StockOpnameLine {
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  rack: string;
  category: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  notes?: string;
}

export interface StockOpname {
  id: string;
  opnameNumber: string;
  date: string;
  template: 'harian' | 'bulanan' | 'rak' | 'kategori';
  warehouseId: string;
  warehouseName: string;
  filterValue?: string;
  lines: StockOpnameLine[];
  status: 'selesai';
  countedBy: string;
  createdAt: string;
}

export interface StockTransferItem {
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  quantity: number;
}

export interface StoreTransfer {
  id: string;
  transferNumber: string;
  date: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationStoreId: string;
  destinationStoreName: string;
  items: StockTransferItem[];
  status: 'dikirim' | 'diterima';
  sentBy: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
}

export type ActiveTab = 'dashboard' | 'requisitions' | 'purchase_orders' | 'goods_receipts' | 'warehouse' | 'stock_opname' | 'store_transfers' | 'suppliers';
