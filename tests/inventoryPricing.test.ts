import assert from 'node:assert/strict';
import {
  calculateWeightedAverageCost,
  getAverageUnitCost,
  getInventoryValue,
  getPurchaseUnitPrice,
  pricingFromPurchaseUnit,
} from '../src/utils/inventoryPricing.ts';
import { parseWarehouseItemsCSV } from '../src/utils/exportImport.ts';

const packPricing = pricingFromPurchaseUnit(22_000, 100);
assert.equal(packPricing.averageUnitCost, 220);
assert.equal(getInventoryValue({ ...packPricing, conversionRatio: 100, currentStock: 100 }), 22_000);

const kilogramPricing = pricingFromPurchaseUnit(59_000, 1_000);
assert.equal(kilogramPricing.averageUnitCost, 59);
assert.equal(getInventoryValue({ ...kilogramPricing, conversionRatio: 1_000, currentStock: 1_000 }), 59_000);

assert.equal(calculateWeightedAverageCost(100, 220, 200, 250), 240);

const legacyItem = { lastPurchasePrice: 220, conversionRatio: 100 };
assert.equal(getAverageUnitCost(legacyItem), 220);
assert.equal(getPurchaseUnitPrice(legacyItem), 22_000);

const imported = parseWarehouseItemsCSV([
  'SKU,Nama Barang,Satuan Dasar,Satuan Beli,Rasio Konversi,Stok Awal,Harga rata-rata,HARGA PERUNIT',
  'ACEH-001,Amplop,Pcs,Pack,100,100,22.000,220',
].join('\n')).items[0];

assert.equal(imported.lastPurchasePrice, 22_000);
assert.equal(imported.priceBasis, 'purchase_unit');
assert.equal(imported.averageUnitCost, 220);

console.log('inventory pricing tests passed');
