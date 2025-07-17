/**
 * Type definitions for Product related data structures
 */

export interface Product {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreateProductData {
  name: string;
  description?: string | null;
  price: number;
  sku: string;
  stock_quantity: number;
  category?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateProductData {
  name?: string;
  description?: string | null;
  price?: number;
  sku?: string;
  stock_quantity?: number;
  category?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProductFilters {
  search?: string;
  category?: string | null;
  status?: boolean | null;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface PaginatedProducts {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
