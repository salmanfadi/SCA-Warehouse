import { BatchItem, StockOutRequest } from '@/components/warehouse/barcode/BarcodeValidation';

/**
 * Validates if a barcode can be used for a stock out request
 * @param batchItem The batch item data
 * @param stockOutRequest The stock out request
 * @param scannedBarcodes Set of already scanned barcodes
 * @returns Validation result with error message if invalid
 */
export function validateBarcodeForStockOut(
  batchItem: BatchItem | null,
  stockOutRequest: StockOutRequest | null,
  scannedBarcodes: Set<string>
): { isValid: boolean; errorMessage?: string } {
  // Check if batch item exists
  if (!batchItem) {
    return {
      isValid: false,
      errorMessage: 'Barcode not found in inventory. Please check and try again.'
    };
  }

  // Check if barcode is already scanned
  if (scannedBarcodes.has(batchItem.barcode || '')) {
    return {
      isValid: false,
      errorMessage: 'This barcode has already been scanned'
    };
  }

  // Check if batch item has all required fields
  if (!batchItem.id || !batchItem.product_id) {
    return {
      isValid: false,
      errorMessage: 'Incomplete batch item data'
    };
  }

  // If we have a stock out request, validate the product matches
  if (stockOutRequest && batchItem.product_id !== stockOutRequest.product_id) {
    return {
      isValid: false,
      errorMessage: `This barcode is for a different product (${batchItem.product_name || 'Unknown'}). Please scan a barcode for ${stockOutRequest.product_name || 'the requested product'}.`
    };
  }

  // Check if quantity is valid
  if (!batchItem.quantity || batchItem.quantity <= 0) {
    return {
      isValid: false,
      errorMessage: 'This item has no available quantity'
    };
  }

  // If we have a stock out request, check if we still need more items
  if (stockOutRequest && stockOutRequest.remaining_quantity <= 0) {
    return {
      isValid: false,
      errorMessage: 'All requested items have been scanned. No more items needed.'
    };
  }

  return { isValid: true };
}

/**
 * Calculates the maximum deductible quantity
 * @param batchItem The batch item
 * @param stockOutRequest The stock out request
 * @param userInputQuantity User input quantity (optional)
 * @returns The maximum quantity that can be deducted
 */
export function calculateMaxDeductibleQuantity(
  batchItem: BatchItem,
  stockOutRequest: StockOutRequest,
  userInputQuantity?: number
): number {
  // Start with the batch item quantity
  let maxQuantity = batchItem.quantity;
  
  // If we have a stock out request, limit by remaining quantity
  if (stockOutRequest && stockOutRequest.remaining_quantity < maxQuantity) {
    maxQuantity = stockOutRequest.remaining_quantity;
  }
  
  // If user specified a quantity, use that as the limit
  if (userInputQuantity !== undefined && userInputQuantity < maxQuantity) {
    maxQuantity = userInputQuantity;
  }
  
  return Math.max(1, maxQuantity);
}
