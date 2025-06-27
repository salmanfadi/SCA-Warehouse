/**
 * Tests for the stockout barcode scanning and quantity handling fixes
 * 
 * This file tests:
 * 1. Scanning the same barcode multiple times
 * 2. Deleting processed items and correctly restoring quantities
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useStockOut } from '../hooks/useStockOut';
import { validateBarcodeForStockOut } from '../services/stockout/stockoutService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../services/stockout/stockoutService', () => ({
  validateBarcodeForStockOut: vi.fn(),
  calculateMaxDeductibleQuantity: vi.fn(),
  calculateStockOutProgress: vi.fn().mockResolvedValue(50),
  calculateInitialProgress: vi.fn().mockReturnValue(50),
  completeStockOut: vi.fn()
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  })
}));

describe('StockOut Barcode Scanning and Quantity Fixes', () => {
  const mockUserId = 'test-user-id';
  const mockStockOutRequest = {
    id: 'test-stock-out-id',
    product_id: 'test-product-id',
    product_name: 'Test Product',
    quantity: 10,
    remaining_quantity: 10,
    status: 'pending',
    requested_by: 'Test User',
    requested_at: '2025-06-28T00:00:00Z'
  };

  const mockBatchItem = {
    id: 'test-batch-item-id',
    barcode: 'test-barcode-123',
    product_id: 'test-product-id',
    product_name: 'Test Product',
    batch_number: 'BATCH-001',
    quantity: 5,
    warehouse_id: 'test-warehouse-id',
    warehouse_name: 'Test Warehouse',
    location_id: 'test-location-id',
    location_name: 'Test Location',
    floor: '1',
    zone: 'A'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup mock implementation for validateBarcodeForStockOut
    (validateBarcodeForStockOut as any).mockResolvedValue({
      isValid: true,
      batchItem: mockBatchItem
    });
  });

  it('should allow scanning the same barcode multiple times', async () => {
    const { result } = renderHook(() => useStockOut({
      userId: mockUserId,
      initialStockOutRequest: mockStockOutRequest
    }));

    // First scan
    await act(async () => {
      await result.current.handleBarcodeScanned('test-barcode-123');
    });

    expect(result.current.state.currentBatchItem).toEqual(mockBatchItem);

    // Process the item
    await act(async () => {
      await result.current.processBatchItem();
    });

    expect(result.current.state.processedItems.length).toBe(1);
    
    // Second scan of the same barcode
    await act(async () => {
      await result.current.handleBarcodeScanned('test-barcode-123');
    });

    // Should still work and set the current batch item
    expect(result.current.state.currentBatchItem).toEqual(mockBatchItem);
    
    // Process the item again
    await act(async () => {
      await result.current.processBatchItem();
    });

    // Should now have two processed items
    expect(result.current.state.processedItems.length).toBe(2);
  });

  it('should correctly restore quantities when deleting a processed item', async () => {
    const { result } = renderHook(() => useStockOut({
      userId: mockUserId,
      initialStockOutRequest: mockStockOutRequest
    }));

    // Scan and process an item
    await act(async () => {
      await result.current.handleBarcodeScanned('test-barcode-123');
    });

    await act(async () => {
      await result.current.processBatchItem();
    });

    // Get the processed item ID
    const processedItemId = result.current.state.processedItems[0].id;
    
    // Initial remaining quantity should be reduced
    expect(result.current.state.stockOutRequest?.remaining_quantity).toBeLessThan(10);
    
    // Delete the processed item
    await act(async () => {
      result.current.deleteProcessedItem(processedItemId);
    });

    // Should have no processed items
    expect(result.current.state.processedItems.length).toBe(0);
    
    // Remaining quantity should be restored to the original value
    expect(result.current.state.stockOutRequest?.remaining_quantity).toBe(10);
  });
});
