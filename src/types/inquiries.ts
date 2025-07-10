
import type { Product } from './products';

export interface CustomerInquiry {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  status: 'pending' | 'in_progress' | 'finalizing' | 'completed';
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  reference_number?: string | null;
  items?: CustomerInquiryItem[];
  message?: string | null; // For backward compatibility
  product_id?: string | null; // For single product inquiries
  product_name?: string | null; // For single product inquiries
  quantity?: number | null; // For single product inquiries
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
  product_name?: string;
  sku?: string;
  description?: string;
  unit?: string;
  image_url?: string;
}

// For backward compatibility - now we use CustomerInquiry directly
export interface SalesInquiry extends CustomerInquiry {
  message: string | null;
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
