import React, { useState } from 'react';
import { 
  useQuery, 
  useQueryClient, 
  useMutation, 
  useQueries,
  QueryKey,
  QueryFunction,
  UseQueryOptions,
  QueryFunctionContext
} from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Product, CreateProductData, UpdateProductData, PaginatedProducts } from '../types/product';
import { createPaginationQueryKey, getPaginationMeta, DEFAULT_PAGE_SIZE_OPTIONS } from '../lib/pagination';

// Extend the UseQueryOptions type to include keepPreviousData
declare module '@tanstack/react-query' {
  interface UseQueryOptions<
    TQueryFnData = unknown,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
  > {
    keepPreviousData?: boolean;
  }
}

// Define a type for the minimum required fields when creating a product
interface CreateProductData {
  name: string;
  description?: string | null;
  specifications?: string | null;
  sku?: string | null;
  category?: string | null;
  is_active?: boolean;
  hsn_code?: string | null;
  gst_rate?: number | null;
  gst_category?: string | null;
  unit?: string | null;
  min_stock_level?: number | null;
  // Explicitly making barcode optional and nullable
  barcode?: string | null;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 15;

interface UseProductsOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  enabled?: boolean;
}

type ProductsQueryResult = PaginatedProducts;

export function useProducts({
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
  searchQuery = '',
  enabled = true
}: UseProductsOptions = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  // Fetch products with server-side pagination and search
  const queryKey = createPaginationQueryKey(
    'products',
    page,
    pageSize,
    searchQuery ? { search: searchQuery } : undefined
  );

  // Define the query function
  const queryFn: QueryFunction<ProductsQueryResult, QueryKey> = async (): Promise<ProductsQueryResult> => {
      console.log('Fetching products with pagination:', { page, pageSize, searchQuery });

      try {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        // Build the base query
        let query = supabase
          .from('products')
          .select('*', { count: 'exact' });

        // Apply search filter if searchQuery exists
        if (searchQuery) {
          query = query.or(
            `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`
          );
        }

        // Get paginated data and count in a single query
        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(start, end);

        if (error) {
          console.error('Error fetching products:', error);
          throw error;
        }

        const total = count || 0;
        const meta = getPaginationMeta(total, page, pageSize);

        return {
          data: data || [],
          pagination: {
            total,
            page: meta.currentPage,
            pageSize,
            totalPages: meta.totalPages
          }
        };
      } catch (error) {
        console.error('Error in useProducts:', error);
        return {
          data: [],
          pagination: {
            total: 0,
            page,
            pageSize,
            totalPages: 0
          }
        };
      }
    };

  // Create query options with proper typing
  const queryOptions: UseQueryOptions<ProductsQueryResult, Error> = {
    queryKey,
    queryFn,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    enabled
  };

  const {
    data: productsData,
    isLoading,
    error,
    refetch
  } = useQuery<ProductsQueryResult, Error>(queryOptions);

  // Add validation for image files
  const validateImage = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
    }

    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }
  };

  // Update the createProduct mutation
  const createProduct = useMutation({
    mutationFn: async (productData: CreateProductData & { image_file?: File | null }) => {
      const { image_file, ...data } = productData;

      // Validate image if provided
      if (image_file) {
        validateImage(image_file);
      }

      const { data: insertResult, error: insertError } = await supabase
        .from('products')
        .insert({
          ...data,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select();

      if (insertError) throw insertError;

      const newProduct = insertResult[0];
      return newProduct;
    },
    onError: (error) => {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create product'
      });
    },
  });

  // Update the uploadProductImage function
  const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
    const fileExt = file.type.split('/')[1];
    const fileName = `${productId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  };

  // Update product
  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const updateData = {
        ...data,
        updated_by: user?.id || null
      };

      const { data: updatedData, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
      return updatedData[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Success', {
        description: 'Product updated successfully'
      });
    },
    onError: (error) => {
      toast.error('Error', {
        description: error instanceof Error ?
          (error.message.includes('products_sku_unique') ?
            'A product with this SKU already exists' :
            error.message) :
          'Failed to update product'
      });
    },
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return productId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Success', {
        description: 'Product deleted successfully'
      });
    },
    onError: (error) => {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete product'
      });
    },
  });

  // Get product categories
  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .filter('category', 'neq', '');

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories.filter((category): category is string => Boolean(category));
    },
  });

  // Default empty state
  const defaultData: ProductsQueryResult = {
    data: [],
    pagination: {
      page,
      pageSize,
      total: 0,
      totalPages: 0
    }
  };

  const { data = defaultData.data, pagination = defaultData.pagination } = productsData || {};

  return {
    products: data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages: pagination.totalPages
    },
    isLoading,
    error,
    searchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    categories
  };
}

export default useProducts;
