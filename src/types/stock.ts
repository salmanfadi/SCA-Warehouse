
export type StockStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';
export type StockInStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

export interface StockInRequest {
  id: string;
  product_id?: string; // Make optional since it's mapped from product.id
  quantity?: number; // Make optional since not always present
  boxes: number | null;
  status: StockInStatus;
  created_at: string;
  source: string | null;
  notes: string | null;
  submitted_by?: string | null; // Make optional since mapped from submitter.id
  processed_by: string | null;
  product?: {
    id: string | null;
    name: string;
    sku?: string | null;
  };
  submitter?: {
    id: string;
    name: string;
    username: string;
  } | null;
  rejection_reason?: string;
}

export interface StockInWithDetails {
  id: string;
  product_id: string;
  quantity: number; // Add this required property
  boxes: number | null;
  status: StockInStatus;
  created_at: string;
  source: string | null;
  notes: string | null;
  submitted_by: string | null;
  processed_by: string | null;
  product?: any | null;
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

export interface StockOutWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  destination: string;
  status: StockStatus;
  created_at: string;
  notes?: string | null;
  product: any;
  item_id?: string;
  product_name?: string;
}

// Add type alias for backward compatibility
export type StockInRequestData = StockInRequest;
