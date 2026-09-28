import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  WarehouseItem,
  Supplier,
  PurchaseRequisition,
  PurchaseOrder,
  GoodsReceipt,
  StockMovement,
  PRStatus,
  POStatus,
  StockCondition,
  ActiveTab,
  StockOpname,
  StoreTransfer,
  WarehouseConfig,
  InventoryCategory,
} from '../types';
import {
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  INITIAL_REQUISITIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_STOCK_MOVEMENTS,
} from '../data/initialData';
import { recordActivity } from '../services/activityLog';
import { useAuth } from '../components/auth/AuthContext';
import { STORAGE_KEYS as CLOUD_STORAGE_KEYS, type CloudSnapshot, writeLocalSnapshot } from '../services/cloudPersistence';
import {
  calculateWeightedAverageCost,
  getAverageUnitCost,
  getInventoryValue,
} from '../utils/inventoryPricing';

interface PurchasingContextType {
  // Navigation & UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchGlobal: string;
  setSearchGlobal: (query: string) => void;
  activeWarehouseId: string;
  activeWarehouse: WarehouseConfig;
  accessibleWarehouses: WarehouseConfig[];
  setActiveWarehouseId: (warehouseId: string) => void;

  // Master Data
  items: WarehouseItem[];
  suppliers: Supplier[];
  requisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  stockMovements: StockMovement[];
  stockOpnames: StockOpname[];
  storeTransfers: StoreTransfer[];
  warehouses: WarehouseConfig[];
  inventoryCategories: InventoryCategory[];

  // Warehouse Item Actions
  addItem: (item: Omit<WarehouseItem, 'id' | 'updatedAt'>) => WarehouseItem;
  updateItem: (id: string, item: Partial<WarehouseItem>) => void;
  deleteItem: (id: string) => boolean;
  adjustStock: (
    itemId: string,
    adjustmentQty: number,
    type: 'penyesuaian_masuk' | 'penyesuaian_keluar' | 'pengambilan_internal' | 'retur',
    referenceNo: string,
    notes: string,
    operator: string
  ) => void;

  // Supplier Actions
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  addQuickSupplier: (name: string) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => boolean;

  // PR Actions
  createPR: (
    pr: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'status'> & { status?: PRStatus }
  ) => PurchaseRequisition;
  updatePR: (id: string, pr: Partial<PurchaseRequisition>) => void;
  updatePRStatus: (id: string, status: PRStatus, reasonOrApprover?: string) => void;
  convertPRtoPO: (prId: string, supplierId: string, paymentTerm?: string, ppnPercent?: number) => PurchaseOrder | null;
  deletePR: (id: string) => void;

  // PO Actions
  createPO: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => PurchaseOrder;
  updatePO: (id: string, po: Partial<PurchaseOrder>) => void;
  updatePOStatus: (id: string, status: POStatus) => void;
  deletePO: (id: string) => void;

  // Goods Receipt Actions
  createGoodsReceipt: (
    grnData: Omit<GoodsReceipt, 'id' | 'grnNumber' | 'createdAt' | 'totalItemsReceived' | 'status'>
  ) => GoodsReceipt;
  deleteGRN: (id: string) => void;

  createStockOpname: (data: Omit<StockOpname, 'id' | 'opnameNumber' | 'createdAt' | 'status'>) => StockOpname;
  createStoreTransfer: (data: Omit<StoreTransfer, 'id' | 'transferNumber' | 'createdAt' | 'status'>) => StoreTransfer | null;
  confirmStoreTransfer: (id: string, receivedBy: string) => void;

  // Analytics Helpers
  getLowStockItems: () => WarehouseItem[];
  getPendingPRsCount: () => number;
  getActivePOsCount: () => number;
  getTotalMonthlySpend: () => number;
  getInventoryAssetValue: () => number;

  // System & Import/Export actions
  importWarehouseItems: (importedItems: Partial<WarehouseItem>[], mode: 'merge' | 'replace') => number;
  importSuppliers: (importedSuppliers: Partial<Supplier>[], mode: 'merge' | 'replace') => number;
  importFullBackup: (backupData: any) => boolean;
  exportDatabaseJSON: () => void;
  applyCloudSnapshot: (snapshot: Partial<CloudSnapshot>, version: number) => void;
}

const STORAGE_KEYS = {
  CLEANED_FLAG: 'kiri_empty_db_clean_flag_v1',
  ITEMS: 'kiri_warehouse_items',
  SUPPLIERS: 'kiri_suppliers',
  PRS: 'kiri_requisitions',
  POS: 'kiri_purchase_orders',
  GRNS: 'kiri_goods_receipts',
  MOVEMENTS: 'kiri_stock_movements',
  OPNAMES: 'kiri_stock_opnames',
  TRANSFERS: 'kiri_store_transfers',
  WAREHOUSES: 'kiri_warehouses',
  CATEGORIES: 'kiri_inventory_categories',
};

const DEFAULT_WAREHOUSES: WarehouseConfig[] = [
  { id: 'wh-jkt', code: 'JKT', name: 'Warehouse Jakarta', type: 'warehouse', city: 'Jakarta', isActive: true },
  { id: 'wh-aceh', code: 'ACH', name: 'Warehouse Aceh', type: 'warehouse', city: 'Banda Aceh', isActive: true },
  { id: 'wh-roti', code: 'RTI', name: 'Warehouse Roti', type: 'warehouse', city: 'Banda Aceh', isActive: true },
  { id: 'store-bintaro', code: 'BTR', name: 'Bintaro', type: 'store', city: 'Tangerang Selatan', isActive: true },
  { id: 'store-graha', code: 'GRH', name: 'Graha Raya', type: 'store', city: 'Tangerang', isActive: true },
  { id: 'store-tmp', code: 'TMP', name: 'TMP', type: 'store', city: 'Banda Aceh', isActive: true },
  { id: 'store-lamteh', code: 'LMT', name: 'Lamteh', type: 'store', city: 'Banda Aceh', isActive: true },
  { id: 'store-batoh', code: 'BTH', name: 'Batoh', type: 'store', city: 'Banda Aceh', isActive: true },
  { id: 'store-roti', code: 'SRT', name: 'Store Roti Kiri', type: 'store', city: 'Banda Aceh', isActive: true },
];

