export interface StockOutRequest {
  id: string;
  customer_inquiry_id?: string;
  reference_number?: string;
  status: string;
  notes?: string;
  created_at: string;
  created_by: string;
  processed_by?: string;
  processed_at?: string;
  is_reserved?: boolean; // Flag to indicate if this request is from a reservation
  stock_out_details: StockOutDetail[];
}

export interface StockOutDetail {
  id: string;
  stock_out_id: string;
  product_id: string;
  quantity: number;
  processed_quantity?: number;
  notes?: string;
  processed_by?: string;
  processed_at?: string;
  is_reserved?: boolean; // Flag to indicate if this detail is from a reservation
  product?: {
    id: string;
    name: string;
    sku: string;
    description?: string;
    category?: string[];
  };
}

export interface Box {
  id: string;
  barcode: string;
  quantity: number;
  warehouse_name?: string;
  location_name?: string;
  floor?: string;
  zone?: string;
  notes?: string;
  reserved_quantity?: number;
  total_quantity?: number;
  available_quantity?: number;
  product_name?: string;
  product_sku?: string;
  is_reserved?: boolean; // Flag to indicate if this box is from a reservation
  productId?: string; // ID of the product this box belongs to (used for barcode scanner navigation)
  stockOutId?: string; // ID of the stock out request this box belongs to
}

export interface ProcessedItem {
  batch_item_id: string;
  barcode: string;
  quantity: number;
  location_info?: {
    warehouse_name: string;
    floor: string;
    zone: string;
  };
  processed_at?: string;
}

// Define constants for product status
export const PRODUCT_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  RESERVED: 'reserved'
} as const;

// Define product status for UI
export interface ProductStatus {
  status: typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS]; // Use the type from PRODUCT_STATUS
  boxes: Box[];
  notes?: string;
  processedItems?: ProcessedItem[];
  processedQuantity?: number; // Track processed quantity for UI display
}

// Define reservation box from custom_reservation_boxes
export interface ReservationBox {
  id: string;
  custom_reservation_id: string;
  batch_item_id: string;
  barcode: string;
  quantity: number;
  reserved_quantity: number;
  warehouse_id?: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  floor?: string;
  zone?: string;
  created_at?: string;
  notes?: string;
}



// Define constants for batch status
export const BATCH_STATUS = {
  ACTIVE: 'active',
  OUT: 'out',
  PARTIAL: 'partial',
  RESERVED: 'reserved',
  USED: 'used'
} as const;
