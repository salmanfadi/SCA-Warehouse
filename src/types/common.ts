
import type { Product } from './products';

export interface StockOutWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  destination: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing' | 'from_sales_order';
  notes?: string;
  created_at: string;
  updated_at: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  warehouse_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_company?: string;
  customer_phone?: string;
  sales_order_id?: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    hsn_code?: string;
    gst_rate?: number;
    category?: string;
    barcode?: string;
    unit?: string;
    min_stock_level?: number;
    is_active?: boolean;
    gst_category?: string;
    image_url?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export interface StockInItem {
  id: string;
  product_id: string;
  quantity: number;
  number_of_boxes: number;
  status: string;
  created_at: string;
  updated_at: string;
  product: Product;
}

export interface TransferItem {
  id: string;
  product_id: string;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
  product: Product;
}
