import { v4 as uuidv4 } from 'uuid';

// Counter to ensure unique barcodes within the same millisecond
let barcodeCounter = 0;
const COUNTER_MAX = 9999; // 4-digit counter

/**
 * Generates a unique barcode string for inventory items
 * 
 * @param prefix - Optional prefix to add to the barcode (default: 'INV')
 * @param productId - Optional product ID to include in the barcode
 * @param boxNumber - Optional box number to include in the barcode
 * @returns A unique barcode string
 */
export const generateBarcodeString = async (prefix: string = 'INV', productId?: string, boxNumber?: number): Promise<string> => {
  // Extract first 6 chars of product ID if available, or use a default
  const productPrefix = productId ? productId.substring(0, 6).toUpperCase() : 'GEN';
  
  // Generate a timestamp component (last 8 digits of current time)
  const timestamp = Date.now().toString().slice(-8);
  
  // Increment and reset counter if needed
  barcodeCounter = (barcodeCounter + 1) % COUNTER_MAX;
  
  // Generate a short random component (first 6 chars of a UUID)
  const random = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  
  // Include box number if provided, otherwise use the counter
  const sequenceNumber = boxNumber !== undefined 
    ? boxNumber.toString().padStart(3, '0')
    : barcodeCounter.toString().padStart(4, '0');
  
  // Construct the barcode with format: PREFIX-PRODUCT-TIMESTAMP-SEQ-RANDOM
  return `${prefix}-${productPrefix}-${timestamp}-${sequenceNumber}-${random}`.toUpperCase();
};

/**
 * Format a barcode for display - adds hyphens for readability if they don't exist
 * 
 * @param barcode - The barcode to format
 * @returns Formatted barcode string
 */
export const formatBarcodeForDisplay = (barcode: string): string => {
  // If the barcode already has hyphens, return as is
  if (barcode.includes('-')) {
    return barcode;
  }
  
  // Otherwise, add hyphens every 4 characters for readability
  return barcode.match(/.{1,4}/g)?.join('-') || barcode;
};
