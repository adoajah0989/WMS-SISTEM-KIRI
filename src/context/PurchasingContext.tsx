import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from '../types';
import {
  INITIAL_ITEMS,
  INITIAL_SUPPLIERS,
  INITIAL_REQUISITIONS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_STOCK_MOVEMENTS,
  SAMPLE_ITEMS,
  SAMPLE_SUPPLIERS,
  SAMPLE_REQUISITIONS,
  SAMPLE_PURCHASE_ORDERS,
  SAMPLE_GOODS_RECEIPTS,
  SAMPLE_STOCK_MOVEMENTS,
} from '../data/initialData';

interface PurchasingContextType {
  // Navigation & UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchGlobal: string;
  setSearchGlobal: (query: string) => void;

  // Master Data
  items: WarehouseItem[];
  suppliers: Supplier[];
  requisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  stockMovements: StockMovement[];

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
  clearAllDatabase: () => void;
  loadSampleData: () => void;
  resetToSampleData: () => void;
  exportDatabaseJSON: () => void;
}

const STORAGE_KEYS = {
  CLEANED_FLAG: 'kiri_empty_db_clean_flag_v1',
  ITEMS: 'kiri_warehouse_items',
  SUPPLIERS: 'kiri_suppliers',
  PRS: 'kiri_requisitions',
  POS: 'kiri_purchase_orders',
  GRNS: 'kiri_goods_receipts',
  MOVEMENTS: 'kiri_stock_movements',
};

const PurchasingContext = createContext<PurchasingContextType | undefined>(undefined);

