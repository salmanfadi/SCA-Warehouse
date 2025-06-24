
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
  image_url: string | null; // Make this required but nullable for consistency
  // Legacy fields for backward compatibility
  active?: boolean | null;
  created_by?: string | null;
  updated_by?: string | null;
  specifications?: any;
  // Additional fields for product catalog
  is_out_of_stock?: boolean;
  in_stock_quantity?: number;
}