const PurchasingContext = createContext<PurchasingContextType | undefined>(undefined);

export const PurchasingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchGlobal, setSearchGlobal] = useState<string>('');
  const allowedWarehouseIds = profile.warehouseIds.length ? profile.warehouseIds : ['wh-aceh'];
  const [activeWarehouseId, setActiveWarehouseIdState] = useState(() => {
    const saved = localStorage.getItem('kiri_active_warehouse');
    return saved && allowedWarehouseIds.includes(saved) ? saved : allowedWarehouseIds[0];
  });

  // Automatically reset previous sample data to empty database if not already cleaned
  const initializeCleanState = () => {
    try {
      const isCleaned = localStorage.getItem(STORAGE_KEYS.CLEANED_FLAG);
      if (!isCleaned) {
        localStorage.setItem(STORAGE_KEYS.CLEANED_FLAG, 'true');
        localStorage.removeItem(STORAGE_KEYS.ITEMS);
        localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
        localStorage.removeItem(STORAGE_KEYS.PRS);
        localStorage.removeItem(STORAGE_KEYS.POS);
        localStorage.removeItem(STORAGE_KEYS.GRNS);
        localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
        localStorage.removeItem(STORAGE_KEYS.OPNAMES);
        localStorage.removeItem(STORAGE_KEYS.TRANSFERS);
      }
    } catch {
      // ignore
    }
  };

  // Run once on load
  initializeCleanState();

  // Local storage state initialization (defaults to empty arrays [])
  const [items, setItems] = useState<WarehouseItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRS);
    return saved ? JSON.parse(saved) : INITIAL_REQUISITIONS;
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POS);
    return saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
  });

  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GRNS);
    return saved ? JSON.parse(saved) : INITIAL_GOODS_RECEIPTS;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPNAMES);
    return saved ? JSON.parse(saved) : [];
  });
  const [storeTransfers, setStoreTransfers] = useState<StoreTransfer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [warehouses] = useState<WarehouseConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WAREHOUSES);
    return saved ? JSON.parse(saved) : DEFAULT_WAREHOUSES;
  });
  const [inventoryCategories] = useState<InventoryCategory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return saved ? JSON.parse(saved) : [];
  });
  const applyCloudSnapshot = useCallback((snapshot: Partial<CloudSnapshot>, version: number) => {
    writeLocalSnapshot(snapshot);
    localStorage.setItem('kiri_app_state_version', String(version));

    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.ITEMS])) setItems(snapshot[CLOUD_STORAGE_KEYS.ITEMS] as WarehouseItem[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.SUPPLIERS])) setSuppliers(snapshot[CLOUD_STORAGE_KEYS.SUPPLIERS] as Supplier[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.PRS])) setRequisitions(snapshot[CLOUD_STORAGE_KEYS.PRS] as PurchaseRequisition[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.POS])) setPurchaseOrders(snapshot[CLOUD_STORAGE_KEYS.POS] as PurchaseOrder[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.GRNS])) setGoodsReceipts(snapshot[CLOUD_STORAGE_KEYS.GRNS] as GoodsReceipt[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.MOVEMENTS])) setStockMovements(snapshot[CLOUD_STORAGE_KEYS.MOVEMENTS] as StockMovement[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.OPNAMES])) setStockOpnames(snapshot[CLOUD_STORAGE_KEYS.OPNAMES] as StockOpname[]);
    if (Array.isArray(snapshot[CLOUD_STORAGE_KEYS.TRANSFERS])) setStoreTransfers(snapshot[CLOUD_STORAGE_KEYS.TRANSFERS] as StoreTransfer[]);
  }, []);
  const accessibleWarehouses = warehouses.filter((warehouse) => warehouse.type === 'warehouse' && warehouse.isActive && allowedWarehouseIds.includes(warehouse.id));
  const activeWarehouse = accessibleWarehouses.find((warehouse) => warehouse.id === activeWarehouseId) || accessibleWarehouses[0] || warehouses.find((warehouse) => warehouse.id === 'wh-aceh') || DEFAULT_WAREHOUSES[1];
  const setActiveWarehouseId = (warehouseId: string) => {
    if (!accessibleWarehouses.some((warehouse) => warehouse.id === warehouseId)) return;
    setActiveWarehouseIdState(warehouseId);
    localStorage.setItem('kiri_active_warehouse', warehouseId);
    setSearchGlobal('');
  };

  useEffect(() => {
    if (!allowedWarehouseIds.includes(activeWarehouseId)) {
      const fallback = allowedWarehouseIds[0] || 'wh-aceh';
      setActiveWarehouseIdState(fallback);
      localStorage.setItem('kiri_active_warehouse', fallback);
    }
  }, [activeWarehouseId, profile.id, profile.warehouseIds.join('|')]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRS, JSON.stringify(requisitions));
  }, [requisitions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GRNS, JSON.stringify(goodsReceipts));
  }, [goodsReceipts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(stockMovements));
  }, [stockMovements]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.OPNAMES, JSON.stringify(stockOpnames)); }, [stockOpnames]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(storeTransfers)); }, [storeTransfers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.WAREHOUSES, JSON.stringify(warehouses)); }, [warehouses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(inventoryCategories)); }, [inventoryCategories]);

  // ID generators
  const generatePRNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = requisitions.filter((record) => (record.warehouseId || 'wh-aceh') === activeWarehouse.id).length + 1;
    return `PR-${activeWarehouse.code}-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  const generatePONumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = purchaseOrders.filter((record) => (record.warehouseId || 'wh-aceh') === activeWarehouse.id).length + 1;
    return `PO-${activeWarehouse.code}-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  const generateGRNNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = goodsReceipts.filter((record) => (record.warehouseId || 'wh-aceh') === activeWarehouse.id).length + 1;
    return `GR-${activeWarehouse.code}-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  // Warehouse Item Functions
  const addItem = (itemData: Omit<WarehouseItem, 'id' | 'updatedAt'>): WarehouseItem => {
    const newItem: WarehouseItem = {
      ...itemData,
      warehouseId: itemData.warehouseId || activeWarehouse.id,
      id: `item-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
    void recordActivity('create', 'sku', newItem.id, `Menambahkan SKU ${newItem.sku} — ${newItem.name}`, { sku: newItem.sku });

    if (newItem.currentStock > 0) {
      // Create initial stock movement
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: newItem.id,
        itemSku: newItem.sku,
        itemName: newItem.name,
        warehouseId: newItem.warehouseId,
        type: 'penyesuaian_masuk',
        quantity: newItem.currentStock,
        previousStock: 0,
        newStock: newItem.currentStock,
        referenceNo: 'INIT-STOCK',
        date: new Date().toISOString(),
        notes: 'Stok Awal Pendaftaran Barang Baru',
        operator: 'Admin Gudang',
      };
      setStockMovements((prev) => [movement, ...prev]);
    }
    return newItem;
  };

  const updateItem = (id: string, updatedFields: Partial<WarehouseItem>) => {
    const target = items.find(item => item.id === id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() }
          : item
      )
    );
    void recordActivity('update', 'sku', id, `Memperbarui SKU ${target?.sku || id}`, { fields: Object.keys(updatedFields) });
  };

  const deleteItem = (id: string): boolean => {
    // Check if item is used in any PO
    const usedInPO = purchaseOrders.some((po) =>
      po.items.some((i) => i.itemId === id || i.sku === items.find((x) => x.id === id)?.sku)
    );
    if (usedInPO) {
      alert('Barang tidak dapat dihapus karena sudah tercatat dalam riwayat Purchase Order (PO).');
      return false;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    const deleted = items.find(item => item.id === id);
    void recordActivity('delete', 'sku', id, `Menghapus SKU ${deleted?.sku || id}`);
    return true;
  };

  const adjustStock = (
    itemId: string,
    adjustmentQty: number,
    type: 'penyesuaian_masuk' | 'penyesuaian_keluar' | 'pengambilan_internal' | 'retur',
    referenceNo: string,
    notes: string,
    operator: string
  ) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const previousStock = targetItem.currentStock;
    const isAdding = type === 'penyesuaian_masuk';
    const effectiveQty = isAdding ? Math.abs(adjustmentQty) : -Math.abs(adjustmentQty);
    const newStock = Math.max(0, previousStock + effectiveQty);

    // Update item stock
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, currentStock: newStock, updatedAt: new Date().toISOString() }
          : i
      )
    );

    // Log movement
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: targetItem.id,
      itemSku: targetItem.sku,
      itemName: targetItem.name,
      warehouseId: targetItem.warehouseId || activeWarehouse.id,
      type,
      quantity: effectiveQty,
      previousStock,
      newStock,
      referenceNo: referenceNo || `ADJ-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      notes,
      operator: operator || 'Petugas Gudang',
    };
    setStockMovements((prev) => [newMovement, ...prev]);
    void recordActivity('stock', 'sku', targetItem.id, `Mutasi stok ${targetItem.sku}: ${effectiveQty > 0 ? '+' : ''}${effectiveQty}`, { referenceNo: newMovement.referenceNo, newStock });
  };

  // Supplier Functions
  const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [...prev, newSupplier]);
    void recordActivity('create', 'supplier', newSupplier.id, `Menambahkan supplier ${newSupplier.name}`);
    return newSupplier;
  };

  const addQuickSupplier = (name: string): Supplier => {
    const trimmed = name.trim();
    const existing = suppliers.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const count = suppliers.length + 1;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      code: `SUP-${String(count).padStart(3, '0')}`,
      name: trimmed,
      category: 'Umum & Operasional',
      contactPerson: 'PIC Vendor',
      phone: '-',
      email: '-',
      address: 'Alamat Supplier',
      city: 'Indonesia',
      paymentTermDefault: 'net_30',
      isActive: true,
    };
    setSuppliers((prev) => [...prev, newSup]);
    void recordActivity('create', 'supplier', newSup.id, `Menambahkan supplier cepat ${newSup.name}`);
    return newSup;
  };

  const updateSupplier = (id: string, updatedFields: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((sup) => (sup.id === id ? { ...sup, ...updatedFields } : sup))
    );
    void recordActivity('update', 'supplier', id, `Memperbarui supplier ${suppliers.find(item => item.id === id)?.name || id}`);
  };

  const deleteSupplier = (id: string): boolean => {
    const usedInPO = purchaseOrders.some((po) => po.supplierId === id);
    if (usedInPO) {
      alert('Supplier tidak dapat dihapus karena memiliki riwayat Purchase Order.');
      return false;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    void recordActivity('delete', 'supplier', id, `Menghapus supplier ${suppliers.find(item => item.id === id)?.name || id}`);
    return true;
  };

  // PR Functions
  const createPR = (
    prData: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'status'> & { status?: PRStatus }
  ): PurchaseRequisition => {
    const newPR: PurchaseRequisition = {
      ...prData,
      warehouseId: prData.warehouseId || activeWarehouse.id,
      warehouseName: prData.warehouseName || activeWarehouse.name,
      id: `pr-${Date.now()}`,
      prNumber: generatePRNumber(),
      status: prData.status || 'menunggu_persetujuan',
      pricingStatus: prData.pricingStatus || 'belum_diminta',
      createdAt: new Date().toISOString(),
    };
    setRequisitions((prev) => [newPR, ...prev]);
    void recordActivity('create', 'pr', newPR.id, `Membuat ${newPR.prNumber}`, { status: newPR.status });
    return newPR;
  };

  const updatePR = (id: string, updatedFields: Partial<PurchaseRequisition>) => {
    setRequisitions((prev) =>
      prev.map((pr) => (pr.id === id ? { ...pr, ...updatedFields } : pr))
    );
    void recordActivity('update', 'pr', id, `Memperbarui ${requisitions.find(item => item.id === id)?.prNumber || id}`);
  };

  const updatePRStatus = (id: string, status: PRStatus, reasonOrApprover?: string) => {
    setRequisitions((prev) =>
      prev.map((pr) => {
        if (pr.id !== id) return pr;
        if (status === 'disetujui') {
          return {
            ...pr,
            status,
            pricingStatus: pr.pricingStatus || 'belum_diminta',
            approvedBy: reasonOrApprover || 'Manajer Operasional',
            approvedAt: new Date().toISOString(),
          };
        } else if (status === 'ditolak') {
          return {
            ...pr,
            status,
            rejectionReason: reasonOrApprover || 'Alasan penolakan tidak dicantumkan',
          };
        }
        return { ...pr, status };
      })
    );
    void recordActivity('status', 'pr', id, `Mengubah status ${requisitions.find(item => item.id === id)?.prNumber || id} menjadi ${status}`);
  };

  const convertPRtoPO = (
    prId: string,
    supplierId: string,
    paymentTerm?: string,
    ppnPercent: number = 11
  ): PurchaseOrder | null => {
    const targetPR = requisitions.find((pr) => pr.id === prId);
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    if (!targetPR || !targetSupplier) return null;
    if (targetPR.pricingStatus !== 'harga_diterima') {
      alert('Harga supplier untuk PR ini belum selesai. Input dan simpan penawaran harga sebelum menerbitkan PO.');
      return null;
    }

    const poItems = targetPR.items.map((item, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      itemId: item.itemId,
      sku: item.sku || `SKU-${idx + 1}`,
      itemName: item.itemName,
      unit: item.unit,
      purchaseUnit: item.unit,
      stockUnit: item.stockUnit,
      conversionRatio: item.conversionRatio && item.conversionRatio > 0 ? item.conversionRatio : 1,
      quantity: item.quantity,
      unitPrice: item.estimatedUnitPrice || 0,
      discountPercent: 0,
      subtotal: item.quantity * (item.estimatedUnitPrice || 0),
      receivedQuantity: 0,
    }));

    const subtotal = poItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const ppnAmount = (subtotal * (ppnPercent || 0)) / 100;
    const grandTotal = subtotal + ppnAmount;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: generatePONumber(),
      warehouseId: targetPR.warehouseId || activeWarehouse.id,
      warehouseName: targetPR.warehouseName || activeWarehouse.name,
      prId: targetPR.id,
      prNumber: targetPR.prNumber,
      supplierId: targetSupplier.id,
      supplierName: targetSupplier.name,
      supplierAddress: targetSupplier.address,
      supplierPhone: targetSupplier.phone,
      supplierEmail: targetSupplier.email,
      supplierContactPerson: targetSupplier.contactPerson,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: targetPR.requiredDate,
      paymentTerm: (paymentTerm || targetSupplier.paymentTermDefault) as any,
      items: poItems,
      subtotal,
      ppnPercent,
      ppnAmount,
      shippingFee: 0,
      grandTotal,
      status: 'diterbitkan',
      notes: `Dikonversi dari Permintaan Pembelian ${targetPR.prNumber} (${targetPR.department}). Keperluan: ${targetPR.purpose}`,
      termsAndConditions: '1. Barang wajib dalam kondisi baru, tersegel, dan sesuai spesifikasi mutu.\n2. Faktur tagihan & surat jalan wajib melampirkan nomor PO resmi ini.\n3. Segala cacat fisik saat penerimaan wajib diganti oleh supplier.',
      approvedBy: 'Manajer Purchasing & Logistik',
      issuedBy: 'Admin Kiri Purchasing',
      createdAt: new Date().toISOString(),
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    void recordActivity('create', 'po', newPO.id, `Mengonversi ${targetPR.prNumber} menjadi ${newPO.poNumber}`);

    // Mark PR as converted
    setRequisitions((prev) =>
      prev.map((pr) =>
        pr.id === prId
          ? {
              ...pr,
              status: 'dikonversi_ke_po',
              convertedToPoId: newPO.id,
            }
          : pr
      )
    );

    return newPO;
  };

  const deletePR = (id: string) => {
    setRequisitions((prev) => prev.filter((pr) => pr.id !== id));
    void recordActivity('delete', 'pr', id, `Menghapus ${requisitions.find(item => item.id === id)?.prNumber || id}`);
  };

  // PO Functions
  const createPO = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
      ...poData,
      warehouseId: poData.warehouseId || activeWarehouse.id,
      warehouseName: poData.warehouseName || activeWarehouse.name,
      id: `po-${Date.now()}`,
      poNumber: generatePONumber(),
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    void recordActivity('create', 'po', newPO.id, `Membuat ${newPO.poNumber}`);
    return newPO;
  };

  const updatePO = (id: string, updatedFields: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, ...updatedFields } : po))
    );
    void recordActivity('update', 'po', id, `Memperbarui ${purchaseOrders.find(item => item.id === id)?.poNumber || id}`);
  };

  const updatePOStatus = (id: string, status: POStatus) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, status } : po))
    );
    void recordActivity('status', 'po', id, `Mengubah status ${purchaseOrders.find(item => item.id === id)?.poNumber || id} menjadi ${status}`);
  };

  const deletePO = (id: string) => {
    const hasGRN = goodsReceipts.some((g) => g.poId === id);
    if (hasGRN) {
      alert('PO tidak dapat dihapus karena sudah memiliki riwayat Penerimaan Barang (GRN).');
      return;
    }
    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
    void recordActivity('delete', 'po', id, `Menghapus ${purchaseOrders.find(item => item.id === id)?.poNumber || id}`);
  };

  // Goods Receipt Functions (Core Warehouse Integration)
  const createGoodsReceipt = (
    grnData: Omit<GoodsReceipt, 'id' | 'grnNumber' | 'createdAt' | 'totalItemsReceived' | 'status'>
  ): GoodsReceipt => {
    const grnNumber = generateGRNNumber();
    const totalItemsReceived = grnData.items.reduce(
      (sum, item) => sum + (item.receivedQuantity || 0),
      0
    );

    // Determine status
    const hasAnyReject = grnData.items.some((item) => item.condition === 'rusak');
    
    // Check if PO items will be fully received
    const targetPO = purchaseOrders.find((po) => po.id === grnData.poId);

    const newGRN: GoodsReceipt = {
      ...grnData,
      warehouseId: targetPO?.warehouseId || grnData.warehouseId || activeWarehouse.id,
      warehouseName: targetPO?.warehouseName || grnData.warehouseName || activeWarehouse.name,
      id: `grn-${Date.now()}`,
      grnNumber,
      totalItemsReceived,
      status: hasAnyReject ? 'ada_reject' : 'lengkap',
      createdAt: new Date().toISOString(),
    };

    // 1. Update Goods Receipts list
    setGoodsReceipts((prev) => [newGRN, ...prev]);
    void recordActivity('create', 'grn', newGRN.id, `Mencatat penerimaan ${newGRN.grnNumber}`, { poNumber: newGRN.poNumber });

    // 2. Increase Warehouse inventory & Create Stock Movement Logs for accepted items
    const newMovements: StockMovement[] = [];
    const itemUpdatesMap: Record<string, {
      stock: number;
      averageUnitCost: number;
      lastPurchasePrice: number;
      priceBasis: 'purchase_unit' | 'base_unit';
    }> = {};

    grnData.items.forEach((receiptItem) => {
      // Only add to available inventory if condition is 'baik'
      const acceptedQty = receiptItem.condition === 'baik' ? receiptItem.receivedQuantity : 0;
      const ratio = receiptItem.conversionRatio && receiptItem.conversionRatio > 0 ? receiptItem.conversionRatio : 1;
      const stockQtyToAdd = acceptedQty * ratio;
      
      // Find matching item in warehouse DB
      const existingItem = items.find(
        (i) => i.id === receiptItem.itemId || i.sku.toLowerCase() === receiptItem.sku.toLowerCase()
      );

      if (existingItem) {
        const previousUpdate = itemUpdatesMap[existingItem.id];
        const stockBeforeReceipt = previousUpdate?.stock ?? existingItem.currentStock;
        const averageBeforeReceipt = previousUpdate?.averageUnitCost ?? getAverageUnitCost(existingItem);
        const matchingPoItem = targetPO?.items.find(
          (poItem) => poItem.id === receiptItem.poItemId || poItem.sku === receiptItem.sku
        );
        const purchaseUnitPrice = matchingPoItem
          ? matchingPoItem.unitPrice * (1 - (matchingPoItem.discountPercent || 0) / 100)
          : previousUpdate?.lastPurchasePrice ?? 0;
        const receivedBaseUnitCost = purchaseUnitPrice / ratio;
        itemUpdatesMap[existingItem.id] = {
          stock: stockBeforeReceipt + stockQtyToAdd,
          averageUnitCost: stockQtyToAdd > 0 && matchingPoItem
            ? calculateWeightedAverageCost(
                stockBeforeReceipt,
                averageBeforeReceipt,
                stockQtyToAdd,
                receivedBaseUnitCost
              )
            : averageBeforeReceipt,
          lastPurchasePrice: matchingPoItem
            ? purchaseUnitPrice
            : previousUpdate?.lastPurchasePrice ?? existingItem.lastPurchasePrice,
          priceBasis: matchingPoItem
            ? 'purchase_unit'
            : previousUpdate?.priceBasis ?? existingItem.priceBasis ?? 'base_unit',
        };
        
        if (stockQtyToAdd > 0) {
          const unitNote = ratio > 1 
            ? `${acceptedQty} ${receiptItem.unit} (${stockQtyToAdd} ${receiptItem.stockUnit || existingItem.unit})` 
            : `${acceptedQty} ${receiptItem.unit || existingItem.unit}`;

          newMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            itemId: existingItem.id,
            itemSku: existingItem.sku,
            itemName: existingItem.name,
            warehouseId: newGRN.warehouseId,
            type: 'penerimaan_po',
            quantity: stockQtyToAdd,
            previousStock: existingItem.currentStock,
            newStock: existingItem.currentStock + stockQtyToAdd,
            referenceNo: grnNumber,
            date: new Date().toISOString(),
            notes: `Penerimaan Barang: ${unitNote} | PO: ${grnData.poNumber} | SJ: ${grnData.deliveryOrderNo}`,
            operator: grnData.receiverName,
          });
        }
      }
    });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // Apply stock updates to items
    if (Object.keys(itemUpdatesMap).length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          const update = itemUpdatesMap[item.id];
          if (update !== undefined) {
            return {
              ...item,
              currentStock: update.stock,
              lastPurchasePrice: update.lastPurchasePrice,
              priceBasis: update.priceBasis,
              averageUnitCost: update.averageUnitCost,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        })
      );
    }

    // 3. Update PO received quantity & PO Status
    if (targetPO) {
      let isFullyReceived = true;
      let hasReceivedSomething = false;

      const updatedPoItems = targetPO.items.map((poItem) => {
        const matchingReceipt = grnData.items.find((r) => r.poItemId === poItem.id || r.sku === poItem.sku);
        const addedQty = matchingReceipt ? (matchingReceipt.receivedQuantity || 0) : 0;
        const newReceivedQty = (poItem.receivedQuantity || 0) + addedQty;

        if (newReceivedQty > 0) hasReceivedSomething = true;
        if (newReceivedQty < poItem.quantity) isFullyReceived = false;

        return {
          ...poItem,
          receivedQuantity: newReceivedQty,
        };
      });

      const newPOStatus: POStatus = isFullyReceived
        ? 'selesai'
        : hasReceivedSomething
        ? 'diterima_sebagian'
        : targetPO.status;

      setPurchaseOrders((prev) =>
        prev.map((po) =>
          po.id === targetPO.id
            ? {
                ...po,
                items: updatedPoItems,
                status: newPOStatus,
              }
            : po
        )
      );
    }

    return newGRN;
  };

  const deleteGRN = (id: string) => {
    if (confirm('Hapus bukti penerimaan ini? Catatan: Stok gudang yang sudah bertambah tidak akan berkurang otomatis.')) {
      setGoodsReceipts((prev) => prev.filter((g) => g.id !== id));
      void recordActivity('delete', 'grn', id, 'Menghapus bukti penerimaan barang');
    }
  };

  const createStockOpname = (data: Omit<StockOpname, 'id' | 'opnameNumber' | 'createdAt' | 'status'>): StockOpname => {
    const now = new Date();
    const warehouseCode = warehouses.find((warehouse) => warehouse.id === data.warehouseId)?.code || activeWarehouse.code;
    const count = stockOpnames.filter((record) => record.warehouseId === data.warehouseId).length + 1;
    const opnameNumber = `SO-${warehouseCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    const completed: StockOpname = { ...data, id: `opname-${Date.now()}`, opnameNumber, status: 'selesai', createdAt: now.toISOString() };
    const movements: StockMovement[] = [];
    setItems((current) => current.map((item) => {
      const line = data.lines.find((entry) => entry.itemId === item.id);
      if (!line || line.physicalStock === item.currentStock) return item;
      movements.push({ id: `mov-op-${Date.now()}-${item.id}`, itemId: item.id, itemSku: item.sku, itemName: item.name, warehouseId: data.warehouseId, type: 'opname_adjustment', quantity: line.physicalStock - item.currentStock, previousStock: item.currentStock, newStock: line.physicalStock, referenceNo: opnameNumber, date: now.toISOString(), notes: line.notes || `Penyesuaian stock opname ${data.template}`, operator: data.countedBy });
      return { ...item, currentStock: line.physicalStock, updatedAt: now.toISOString() };
    }));
    if (movements.length) setStockMovements((current) => [...movements, ...current]);
    setStockOpnames((current) => [completed, ...current]);
    void recordActivity('stock', 'opname', completed.id, `Menyelesaikan ${opnameNumber}`, { warehouse: data.warehouseName, lines: data.lines.length });
    return completed;
  };

  const createStoreTransfer = (data: Omit<StoreTransfer, 'id' | 'transferNumber' | 'createdAt' | 'status'>): StoreTransfer | null => {
    const insufficient = data.items.find((entry) => (items.find((item) => item.id === entry.itemId)?.currentStock || 0) < entry.quantity);
    if (insufficient) {
      alert(`Stok ${insufficient.itemName} tidak cukup untuk transfer.`);
      return null;
    }
    const now = new Date();
    const sourceCode = warehouses.find((warehouse) => warehouse.id === data.sourceWarehouseId)?.code || 'SRC';
    const destinationCode = warehouses.find((warehouse) => warehouse.id === data.destinationStoreId)?.code || 'DST';
    const transferNumber = `TRF-${sourceCode}-${destinationCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(storeTransfers.length + 1).padStart(3, '0')}`;
    const transfer: StoreTransfer = { ...data, id: `transfer-${Date.now()}`, transferNumber, status: 'dikirim', createdAt: now.toISOString() };
    const movements: StockMovement[] = [];
    setItems((current) => current.map((item) => {
      const line = data.items.find((entry) => entry.itemId === item.id);
      if (!line) return item;
      const nextStock = item.currentStock - line.quantity;
      movements.push({ id: `mov-trf-${Date.now()}-${item.id}`, itemId: item.id, itemSku: item.sku, itemName: item.name, warehouseId: data.sourceWarehouseId, type: 'transfer_keluar', quantity: -line.quantity, previousStock: item.currentStock, newStock: nextStock, referenceNo: transferNumber, date: now.toISOString(), notes: `Dikirim ke ${data.destinationStoreName}. Belum menjadi stok store sampai dikonfirmasi.`, operator: data.sentBy });
      return { ...item, currentStock: nextStock, updatedAt: now.toISOString() };
    }));
    setStockMovements((current) => [...movements, ...current]);
    setStoreTransfers((current) => [transfer, ...current]);
    void recordActivity('stock', 'transfer', transfer.id, `Mengirim ${transferNumber} ke ${data.destinationStoreName}`, { items: data.items.length });
    return transfer;
  };

  const confirmStoreTransfer = (id: string, receivedBy: string) => {
    const transfer = storeTransfers.find((entry) => entry.id === id);
    if (!transfer) return;
    const destination = warehouses.find((warehouse) => warehouse.id === transfer.destinationStoreId);
    if (destination?.type === 'warehouse') {
      const now = new Date().toISOString();
      const inboundMovements: StockMovement[] = [];
      setItems((current) => {
        const next = [...current];
        transfer.items.forEach((line) => {
          const source = current.find((item) => item.id === line.itemId);
          if (!source) return;
          const targetIndex = next.findIndex((item) => (item.warehouseId || 'wh-aceh') === destination.id && item.sku.toLowerCase() === source.sku.toLowerCase());
          const previousStock = targetIndex >= 0 ? next[targetIndex].currentStock : 0;
          const target = targetIndex >= 0 ? next[targetIndex] : { ...source, id: `item-${destination.code.toLowerCase()}-${Date.now()}-${line.itemId}`, warehouseId: destination.id, currentStock: 0, warehouseLocation: 'Penerimaan transfer', updatedAt: now };
          const updated = { ...target, currentStock: previousStock + line.quantity, updatedAt: now };
          if (targetIndex >= 0) next[targetIndex] = updated; else next.unshift(updated);
          inboundMovements.push({ id: `mov-trf-in-${Date.now()}-${line.itemId}`, itemId: updated.id, itemSku: updated.sku, itemName: updated.name, warehouseId: destination.id, type: 'transfer_masuk', quantity: line.quantity, previousStock, newStock: updated.currentStock, referenceNo: transfer.transferNumber, date: now, notes: `Diterima dari ${transfer.sourceWarehouseName}`, operator: receivedBy });
        });
        return next;
      });
      if (inboundMovements.length) setStockMovements((current) => [...inboundMovements, ...current]);
    }
    setStoreTransfers((current) => current.map((entry) => entry.id === id ? { ...entry, status: 'diterima', receivedBy, receivedAt: new Date().toISOString() } : entry));
    void recordActivity('status', 'transfer', id, `Konfirmasi penerimaan ${transfer.transferNumber}`, { receivedBy, destination: transfer.destinationStoreName });
  };

  // Analytics Helpers
  const getLowStockItems = () => {
    return items.filter((item) => item.currentStock <= item.minStock);
  };

  const getPendingPRsCount = () => {
    return requisitions.filter((pr) => pr.status === 'menunggu_persetujuan').length;
  };

  const getActivePOsCount = () => {
    return purchaseOrders.filter((po) => po.status === 'diterbitkan' || po.status === 'terkirim' || po.status === 'diterima_sebagian').length;
  };

  const getTotalMonthlySpend = () => {
    return purchaseOrders
      .filter((po) => po.status !== 'dibatalkan' && po.status !== 'draft')
      .reduce((sum, po) => sum + po.grandTotal, 0);
  };

  const getInventoryAssetValue = () => {
    return items.reduce((sum, item) => sum + getInventoryValue(item), 0);
  };

  const importWarehouseItems = (
    importedList: Partial<WarehouseItem>[],
    mode: 'merge' | 'replace' = 'merge'
  ): number => {
    if (!importedList || importedList.length === 0) return 0;

    const formatted: WarehouseItem[] = importedList.map((imp, idx) => ({
      id: imp.id || `item-${Date.now()}-${idx}`,
      sku: imp.sku?.trim() || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`,
      name: imp.name?.trim() || 'Barang Baru',
      category: imp.category || 'Bahan Baku & Kimia Industri',
      unit: imp.unit || 'Pcs',
      intermediateUnit: imp.intermediateUnit || undefined,
      intermediateConversionRatio: imp.intermediateConversionRatio && imp.intermediateConversionRatio > 0 ? imp.intermediateConversionRatio : undefined,
      purchaseUnit: imp.purchaseUnit || imp.unit || 'Pcs',
      conversionRatio: imp.conversionRatio && imp.conversionRatio > 0 ? imp.conversionRatio : 1,
      warehouseId: imp.warehouseId || activeWarehouse.id,
      currentStock: typeof imp.currentStock === 'number' ? imp.currentStock : 0,
      minStock: typeof imp.minStock === 'number' ? imp.minStock : 10,
      warehouseLocation: imp.warehouseLocation || 'Gudang Utama',
      lastPurchasePrice: typeof imp.lastPurchasePrice === 'number' ? imp.lastPurchasePrice : 0,
      priceBasis: imp.priceBasis || 'base_unit',
      averageUnitCost: typeof imp.averageUnitCost === 'number'
        ? imp.averageUnitCost
        : getAverageUnitCost({
            lastPurchasePrice: typeof imp.lastPurchasePrice === 'number' ? imp.lastPurchasePrice : 0,
            priceBasis: imp.priceBasis || 'base_unit',
            conversionRatio: imp.conversionRatio,
          }),
      primarySupplierId: imp.primarySupplierId || '',
      description: imp.description || '',
      updatedAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      setItems(formatted);
    } else {
      // Merge mode: update existing SKU or append new
      setItems((prev) => {
        const next = [...prev];
        formatted.forEach((newItem) => {
          const existingIdx = next.findIndex(
            (x) => x.sku.toLowerCase() === newItem.sku.toLowerCase()
          );
          if (existingIdx !== -1) {
            next[existingIdx] = { ...next[existingIdx], ...newItem, id: next[existingIdx].id };
          } else {
            next.push(newItem);
          }
        });
        return next;
      });
    }
    void recordActivity('import', 'sku', null, `Mengimpor ${formatted.length} SKU (${mode})`);
    return formatted.length;
  };

  const importSuppliers = (
    importedList: Partial<Supplier>[],
    mode: 'merge' | 'replace' = 'merge'
  ): number => {
    if (!importedList || importedList.length === 0) return 0;

    const formatted: Supplier[] = importedList.map((sup, idx) => ({
      id: sup.id || `sup-${Date.now()}-${idx}`,
      code: sup.code?.trim() || `SUP-${String(idx + 1).padStart(3, '0')}`,
      name: sup.name?.trim() || 'Supplier Baru',
      category: sup.category || 'Umum & Operasional',
      contactPerson: sup.contactPerson || 'PIC Vendor',
      phone: sup.phone || '-',
      email: sup.email || '-',
      address: sup.address || 'Alamat Vendor',
      city: sup.city || 'Indonesia',
      paymentTermDefault: sup.paymentTermDefault || 'net_30',
      isActive: sup.isActive !== undefined ? sup.isActive : true,
    }));

    if (mode === 'replace') {
      setSuppliers(formatted);
    } else {
      setSuppliers((prev) => {
        const next = [...prev];
        formatted.forEach((newSup) => {
          const existingIdx = next.findIndex(
            (x) => x.name.toLowerCase() === newSup.name.toLowerCase() || x.code.toLowerCase() === newSup.code.toLowerCase()
          );
          if (existingIdx !== -1) {
            next[existingIdx] = { ...next[existingIdx], ...newSup, id: next[existingIdx].id };
          } else {
            next.push(newSup);
          }
        });
        return next;
      });
    }
    void recordActivity('import', 'supplier', null, `Mengimpor ${formatted.length} supplier (${mode})`);
    return formatted.length;
  };

  const importFullBackup = (backupData: any): boolean => {
    try {
      if (!backupData || typeof backupData !== 'object') {
        alert('File backup tidak valid.');
        return false;
      }

      if (Array.isArray(backupData.items)) setItems(backupData.items);
      if (Array.isArray(backupData.suppliers)) setSuppliers(backupData.suppliers);
      if (Array.isArray(backupData.requisitions)) setRequisitions(backupData.requisitions);
      if (Array.isArray(backupData.purchaseOrders)) setPurchaseOrders(backupData.purchaseOrders);
      if (Array.isArray(backupData.goodsReceipts)) setGoodsReceipts(backupData.goodsReceipts);
      if (Array.isArray(backupData.stockMovements)) setStockMovements(backupData.stockMovements);
      if (Array.isArray(backupData.stockOpnames)) setStockOpnames(backupData.stockOpnames);
      if (Array.isArray(backupData.storeTransfers)) setStoreTransfers(backupData.storeTransfers);

      void recordActivity('import', 'backup', null, 'Memulihkan backup database aplikasi');
      alert('Restore backup database berhasil diselesaikan.');
      return true;
    } catch (err: any) {
      alert('Gagal memulihkan database: ' + (err.message || 'Format data salah.'));
      return false;
    }
  };

  const exportDatabaseJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      items,
      suppliers,
      requisitions,
      purchaseOrders,
      goodsReceipts,
      stockMovements,
      stockOpnames,
      storeTransfers,
      warehouses,
      inventoryCategories,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiri-purchasing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const belongsToActiveWarehouse = (record: { warehouseId?: string }) => (record.warehouseId || 'wh-aceh') === activeWarehouse.id;
  const scopedItems = items.filter(belongsToActiveWarehouse);
  const scopedRequisitions = requisitions.filter(belongsToActiveWarehouse);
  const scopedPurchaseOrders = purchaseOrders.filter(belongsToActiveWarehouse);
  const scopedGoodsReceipts = goodsReceipts.filter(belongsToActiveWarehouse);
  const scopedStockMovements = stockMovements.filter(belongsToActiveWarehouse);
  const scopedStockOpnames = stockOpnames.filter((record) => record.warehouseId === activeWarehouse.id);
  const scopedTransfers = storeTransfers.filter((record) => record.sourceWarehouseId === activeWarehouse.id || record.destinationStoreId === activeWarehouse.id);

  return (
    <PurchasingContext.Provider
      value={{
        activeTab,
        setActiveTab,
        searchGlobal,
        setSearchGlobal,
        activeWarehouseId: activeWarehouse.id,
        activeWarehouse,
        accessibleWarehouses,
        setActiveWarehouseId,
        items: scopedItems,
        suppliers,
        requisitions: scopedRequisitions,
        purchaseOrders: scopedPurchaseOrders,
        goodsReceipts: scopedGoodsReceipts,
        stockMovements: scopedStockMovements,
        stockOpnames: scopedStockOpnames,
        storeTransfers: scopedTransfers,
        warehouses,
        inventoryCategories,
        addItem,
        updateItem,
        deleteItem,
        adjustStock,
        addSupplier,
        addQuickSupplier,
        updateSupplier,
        deleteSupplier,
        createPR,
        updatePR,
        updatePRStatus,
        convertPRtoPO,
        deletePR,
        createPO,
        updatePO,
        updatePOStatus,
        deletePO,
        createGoodsReceipt,
        deleteGRN,
        createStockOpname,
        createStoreTransfer,
        confirmStoreTransfer,
        getLowStockItems,
        getPendingPRsCount,
        getActivePOsCount,
        getTotalMonthlySpend,
        getInventoryAssetValue,
        importWarehouseItems,
        importSuppliers,
        importFullBackup,
        exportDatabaseJSON,
        applyCloudSnapshot,
      }}
    >
      {children}
    </PurchasingContext.Provider>
  );
};

export const usePurchasing = () => {
  const context = useContext(PurchasingContext);
  if (!context) {
    throw new Error('usePurchasing must be used within a PurchasingProvider');
  }
  return context;
};
