import type { WarehouseItem } from '../types/index.ts';

export type WarehousePricing = Pick<
  WarehouseItem,
  'lastPurchasePrice' | 'priceBasis' | 'averageUnitCost' | 'conversionRatio'
>;

const validNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const getConversionRatio = (item: Pick<WarehouseItem, 'conversionRatio'>): number =>
  validNumber(item.conversionRatio) && item.conversionRatio > 0 ? item.conversionRatio : 1;

/** Price paid for one purchase unit (box, pack, kg, etc.). */
export const getPurchaseUnitPrice = (item: WarehousePricing): number => {
  const price = validNumber(item.lastPurchasePrice) ? item.lastPurchasePrice : 0;
  return item.priceBasis === 'purchase_unit' ? price : price * getConversionRatio(item);
};

/** Inventory cost for one base stock unit (pcs, gram, ml, etc.). */
export const getAverageUnitCost = (item: WarehousePricing): number => {
  if (validNumber(item.averageUnitCost)) return item.averageUnitCost;
  const price = validNumber(item.lastPurchasePrice) ? item.lastPurchasePrice : 0;
  return item.priceBasis === 'purchase_unit' ? price / getConversionRatio(item) : price;
};

export const getInventoryValue = (
  item: WarehousePricing & Pick<WarehouseItem, 'currentStock'>
): number => Math.max(0, item.currentStock || 0) * getAverageUnitCost(item);

export const pricingFromPurchaseUnit = (
  purchaseUnitPrice: number,
  conversionRatio: number
): Pick<WarehouseItem, 'lastPurchasePrice' | 'priceBasis' | 'averageUnitCost'> => {
  const price = validNumber(purchaseUnitPrice) ? purchaseUnitPrice : 0;
  const ratio = validNumber(conversionRatio) && conversionRatio > 0 ? conversionRatio : 1;
  return {
    lastPurchasePrice: price,
    priceBasis: 'purchase_unit',
    averageUnitCost: price / ratio,
  };
};

export const calculateWeightedAverageCost = (
  currentStock: number,
  currentAverageUnitCost: number,
  receivedBaseQuantity: number,
  receivedBaseUnitCost: number
): number => {
  const oldQty = Math.max(0, currentStock || 0);
  const incomingQty = Math.max(0, receivedBaseQuantity || 0);
  const totalQty = oldQty + incomingQty;
  if (totalQty === 0) return 0;
  return (
    oldQty * Math.max(0, currentAverageUnitCost || 0) +
    incomingQty * Math.max(0, receivedBaseUnitCost || 0)
  ) / totalQty;
};
