
// Re-export all types from individual modules for backward compatibility
export * from './auth';
export * from './products';
export * from './stock';
export * from './batch';
export * from './inventory';
export * from './warehouse';
export * from './inquiries';
export * from './common';

export type StockStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';

export interface ProcessedBatch {
  id: string;
  created_at: string;
  processed_at: string;
  processed_by: string;
  submitted_by: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  status: string;
  notes: string | null;
  warehouse_id: string;
  source: string | null;
  product_name: string;
  product?: {
    id: string;
    name: string;
  };
}

export interface ProcessedBatchType {
  id: string;
  created_at: string;
  processed_at: string;
  processed_by: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  status: string;
  notes: string | null;
  warehouse_id: string;
  product_name: string;
  product: {
    id: string;
    name: string;
  };
}

export interface StockInWithDetails {
  id: string;
  product_id: string;
  quantity: number;
  boxes: number | null;
  status: StockInStatus;
  created_at: string;
  source: string | null;
  notes: string | null;
  submitted_by: string | null;
  processed_by: string | null;
  product?: Product | null;
  submitter?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

export interface ProcessedBatchWithItems {
  id: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  totalBoxes: number;
  status: string;
  created_at: string;
  processed_at: string;
  warehouse_id: string;
  product: {
    id: string;
    name: string;
  };
}

export type StockInStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  hsn_code: string | null;
  gst_rate: number | null;
  created_at: string;
  updated_at: string;
  category: string | null;
  barcode: string | null;
  unit: string | null;
  min_stock_level: number | null;
  is_active: boolean | null;
  gst_category: string | null;
  image_url: string | null;
  // Legacy fields for backward compatibility
  active?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  specifications?: any;
  // Additional fields for product catalog
  is_out_of_stock?: boolean;
  in_stock_quantity?: number;
}

export interface StockInRequest {
  id: string;
  product_id: string;
  quantity: number;
  boxes: number | null;
  status: StockInStatus;
  created_at: string;
  source: string | null;
  notes: string | null;
  submitted_by: string | null;
  processed_by: string | null;
  product?: Product | null;
  submitter?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

export interface StockOutRequest {
  id: string;
  requester_id: string;
  status: StockStatus;
  product_id: string;
  quantity: number;
  destination: string;
  notes: string | null;
  type: 'batch' | 'box' | 'item';
  batch_id: string | null;
  box_ids: string[] | null;
  customer_name: string;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  reference_number: string | null;
  shipping_method: string | null;
  required_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  processed_by: string | null;
  created_at: string;
}

export interface BatchItem {
  id: string;
  batch_id: string;
  inventory_id: string;
  barcode: string;
  color: string | null;
  size: string | null;
  created_at: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  barcode: string;
  color: string | null;
  size: string | null;
  batch_id: string | null;
  status: string;
  warehouse_id: string;
  location_id: string;
  created_at: string;
  updated_at: string | null;
}

export interface CustomerInquiry {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  customer_phone: string | null;
  status: 'new' | 'in_progress' | 'completed';
  notes: string | null;
  converted_to_order: boolean;
  created_at: string;
  updated_at: string;
  items?: CustomerInquiryItem[];
  message?: string | null; // Optional for compatibility with SalesInquiry
}

export interface CustomerInquiryItem {
  id: string;
  inquiry_id: string;
  product_id: string | null;
  quantity: number;
  price: number | null;
  specific_requirements: string | null;
  created_at: string;
  product?: Product | null;
}

export interface SalesInquiry {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  customer_phone: string | null;
  status: 'new' | 'in_progress' | 'completed';
  message: string | null;
  converted_to_order: boolean;
  created_at: string;
  updated_at: string;
  items?: SalesInquiryItem[];
}

export interface SalesInquiryItem {
  id: string;
  inquiry_id: string;
  product_id: string | null;
  quantity: number;
  specific_requirements: string | null;
  created_at: string;
  product?: Product | null;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string | null;
  location: string | null;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  zone: string;
  floor: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  username: string | null;
  role: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  price?: number;
  requirements?: string;
  product: Product;
}

export interface StockInItem {
  id: string;
  stock_in_id: string;
  product_id: string;
  quantity: number;
  status: string;
  product: Product;
}

export interface StockOutWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  destination: string;
  status: StockStatus;
  created_at: string;
  product: Product;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  product: Product;
}

// Add type alias for backward compatibility
export type StockInRequestData = StockInRequest;
