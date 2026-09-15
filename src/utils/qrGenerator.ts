import QRCode from 'qrcode';
import { WarehouseItem } from '../types';

export interface RackQRCodeData {
  app: 'kiri_purchasing';
  type: 'rack_item';
  id: string;
  sku: string;
  name: string;
  location: string;
}

/**
 * Generate a standard scannable payload for a warehouse rack item
 */
export function generateRackQRPayload(item: WarehouseItem): string {
  // We can serialize as JSON or direct SKU prefix so any scanner recognizes it
  return JSON.stringify({
    app: 'kiri_purchasing',
    type: 'rack_item',
    id: item.id,
    sku: item.sku,
    name: item.name,
    location: item.warehouseLocation || 'Gudang Utama',
  });
}

/**
 * Parses scanned QR text. Supports JSON format, URL format, or plain SKU string.
 */
export function parseScannedQR(text: string, items: WarehouseItem[]): WarehouseItem | null {
  if (!text || !Array.isArray(items)) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Try parsing JSON payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if (parsed.id) {
        const found = items.find((i) => i && i.id === parsed.id);
        if (found) return found;
      }
      if (parsed.sku) {
        const targetSku = String(parsed.sku).toLowerCase().trim();
        const found = items.find(
          (i) => i && i.sku && i.sku.toLowerCase().trim() === targetSku
        );
        if (found) return found;
      }
    }
  } catch {
    // Not a JSON string, continue to fallback matchers
  }

  const target = trimmed.toLowerCase();

  // 2. Try direct SKU match (case-insensitive)
  const directSkuMatch = items.find(
    (i) => i && i.sku && i.sku.toLowerCase().trim() === target
  );
  if (directSkuMatch) return directSkuMatch;

  // 3. Try match if text contains SKU (e.g. SKU-1001 or URL like ?sku=SKU-1001)
  const skuRegexMatch = items.find(
    (i) => i && i.sku && target.includes(i.sku.toLowerCase().trim())
  );
  if (skuRegexMatch) return skuRegexMatch;

  // 4. Try match by Item ID
  const idMatch = items.find((i) => i && i.id === trimmed);
  if (idMatch) return idMatch;

  // 5. Try match by Item Name
  const nameMatch = items.find(
    (i) => i && i.name && i.name.toLowerCase().trim() === target
  );
  if (nameMatch) return nameMatch;

  // 6. Partial Name Match
  const partialName = items.find(
    (i) => i && i.name && (target.includes(i.name.toLowerCase().trim()) || i.name.toLowerCase().trim().includes(target))
  );
  if (partialName) return partialName;

  return null;
}

/**
 * Generates high-res QR Code Data URL (Base64 PNG) for a warehouse item
 */
export async function generateItemQRDataUrl(
  item: WarehouseItem,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const payload = generateRackQRPayload(item);
  return generateQRCodeDataUrl(payload, options);
}

/**
 * Generates high-res QR Code Data URL (Base64 PNG)
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options?.width || 256,
      margin: options?.margin ?? 1,
      color: {
        dark: options?.darkColor || '#0f172a',
        light: options?.lightColor || '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
