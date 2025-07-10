/**
 * Mock implementations for testing
 */

// Mock for Supabase executeQuery
export const mockExecuteQuery = jest.fn();

// Mock for toast notifications
export const mockToast = jest.fn();

// Mock for React Query client
export const mockQueryClient = {
  invalidateQueries: jest.fn(),
  getQueryCache: jest.fn(),
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  getDefaultOptions: jest.fn(),
  setDefaultOptions: jest.fn(),
  mount: jest.fn(),
  unmount: jest.fn(),
};

// Mock batch item data
export const mockBatchItem = {
  id: 'batch-item-1',
  batch_id: 'batch-1',
  product_id: 'product-1',
  product_name: 'Test Product',
  barcode: '123456789',
  quantity: 10,
  batch_number: 'B001',
  warehouse_id: 'warehouse-1',
  warehouse_name: 'Main Warehouse',
  location_id: 'location-1',
  location_name: 'Shelf A1',
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  product_description: 'Test product description',
  product_category: ['test', 'category'],
  expiry_date: '2024-12-31'
};

// Mock stock out request data
export const mockStockOutRequest = {
  id: 'stock-out-1',
  product_id: 'product-1',
  product_name: 'Test Product',
  quantity: 5,
  remaining_quantity: 5,
  status: 'pending',
  requested_by: 'user-1',
  requested_at: '2023-01-01T00:00:00Z',
  stock_out_details: [
    {
      id: 'detail-1',
      stock_out_id: 'stock-out-1',
      product_id: 'product-1',
      quantity: 5
    }
  ]
};

// Mock deducted batch data
export const mockDeductedBatch = {
  id: 'deducted-1',
  batch_item_id: 'batch-item-1',
  barcode: '123456789',
  batch_number: 'B001',
  product_id: 'product-1',
  product_name: 'Test Product',
  location_id: 'location-1',
  location_name: 'Shelf A1',
  quantity_deducted: 2,
  timestamp: new Date().toISOString()
};
