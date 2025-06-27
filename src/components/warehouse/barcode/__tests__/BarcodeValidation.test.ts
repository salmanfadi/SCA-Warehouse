import { 
  validateBarcodeForStockOut, 
  calculateMaxDeductibleQuantity, 
  createDeductedBatch,
  BatchItem,
  StockOutRequest,
  DeductedBatch
} from '../BarcodeValidation';

describe('BarcodeValidation', () => {
  // Mock data
  const mockBatchItem: BatchItem = {
    id: 'batch-item-1',
    batch_id: 'batch-1',
    product_id: 'product-1',
    product_name: 'Test Product',
    barcode: 'TEST123456',
    quantity: 10,
    batch_number: 'B12345',
    location_name: 'Shelf A'
  };

  const mockStockOutRequest: StockOutRequest = {
    id: 'stockout-1',
    product_id: 'product-1',
    product_name: 'Test Product',
    quantity: 5,
    remaining_quantity: 5,
    status: 'pending',
    requested_by: 'user-1',
    requested_at: '2023-01-01T00:00:00Z'
  };

  describe('validateBarcodeForStockOut', () => {
    it('should return valid for a valid batch item and stock out request', () => {
      const result = validateBarcodeForStockOut(mockBatchItem, mockStockOutRequest, new Set());
      expect(result.isValid).toBe(true);
    });

    it('should return invalid if batch item is null', () => {
      const result = validateBarcodeForStockOut(null, mockStockOutRequest, new Set());
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid barcode');
    });

    it('should return invalid if stock out request is null', () => {
      const result = validateBarcodeForStockOut(mockBatchItem, null, new Set());
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No active stock out request');
    });

    it('should return invalid if barcode has already been scanned', () => {
      const scannedBarcodes = new Set(['TEST123456']);
      const result = validateBarcodeForStockOut(mockBatchItem, mockStockOutRequest, scannedBarcodes);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already been scanned');
    });

    it('should return invalid if product IDs do not match', () => {
      const differentProductBatchItem = { ...mockBatchItem, product_id: 'product-2', product_name: 'Different Product' };
      const result = validateBarcodeForStockOut(differentProductBatchItem, mockStockOutRequest, new Set());
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Product mismatch');
    });

    it('should return invalid if batch has no quantity available', () => {
      const emptyBatchItem = { ...mockBatchItem, quantity: 0 };
      const result = validateBarcodeForStockOut(emptyBatchItem, mockStockOutRequest, new Set());
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('no quantity available');
    });

    it('should return invalid if stock out request has been fully fulfilled', () => {
      const fulfilledRequest = { ...mockStockOutRequest, remaining_quantity: 0 };
      const result = validateBarcodeForStockOut(mockBatchItem, fulfilledRequest, new Set());
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('fully fulfilled');
    });
  });

  describe('calculateMaxDeductibleQuantity', () => {
    it('should return the minimum of batch quantity, remaining request quantity, and user input', () => {
      // Batch: 10, Request: 5, User: 3 => Should return 3
      expect(calculateMaxDeductibleQuantity(mockBatchItem, mockStockOutRequest, 3)).toBe(3);
      
      // Batch: 10, Request: 5, User: 8 => Should return 5 (limited by request)
      expect(calculateMaxDeductibleQuantity(mockBatchItem, mockStockOutRequest, 8)).toBe(5);
      
      // Batch: 3, Request: 5, User: 8 => Should return 3 (limited by batch)
      const smallBatchItem = { ...mockBatchItem, quantity: 3 };
      expect(calculateMaxDeductibleQuantity(smallBatchItem, mockStockOutRequest, 8)).toBe(3);
    });
  });

  describe('createDeductedBatch', () => {
    it('should create a valid deducted batch object from a batch item', () => {
      const quantityDeducted = 3;
      const result = createDeductedBatch(mockBatchItem, quantityDeducted);
      
      expect(result).toEqual({
        batch_item_id: mockBatchItem.id,
        barcode: mockBatchItem.barcode,
        batch_number: mockBatchItem.batch_number,
        product_id: mockBatchItem.product_id,
        product_name: mockBatchItem.product_name,
        location_id: mockBatchItem.location_id || '',
        location_name: mockBatchItem.location_name || '',
        quantity_deducted: quantityDeducted,
        timestamp: expect.any(String)
      });
    });

    it('should handle missing optional properties', () => {
      const minimalBatchItem: BatchItem = {
        id: 'batch-item-2',
        batch_id: 'batch-2',
        product_id: 'product-2',
        product_name: 'Minimal Product',
        barcode: 'MIN123',
        quantity: 5,
        batch_number: ''
      };
      
      const result = createDeductedBatch(minimalBatchItem, 2);
      
      expect(result.batch_number).toBe('');
      expect(result.location_id).toBe('');
      expect(result.location_name).toBe('');
    });
  });
});
