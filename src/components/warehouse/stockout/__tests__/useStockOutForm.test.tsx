import { renderHook, act } from '@testing-library/react-hooks';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockOutForm } from '../useStockOutForm';
import { mockBatchItem, mockStockOutRequest, mockDeductedBatch, mockExecuteQuery, mockToast } from './mocks';

// Mock the modules
jest.mock('@/lib/supabase', () => ({
  executeQuery: mockExecuteQuery
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Wrapper component for the hook with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

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
    mockToast.mockReturnValue({ toast: mockToast });
    
    // Default executeQuery implementation
    mockExecuteQuery.mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: mockStockOutRequest, error: null });
      }
      if (key === 'barcode_batch_view') {
        return Promise.resolve({ data: mockBatchItem, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  describe('handleBarcodeScanned', () => {
    it('should update state with batch item when valid barcode is scanned', async () => {
      // Mock successful barcode lookup
      mockExecuteQuery.mockImplementationOnce((key, callback) => {
        if (key === 'barcode_batch_view') {
          return Promise.resolve({ 
            data: mockBatchItem, 
            error: null 
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
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
      const { result } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
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
      
      mockExecuteQuery.mockImplementationOnce((key, callback) => {
        if (key === 'barcode_batch_view') {
          return Promise.resolve({ 
            data: differentProductBatchItem, 
            error: null 
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const { result, waitForNextUpdate } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
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
      const { result } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
      );
      
      // Set current batch item
      act(() => {
        result.current.state.currentBatchItem = mockBatchItem;
        result.current.state.quantity = 2; // Set quantity to deduct
      });
      
      // Call processBatchItem
      act(() => {
        result.current.processBatchItem();
      });
      
      // Check state updates
      expect(result.current.state.deductedBatches.length).toBe(1);
      expect(result.current.state.deductedBatches[0].batch_item_id).toBe(mockBatchItem.id);
      expect(result.current.state.deductedBatches[0].quantity_deducted).toBe(2); // Should use the set quantity
      expect(result.current.state.currentBatchItem).toBeNull(); // Should be cleared
      expect(result.current.state.stockOutRequest?.remaining_quantity).toBe(3); // 5 - 2
    });

    it('should limit deduction to remaining quantity in stock out request', async () => {
      // Create a stock out request with only 1 remaining
      const limitedStockOutRequest = {
        ...mockStockOutRequest,
        remaining_quantity: 1
      };
      
      const { result } = renderHook(
        () => useStockOutForm(mockUserId, undefined, limitedStockOutRequest),
        { wrapper: createWrapper() }
      );
      
      // Set current batch item with quantity 2
      act(() => {
        result.current.state.currentBatchItem = mockBatchItem;
        result.current.state.quantity = 2; // Try to deduct 2
      });
      
      // Call processBatchItem
      act(() => {
        result.current.processBatchItem();
      });
      
      // Check that only 1 was deducted (limited by remaining_quantity)
      expect(result.current.state.deductedBatches[0].quantity_deducted).toBe(1);
      expect(result.current.state.stockOutRequest?.remaining_quantity).toBe(0);
    });

    it('should show error when trying to process after request is fulfilled', async () => {
      // Setup initial state with fulfilled request
      const fulfilledRequest = {
        ...mockStockOutRequest,
        remaining_quantity: 0
      };
      
      const { result } = renderHook(
        () => useStockOutForm(mockUserId, undefined, fulfilledRequest),
        { wrapper: createWrapper() }
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
      mockExecuteQuery.mockImplementation((key, callback) => {
        if (key === 'batch_items') {
          return Promise.resolve({ data: null, error: null });
        }
        if (key === 'stock_out') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Setup initial state with deducted batches
      const { result, waitForNextUpdate } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
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
        
        // Set remaining quantity to 0 to allow completion
        if (result.current.state.stockOutRequest) {
          result.current.state.stockOutRequest.remaining_quantity = 0;
        }
      });
      
      // Call completeStockOut
      act(() => {
        result.current.completeStockOut();
      });
      
      // Wait for async operations
      await waitForNextUpdate();
      
      // Check success toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success'
        })
      );
      
      // Check that isSuccess flag is set
      expect(result.current.state.isSuccess).toBe(true);
    });

    it('should handle errors during stock out completion', async () => {
      // Mock error during batch item update
      mockExecuteQuery.mockImplementation((key, callback) => {
        if (key === 'batch_items') {
          return Promise.resolve({ data: null, error: { message: 'Database error' } });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Setup initial state with deducted batches
      const { result, waitForNextUpdate } = renderHook(
        () => useStockOutForm(mockUserId, undefined, mockStockOutRequest),
        { wrapper: createWrapper() }
      );
      
      // Add deducted batches and set remaining quantity to 0
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
        
        if (result.current.state.stockOutRequest) {
          result.current.state.stockOutRequest.remaining_quantity = 0;
        }
      });
      
      // Call completeStockOut
      act(() => {
        result.current.completeStockOut();
      });
      
      // Wait for async operations
      await waitForNextUpdate();
      
      // Check error toast was shown
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive'
        })
      );
      
      // Check that isSuccess flag is not set
      expect(result.current.state.isSuccess).toBe(false);
    });
  });
});
