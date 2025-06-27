import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  isExpanded?: boolean;
  batches?: ProcessedBatch[];
}

export interface ProcessedBatch {
  id: string;
  batch_number: string;
  quantity_processed: number;
  total_quantity: number;
  warehouse_id: string;
  warehouse_name?: string;
  location_id: string;
  location_name?: string;
  floor?: string;
  zone?: string;
  processed_at: string;
  status: string;
}

export interface UseProductsWithBatchesResult {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  expandProduct: (productId: string) => Promise<void>;
  collapseProduct: (productId: string) => void;
  searchProducts: (term: string) => void;
}

export const useProductsWithBatches = (): UseProductsWithBatchesResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch all products initially
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        
        let query = supabase
          .from('products')
          .select('id, name, sku, description, category')
          .or('is_active.eq.true,active.eq.true');
        
        // Apply search filter if provided
        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
        }
        
        const { data, error } = await query.order('name');
        
        if (error) throw error;
        
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm]);

  // Function to expand a product and fetch its batches
  const expandProduct = async (productId: string) => {
    try {
      // Check if batches are already loaded
      const productIndex = products.findIndex(p => p.id === productId);
      if (productIndex === -1) return;
      
      const product = products[productIndex];
      if (product.batches && product.batches.length > 0) {
        // Batches already loaded, just expand
        const updatedProducts = [...products];
        updatedProducts[productIndex] = { ...product, isExpanded: true };
        setProducts(updatedProducts);
        return;
      }
      
      // Fetch batches for this product with warehouse and location details
      const { data, error } = await supabase
        .from('processed_batches')
        .select(`
          id, 
          batch_number, 
          quantity_processed, 
          total_quantity, 
          processed_at, 
          status, 
          warehouse_id, 
          warehouses:warehouse_id(name), 
          location_id
        `)
        .eq('product_id', productId);
      
      if (error) throw error;
      
      // Get all location IDs to fetch their details
      const locationIds = data.map((batch: any) => batch.location_id).filter(Boolean);
      
      // Fetch location details including floor and zone
      let locationDetails: Record<string, any> = {};
      if (locationIds.length > 0) {
        const { data: locationsData, error: locationsError } = await supabase
          .from('warehouse_locations')
          .select('id, name, floor, zone')
          .in('id', locationIds);
          
        if (locationsError) {
          console.error('Error fetching location details:', locationsError);
        } else if (locationsData) {
          // Create a map of location details by ID for easy lookup
          locationDetails = locationsData.reduce((acc: Record<string, any>, location: any) => {
            acc[location.id] = location;
            return acc;
          }, {});
        }
      }
      
      // Transform data to include warehouse and location names, floor, and zone
      const batchesWithDetails = data.map((batch: any) => {
        const locationDetail = batch.location_id ? locationDetails[batch.location_id] : null;
        
        return {
          id: batch.id,
          batch_number: batch.batch_number,
          quantity_processed: batch.quantity_processed,
          total_quantity: batch.total_quantity,
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouses?.name || 'Unknown Warehouse',
          location_id: batch.location_id,
          location_name: locationDetail?.name || 'Unknown Location',
          floor: locationDetail?.floor || 'N/A',
          zone: locationDetail?.zone || 'N/A',
          processed_at: batch.processed_at,
          status: batch.status
        };
      });
      
      // Update the product with batches and expanded state
      const updatedProducts = [...products];
      updatedProducts[productIndex] = { 
        ...product, 
        batches: batchesWithDetails,
        isExpanded: true 
      };
      
      setProducts(updatedProducts);
    } catch (err) {
      console.error(`Error fetching batches for product ${productId}:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to fetch batches for product ${productId}`));
    }
  };

  // Function to collapse a product
  const collapseProduct = (productId: string) => {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const updatedProducts = [...products];
    updatedProducts[productIndex] = { 
      ...updatedProducts[productIndex], 
      isExpanded: false 
    };
    
    setProducts(updatedProducts);
  };

  // Function to search products
  const searchProducts = (term: string) => {
    setSearchTerm(term);
  };

  return {
    products,
    isLoading,
    error,
    expandProduct,
    collapseProduct,
    searchProducts
  };
};