export const PurchasingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchGlobal, setSearchGlobal] = useState<string>('');

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

  // ID generators
  const generatePRNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = requisitions.length + 1;
    return `PR-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  const generatePONumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = purchaseOrders.length + 1;
    return `PO-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  const generateGRNNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = goodsReceipts.length + 1;
    return `GRN-${yearMonth}-${String(count).padStart(3, '0')}`;
  };

  // Warehouse Item Functions
  const addItem = (itemData: Omit<WarehouseItem, 'id' | 'updatedAt'>): WarehouseItem => {
    const newItem: WarehouseItem = {
      ...itemData,
      id: `item-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);

    if (newItem.currentStock > 0) {
      // Create initial stock movement
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: newItem.id,
        itemSku: newItem.sku,
        itemName: newItem.name,
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
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() }
          : item
      )
    );
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
  };

  // Supplier Functions
  const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [...prev, newSupplier]);
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
    return newSup;
  };

  const updateSupplier = (id: string, updatedFields: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((sup) => (sup.id === id ? { ...sup, ...updatedFields } : sup))
    );
  };

  const deleteSupplier = (id: string): boolean => {
    const usedInPO = purchaseOrders.some((po) => po.supplierId === id);
    if (usedInPO) {
      alert('Supplier tidak dapat dihapus karena memiliki riwayat Purchase Order.');
      return false;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  // PR Functions
  const createPR = (
    prData: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'createdAt' | 'status'> & { status?: PRStatus }
  ): PurchaseRequisition => {
    const newPR: PurchaseRequisition = {
      ...prData,
      id: `pr-${Date.now()}`,
      prNumber: generatePRNumber(),
      status: prData.status || 'menunggu_persetujuan',
      createdAt: new Date().toISOString(),
    };
    setRequisitions((prev) => [newPR, ...prev]);
    return newPR;
  };

  const updatePR = (id: string, updatedFields: Partial<PurchaseRequisition>) => {
    setRequisitions((prev) =>
      prev.map((pr) => (pr.id === id ? { ...pr, ...updatedFields } : pr))
    );
  };

  const updatePRStatus = (id: string, status: PRStatus, reasonOrApprover?: string) => {
    setRequisitions((prev) =>
      prev.map((pr) => {
        if (pr.id !== id) return pr;
        if (status === 'disetujui') {
          return {
            ...pr,
            status,
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

    const poItems = targetPR.items.map((item, idx) => ({
      id: `poi-${Date.now()}-${idx}`,
      itemId: item.itemId,
      sku: item.sku || `SKU-${idx + 1}`,
      itemName: item.itemName,
      unit: item.unit,
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
  };

  // PO Functions
  const createPO = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber: generatePONumber(),
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    return newPO;
  };

  const updatePO = (id: string, updatedFields: Partial<PurchaseOrder>) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, ...updatedFields } : po))
    );
  };

  const updatePOStatus = (id: string, status: POStatus) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, status } : po))
    );
  };

  const deletePO = (id: string) => {
    const hasGRN = goodsReceipts.some((g) => g.poId === id);
    if (hasGRN) {
      alert('PO tidak dapat dihapus karena sudah memiliki riwayat Penerimaan Barang (GRN).');
      return;
    }
    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
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
      id: `grn-${Date.now()}`,
      grnNumber,
      totalItemsReceived,
      status: hasAnyReject ? 'ada_reject' : 'lengkap',
      createdAt: new Date().toISOString(),
    };

    // 1. Update Goods Receipts list
    setGoodsReceipts((prev) => [newGRN, ...prev]);

    // 2. Increase Warehouse inventory & Create Stock Movement Logs for accepted items
    const newMovements: StockMovement[] = [];
    const itemUpdatesMap: Record<string, number> = {};

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
        itemUpdatesMap[existingItem.id] = (itemUpdatesMap[existingItem.id] || existingItem.currentStock) + stockQtyToAdd;
        
        if (stockQtyToAdd > 0) {
          const unitNote = ratio > 1 
            ? `${acceptedQty} ${receiptItem.unit} (${stockQtyToAdd} ${receiptItem.stockUnit || existingItem.unit})` 
            : `${acceptedQty} ${receiptItem.unit || existingItem.unit}`;

          newMovements.push({
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            itemId: existingItem.id,
            itemSku: existingItem.sku,
            itemName: existingItem.name,
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
          if (itemUpdatesMap[item.id] !== undefined) {
            return {
              ...item,
              currentStock: itemUpdatesMap[item.id],
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
    }
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
    return items.reduce((sum, item) => sum + item.currentStock * item.lastPurchasePrice, 0);
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
      purchaseUnit: imp.purchaseUnit || imp.unit || 'Pcs',
      conversionRatio: imp.conversionRatio && imp.conversionRatio > 0 ? imp.conversionRatio : 1,
      currentStock: typeof imp.currentStock === 'number' ? imp.currentStock : 0,
      minStock: typeof imp.minStock === 'number' ? imp.minStock : 10,
      warehouseLocation: imp.warehouseLocation || 'Gudang Utama',
      lastPurchasePrice: typeof imp.lastPurchasePrice === 'number' ? imp.lastPurchasePrice : 0,
      primarySupplierId: imp.primarySupplierId || '',
      description: imp.description || '',
      updatedAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      setItems(formatted);
      return formatted.length;
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
      return formatted.length;
    }
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
      return formatted.length;
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
      return formatted.length;
    }
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

      alert('Restore backup database berhasil diselesaikan.');
      return true;
    } catch (err: any) {
      alert('Gagal memulihkan database: ' + (err.message || 'Format data salah.'));
      return false;
    }
  };

  const clearAllDatabase = () => {
    if (confirm('Kosongkan seluruh data database? Semua riwayat barang, supplier, PR, PO, dan GRN akan dihapus.')) {
      setItems([]);
      setSuppliers([]);
      setRequisitions([]);
      setPurchaseOrders([]);
      setGoodsReceipts([]);
      setStockMovements([]);
      localStorage.setItem(STORAGE_KEYS.CLEANED_FLAG, 'true');
      localStorage.removeItem(STORAGE_KEYS.ITEMS);
      localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
      localStorage.removeItem(STORAGE_KEYS.PRS);
      localStorage.removeItem(STORAGE_KEYS.POS);
      localStorage.removeItem(STORAGE_KEYS.GRNS);
      localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
      alert('Database berhasil dikosongkan.');
    }
  };

  const loadSampleData = () => {
    if (confirm('Muat contoh data simulasi ke database?')) {
      setItems(SAMPLE_ITEMS);
      setSuppliers(SAMPLE_SUPPLIERS);
      setRequisitions(SAMPLE_REQUISITIONS);
      setPurchaseOrders(SAMPLE_PURCHASE_ORDERS);
      setGoodsReceipts(SAMPLE_GOODS_RECEIPTS);
      setStockMovements(SAMPLE_STOCK_MOVEMENTS);
      alert('Contoh data berhasil dimuat ke database.');
    }
  };

  const resetToSampleData = () => {
    loadSampleData();
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
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiri-purchasing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PurchasingContext.Provider
      value={{
        activeTab,
        setActiveTab,
        searchGlobal,
        setSearchGlobal,
        items,
        suppliers,
        requisitions,
        purchaseOrders,
        goodsReceipts,
        stockMovements,
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
        getLowStockItems,
        getPendingPRsCount,
        getActivePOsCount,
        getTotalMonthlySpend,
        getInventoryAssetValue,
        importWarehouseItems,
        importSuppliers,
        importFullBackup,
        clearAllDatabase,
        loadSampleData,
        resetToSampleData,
        exportDatabaseJSON,
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
