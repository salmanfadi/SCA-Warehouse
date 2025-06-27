import { renderHook, act } from '@testing-library/react-hooks';
import { useStockOutForm } from '../useStockOutForm';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  executeQuery: jest.fn()
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn()
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn()
}));

describe('useStockOutForm', () => {
  // Mock data
  const mockUserId = 'user-123';
  const mockBarcode = 'TEST123456';
  const mockStockOutRequest = {
    id: 'stockout-1',
    product_id: 'product-1',
    product_name: 'Test Product',
    quantity: 5,
    remaining_quantity: 5,
    status: 'pending',
    requested_by: 'user-1',
    requested_at: '2023-01-01T00:00:00Z'
  };
  
  const mockBatchItem = {
    id: 'batch-item-1',
    batch_id: 'batch-1',
    product_id: 'product-1',
    product_name: 'Test Product',
    barcode: mockBarcode,
    quantity: 10,
    batch_number: 'B12345',
    location_name: 'Shelf A'
  };

  // Mock toast
  const mockToast = jest.fn();
  
  // Mock query client
  const mockInvalidateQueries = jest.fn();
  const mockQueryClient = {
    invalidateQueries: mockInvalidateQueries
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
    
    // Default executeQuery implementation
    (executeQuery as jest.Mock).mockImplementation((_, callback) => {
      return Promise.resolve({ data: null, error: null });
    });
  });

  describe('handleBarcodeScanned', () => {
    it('should update state with batch item when valid barcode is scanned', async () => {
      // Mock successful barcode lookup
      (executeQuery as jest.Mock).mockImplementationOnce((_, callback) => {
        return Promise.resolve({ 
          data: mockBatchItem, 
          error: null 
        });
      });

      const { result, waitForNextUpdate } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, mockStockOutRequest)
      );

      // Initial state should have stockOutRequest set
      expect(result.current.state.stockOutRequest).toEqual(mockStockOutRequest);
      
      // Call handleBarcodeScanned
      act(() => {
        result.current.handleBarcodeScanned(mockBarcode);
      });
      
      // Wait for async operations
      await waitForNextUpdate();
      
      // Check state updates
      expect(result.current.state.currentBatchItem).toEqual(mockBatchItem);
      expect(result.current.state.scannedBarcodes.has(mockBarcode)).toBe(true);
      expect(result.current.state.quantity).toBe(1); // Default quantity
      expect(result.current.state.isProcessing).toBe(false);
    });

    it('should show error toast when barcode is already scanned', async () => {
      // Setup initial state with already scanned barcode
      const { result } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, mockStockOutRequest)
      );
      
      // Add barcode to scanned set
      act(() => {
        result.current.state.scannedBarcodes.add(mockBarcode);
      });
      
      // Call handleBarcodeScanned
      act(() => {
        result.current.handleBarcodeScanned(mockBarcode);
      });
      
      // Check toast was called with error
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Already Scanned',
          variant: 'destructive'
        })
      );
    });

    it('should show error toast when product mismatch occurs', async () => {
      // Mock barcode lookup with different product
      const differentProductBatchItem = {
        ...mockBatchItem,
        product_id: 'product-2',
        product_name: 'Different Product'
      };
      
      (executeQuery as jest.Mock).mockImplementationOnce((_, callback) => {
        return Promise.resolve({ 
          data: differentProductBatchItem, 
          error: null 
        });
      });

      const { result, waitForNextUpdate } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, mockStockOutRequest)
      );
      
      // Call handleBarcodeScanned
      act(() => {
        result.current.handleBarcodeScanned(mockBarcode);
      });
      
      // Wait for async operations
      await waitForNextUpdate();
      
      // Check toast was called with product mismatch error
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Product Mismatch',
          variant: 'destructive'
        })
      );
    });
  });

  describe('processBatchItem', () => {
    it('should process batch item and update state correctly', async () => {
      // Setup initial state with batch item and stock out request
      const { result } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, mockStockOutRequest)
      );
      
      // Set current batch item
      act(() => {
        result.current.state.currentBatchItem = mockBatchItem;
      });
      
      // Call processBatchItem
      act(() => {
        result.current.processBatchItem();
      });
      
      // Check state updates
      expect(result.current.state.deductedBatches.length).toBe(1);
      expect(result.current.state.deductedBatches[0].batch_item_id).toBe(mockBatchItem.id);
      expect(result.current.state.deductedBatches[0].quantity_deducted).toBe(1); // Default quantity
      expect(result.current.state.currentBatchItem).toBeNull(); // Should be cleared
      expect(result.current.state.stockOutRequest?.remaining_quantity).toBe(4); // 5 - 1
    });

    it('should show error when trying to process after request is fulfilled', async () => {
      // Setup initial state with fulfilled request
      const fulfilledRequest = {
        ...mockStockOutRequest,
        remaining_quantity: 0
      };
      
      const { result } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, fulfilledRequest)
      );
      
      // Add a deducted batch to simulate previous processing
      act(() => {
        result.current.state.deductedBatches = [{
          batch_item_id: 'batch-item-0',
          barcode: 'PREV123',
          batch_number: 'B0000',
          product_id: 'product-1',
          product_name: 'Test Product',
          quantity_deducted: 5,
          timestamp: new Date().toISOString()
        }];
        result.current.state.currentBatchItem = mockBatchItem;
      });
      
      // Call processBatchItem
      act(() => {
        result.current.processBatchItem();
      });
      
      // Check toast was called with maximum quantity error
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Maximum Quantity Reached',
          variant: 'destructive'
        })
      );
    });
  });

  describe('completeStockOut', () => {
    it('should update batch items and stock out request status', async () => {
      // Mock successful batch item update
      (executeQuery as jest.Mock).mockImplementation((key, callback) => {
        if (key === 'batch_items') {
          return Promise.resolve({ data: null, error: null });
        }
        if (key === 'stock_out') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Setup initial state with deducted batches
      const { result } = renderHook(() => 
        useStockOutForm(mockUserId, undefined, mockStockOutRequest)
      );
      
      // Add deducted batches
      act(() => {
        result.current.state.deductedBatches = [{
          batch_item_id: mockBatchItem.id,
          barcode: mockBarcode,
          batch_number: 'B12345',
          product_id: 'product-1',
          product_name: 'Test Product',
          quantity_deducted: 5,
          timestamp: new Date().toISOString()
        }];
      });
      
      // Call completeStockOut
      act(() => {
        result.current.completeStockOut();
      });
      
      // Check query client was called to invalidate queries
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['stock-out-requests']
        })
      );
      
      // Check success toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success'
        })
      );
    });
  });
});
