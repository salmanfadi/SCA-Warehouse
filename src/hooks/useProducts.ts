
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Product } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

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

export function useProducts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  // Fetch products with detailed logging
  const {
    data: products,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      console.log('Starting to fetch products...');
      
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*');

        console.log('Supabase response:', { data, error });

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!data) {
          console.log('No data returned from Supabase');
          return [];
        }

        console.log('Successfully fetched products:', data);
        return data;
      } catch (error) {
        console.error('Error in queryFn:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0,
    refetchOnMount: true
  });

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .filter('category', 'neq', null)
        .filter('category', 'neq', '');

      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories.filter(Boolean);
    },
  });

  return {
    products,
    isLoading,
    error,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    searchQuery,
    categoryFilter,
    statusFilter,
    categories
  };
}

export default useProducts;
