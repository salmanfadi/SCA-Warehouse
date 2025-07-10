import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique barcode string for inventory items
 * 
 * @param prefix - Optional prefix to add to the barcode
 * @param productId - Optional product ID to include in the barcode
 * @returns A unique barcode string
 */
export const generateBarcodeString = async (prefix: string = 'INV', productId?: string, boxNumber?: number): Promise<string> => {
  // Extract first 6 chars of product ID if available
  const productPrefix = productId ? productId.substring(0, 6) : '';
  
  // Generate a timestamp component for uniqueness
  const timestamp = Date.now().toString().substring(6);
  
  // Generate a short random component (last 6 chars of a UUID)
  const random = uuidv4().substring(0, 6);
  
  // Include box number if provided
  const boxSuffix = boxNumber ? `-${boxNumber.toString().padStart(3, '0')}` : '';
  
  // Construct the barcode with format PREFIX-PRODUCTID-TIMESTAMP-RANDOM
  return `${prefix}-${productPrefix}-${timestamp}-${random}${boxSuffix}`.toUpperCase();
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
