/**
 * Types for the stockout service
 */

// Represents a batch item with barcode information
export interface BatchItem {
  id: string;
  batch_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  quantity: number;
  reserved_quantity?: number;
  batch_number: string;
  location_id?: string;
  location_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  floor?: string;
  zone?: string;
  status?: string;
  color?: string;
  size?: string;
  created_at?: string;
  updated_at?: string;
}

// Represents a stock out item within a request
export interface StockOutItem {
  product_id: string;
  product_name: string;
  quantity: number;
  remaining_quantity?: number;
  detail_id?: string; // ID of the stock_out_detail record
  sku?: string;
  description?: string;
  category?: string[] | null;
}

// Represents a stock out request
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
  customer_inquiry_id?: string; // Foreign key to customer_inquiries table
  
  // Additional fields from API response
  requester_id?: string;
  requester_name?: string;
  requester_email?: string;
  created_at?: string;
  updated_at?: string;
  reference_number?: string;
  notes?: string;
  destination?: string;
  product_sku?: string;
  product_description?: string;
  product_category?: string[] | null;
  details?: any[];
  
  // Items array from the API response
  items?: StockOutItem[];
}

/**
 * Represents detailed location information for a processed item
 */
export interface LocationInfo {
  warehouse_id: string | null;
  warehouse_name: string | null;
  location_id: string | null;
  location_name: string | null;
  floor: string | null;
  zone: string | null;
}

/**
 * Represents barcode information for a processed item
 */
export interface BarcodeInfo {
  barcode: string;
  batch_item_id: string;
  batch_number: string;
  quantity: number;
}

/**
 * Represents a processed item in the stock out
 * This interface matches the actual database schema of stock_out_processed_items table
 */
export interface ProcessedItem {
  id: string;
  stock_out_id: string;
  stock_out_detail_id: string | null;
  batch_item_id: string;
  product_id: string;
  barcode: string; // Primary barcode (for backward compatibility)
  warehouse_id: string | null;
  location_id: string | null;
  quantity: number;
  processed_by: string;
  processed_at: string;
  notes: string; // JSON string containing additional data like batch_number, product_name, location_info
  
  // Virtual fields (not in DB but used in code)
  batch_number?: string;
  product_name?: string;
  location_info?: LocationInfo;
  barcodes?: BarcodeInfo[];
}

// Represents the state of the stock out form
export interface StockOutState {
  isLoading: boolean;
  isProcessing: boolean;
  isSuccess: boolean;
  currentBatchItem: BatchItem | null;
  stockOutRequest: StockOutRequest | null;
  processedItems: ProcessedItem[];
  quantity: number;
  scannerEnabled: boolean;
  scannedBarcodes: Set<string>;
  progress: number;
  processedQuantityMap: Map<string, number>; // Map to track processed quantities by batch_item_id
}

// Validation result for barcode scanning
export interface BarcodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
  batchItem: BatchItem | null;
  maxDeductibleQuantity?: number;
  alreadyProcessedQuantity?: number;
}
