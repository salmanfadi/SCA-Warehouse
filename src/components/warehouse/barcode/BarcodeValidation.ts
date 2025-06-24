import { toast } from '@/components/ui/use-toast';

export interface BatchItem {
  id: string;
  batch_id?: string;
  product_id: string;
  product_sku?: string;
  product_name?: string;
  warehouse_id?: string | null;
  location_id?: string | null;
  barcode_id?: string;
  barcode: string | null;
  color?: string | null;
  size?: string | null;
  quantity: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  
  // These are derived properties that might not be in the database table directly
  batch_number?: string | null;
  warehouse_name?: string | null;
  location_name?: string | null;
  
  // Additional properties for barcode scanning
  product_description?: string;
  product_category?: string[];
}

export interface StockOutRequest {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  remaining_quantity: number;
  status: string;
  requested_by: string;
  requested_at: string;
  processed_by?: string;
  processed_at?: string;
}

export interface DeductedBatch {
  id?: string;
  batch_item_id?: string;
  barcode: string;
  batch_number: string;
  product_id?: string;
  product_name: string;
  location_id?: string;
  location_name?: string;
  quantity_deducted: number;
  timestamp: string;
}

/**
 * Validates if the scanned barcode is valid for the current stock out request
 * @param batchItem The batch item retrieved from the barcode
 * @param stockOutRequest The current stock out request
 * @param scannedBarcodes Set of already scanned barcodes
 * @returns An object with validation result and error message if any
 */
export const validateBarcodeForStockOut = (
  batchItem: BatchItem | null,
  stockOutRequest: StockOutRequest | null,
  scannedBarcodes: Set<string>
): { isValid: boolean; errorMessage?: string } => {
  if (!batchItem) {
    return { isValid: false, errorMessage: 'Invalid barcode or batch not found' };
  }

  if (!stockOutRequest) {
    return { isValid: false, errorMessage: 'No active stock out request' };
  }

  // Check if barcode has already been scanned
  if (batchItem.barcode && scannedBarcodes.has(batchItem.barcode)) {
    return { isValid: false, errorMessage: 'This box has already been scanned' };
  }

  // Check if product matches the stock out request
  // If batch item has no product_id, we'll allow it to proceed
  // This handles cases where batch items might not have product_id assigned yet
  if (batchItem.product_id && stockOutRequest.product_id && batchItem.product_id !== stockOutRequest.product_id) {
    return { 
      isValid: false, 
      errorMessage: `Product mismatch: Expected ${stockOutRequest.product_name} but found ${batchItem.product_name}` 
    };
  }

  // Check if batch has any quantity available
  if (batchItem.quantity <= 0) {
    return { isValid: false, errorMessage: 'This box has no quantity available' };
  }

  // Check if stock out request has remaining quantity
  if (stockOutRequest.remaining_quantity <= 0) {
    return { isValid: false, errorMessage: 'Stock out request has been fully fulfilled' };
  }

  return { isValid: true };
};

/**
 * Calculates the maximum deductible quantity based on batch quantity, remaining request quantity, and user input
 * @param batchItem The batch item
 * @param stockOutRequest The stock out request
 * @param userInputQuantity User input quantity
 * @returns The maximum deductible quantity
 */
export const calculateMaxDeductibleQuantity = (
  batchItem: BatchItem,
  stockOutRequest: StockOutRequest,
  userInputQuantity: number
): number => {
  return Math.min(
    batchItem.quantity,
    stockOutRequest.remaining_quantity,
    userInputQuantity
  );
};

/**
 * Creates a deducted batch object from a batch item and quantity
 * @param batchItem The batch item
 * @param quantityDeducted The quantity deducted
 * @returns A deducted batch object
 */
export const createDeductedBatch = (
  batchItem: BatchItem,
  quantityDeducted: number
): DeductedBatch => {
  return {
    batch_item_id: batchItem.id,
    barcode: batchItem.barcode || '',
    batch_number: batchItem.batch_number || '',
    product_id: batchItem.product_id || '',
    product_name: batchItem.product_name,
    location_id: batchItem.location_id || '',
    location_name: batchItem.location_name || '',
    quantity_deducted: quantityDeducted,
    timestamp: new Date().toISOString()
  };
};
