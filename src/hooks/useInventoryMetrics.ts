import { useQuery } from "@tanstack/react-query";
import { supabase, executeQuery } from "@/lib/supabase";

export interface InventoryMetrics {
  totalItems: number;
  availableItems: number;
  lowStockItems: number;
  warehouseCount: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch inventory metrics for dashboard
 * This is optimized to fetch aggregated data directly from the database
 * without requiring complex client-side calculations
 */
export function useInventoryMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventoryMetrics'],
    queryFn: async () => {
      try {
        // Get total inventory items count
        const { count: totalItems, error: totalError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Get available items count (status = 'available')
        const { count: availableItems, error: availableError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'available');

        if (availableError) throw availableError;

        // Get low stock items count (quantity below threshold)
        const { count: lowStockItems, error: lowStockError } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true })
          .lt('quantity', 10); // Items with low quantity

        if (lowStockError) throw lowStockError;
        
        // Get products with zero inventory
        // First, get all products
        const { data: allProducts, error: productsError } = await supabase
          .from('products')
          .select('id');
          
        if (productsError) throw productsError;
        
        // Then, get products that have inventory
        const { data: productsWithInventory, error: inventoryError } = await supabase
          .from('inventory')
          .select('product_id')
          .not('product_id', 'is', null);
          
        if (inventoryError) throw inventoryError;
        
        // Calculate products with zero inventory
        const productsWithInventoryIds = new Set(
          productsWithInventory.map(item => item.product_id)
        );
        
        const zeroStockProducts = allProducts.filter(
          product => !productsWithInventoryIds.has(product.id)
        ).length;

        // Get warehouse count
        const { count: warehouseCount, error: warehouseError } = await supabase
          .from('warehouses')
          .select('*', { count: 'exact', head: true });

        if (warehouseError) throw warehouseError;

        // Get processed batches count for comparison
        const { count: batchCount, error: batchError } = await supabase
          .from('processed_batches')
          .select('*', { count: 'exact', head: true });

        if (batchError) throw batchError;

        // Total low stock is both items with low quantity and products with zero inventory
        const totalLowStock = (lowStockItems || 0) + zeroStockProducts;
        
        return {
          totalItems: totalItems || 0,
          availableItems: availableItems || 0,
          lowStockItems: totalLowStock,
          warehouseCount: warehouseCount || 0,
          batchCount: batchCount || 0
        };
      } catch (error) {
        console.error('Error fetching inventory metrics:', error);
        throw error;
      }
    },
    staleTime: 10000, // 10 seconds for faster refresh during development
    gcTime: 30000, // 30 seconds
  });

  return {
    totalItems: data?.totalItems || 0,
    availableItems: data?.availableItems || 0,
    lowStockItems: data?.lowStockItems || 0,
    warehouseCount: data?.warehouseCount || 0,
    batchCount: data?.batchCount || 0,
    isLoading,
    error
  };
}
