import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import BarcodeStockOutForm from '../BarcodeStockOutForm';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  executeQuery: jest.fn()
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn()
}));

// Mock BarcodeScanner component
jest.mock('../../barcode/BarcodeScanner', () => {
  return function MockBarcodeScanner({ 
    onBarcodeScanned, 
    onBatchItemFound, 
    isEnabled, 
    stockOutRequest 
  }: any) {
    // Simulate barcode scanning
    const scanBarcode = () => {
      const mockBatchItem = {
        id: 'batch-item-1',
        batch_id: 'batch-1',
        product_id: stockOutRequest?.product_id || 'product-1',
        product_name: stockOutRequest?.product_name || 'Test Product',
        barcode: 'TEST123456',
        quantity: 10,
        batch_number: 'B12345',
        location_name: 'Shelf A'
      };
      
      if (isEnabled && onBatchItemFound) {
        onBatchItemFound(mockBatchItem);
      }
    };
    
    return (
      <div data-testid="barcode-scanner">
        <button 
          data-testid="scan-button" 
          onClick={scanBarcode}
          disabled={!isEnabled}
        >
          Scan Barcode
        </button>
        <div data-testid="scanner-status">
          {isEnabled ? 'Scanner Enabled' : 'Scanner Disabled'}
        </div>
        {stockOutRequest && (
          <div data-testid="stock-out-product">
            Product: {stockOutRequest.product_name}
          </div>
        )}
      </div>
    );
  };
});

describe('BarcodeStockOutFlow', () => {
  // Mock data
  const mockUserId = 'user-123';
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
    barcode: 'TEST123456',
    quantity: 10,
    batch_number: 'B12345',
    location_name: 'Shelf A'
  };

  // Mock toast
  const mockToast = jest.fn();
  
  // Setup query client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    
    // Default executeQuery implementation for stock out request
    (executeQuery as jest.Mock).mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: mockStockOutRequest, error: null });
      }
      if (key === 'barcode_batch_view') {
        return Promise.resolve({ data: mockBatchItem, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('should render the stock out form with progress indicators', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BarcodeStockOutForm 
          userId={mockUserId}
          stockOutRequest={mockStockOutRequest}
          onComplete={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stock Out Request')).toBeInTheDocument();
      expect(screen.getByText(`Product: ${mockStockOutRequest.product_name}`)).toBeInTheDocument();
      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });
    
    // Check that the barcode scanner is enabled
    expect(screen.getByTestId('scanner-status')).toHaveTextContent('Scanner Enabled');
  });

  it('should process a batch item when scanned and update progress', async () => {
    // Mock successful batch item processing
    (executeQuery as jest.Mock).mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: mockStockOutRequest, error: null });
      }
      if (key === 'barcode_batch_view') {
        return Promise.resolve({ data: mockBatchItem, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BarcodeStockOutForm 
          userId={mockUserId}
          stockOutRequest={mockStockOutRequest}
          onComplete={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stock Out Request')).toBeInTheDocument();
    });
    
    // Simulate scanning a barcode
    fireEvent.click(screen.getByTestId('scan-button'));
    
    // Wait for the batch item to be processed
    await waitFor(() => {
      expect(screen.getByText('Process Batch Item')).toBeInTheDocument();
    });
    
    // Click the process button
    fireEvent.click(screen.getByText('Process Batch Item'));
    
    // Wait for processing to complete and progress to update
    await waitFor(() => {
      // After processing 1 item out of 5, progress should be 20%
      expect(screen.getByText('Progress: 20%')).toBeInTheDocument();
    });
    
    // Check that the processed batches table appears
    await waitFor(() => {
      expect(screen.getByText('Processed Batches')).toBeInTheDocument();
      expect(screen.getByText('B12345')).toBeInTheDocument(); // Batch number
    });
  });

  it('should show complete button when all items are processed', async () => {
    // Mock stock out request with no remaining quantity
    const completedStockOutRequest = {
      ...mockStockOutRequest,
      remaining_quantity: 0
    };
    
    (executeQuery as jest.Mock).mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: completedStockOutRequest, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BarcodeStockOutForm 
          userId={mockUserId}
          stockOutRequest={completedStockOutRequest}
          onComplete={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stock Out Request')).toBeInTheDocument();
      expect(screen.getByText('Progress: 100%')).toBeInTheDocument();
    });
    
    // Check that the complete button is shown
    expect(screen.getByText('Complete Stock Out')).toBeInTheDocument();
    
    // Check that the alert message is shown
    expect(screen.getByText('All items have been processed. Please complete the stock out.')).toBeInTheDocument();
    
    // Check that the scanner is disabled
    expect(screen.getByTestId('scanner-status')).toHaveTextContent('Scanner Disabled');
  });

  it('should show success message after completing stock out', async () => {
    // Mock stock out request with no remaining quantity
    const completedStockOutRequest = {
      ...mockStockOutRequest,
      remaining_quantity: 0
    };
    
    // Mock successful completion
    (executeQuery as jest.Mock).mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: completedStockOutRequest, error: null });
      }
      if (key === 'batch_items') {
        return Promise.resolve({ data: null, error: null });
      }
      if (key === 'stock_out') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BarcodeStockOutForm 
          userId={mockUserId}
          stockOutRequest={completedStockOutRequest}
          onComplete={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stock Out Request')).toBeInTheDocument();
    });
    
    // Click the complete button
    fireEvent.click(screen.getByText('Complete Stock Out'));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Stock out request has been successfully processed.')).toBeInTheDocument();
      expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
    });
  });

  it('should handle errors during barcode scanning', async () => {
    // Mock error during barcode lookup
    (executeQuery as jest.Mock).mockImplementation((key, callback) => {
      if (key === 'stock-out-request') {
        return Promise.resolve({ data: mockStockOutRequest, error: null });
      }
      if (key === 'barcode_batch_view') {
        return Promise.resolve({ data: null, error: { message: 'Barcode not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BarcodeStockOutForm 
          userId={mockUserId}
          stockOutRequest={mockStockOutRequest}
          onComplete={() => {}}
        />
      </QueryClientProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Stock Out Request')).toBeInTheDocument();
    });
    
    // Simulate scanning a barcode
    fireEvent.click(screen.getByTestId('scan-button'));
    
    // Check that error toast was shown
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Not Found'),
          variant: 'destructive'
        })
      );
    });
  });
});
