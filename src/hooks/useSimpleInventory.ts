
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SimpleInventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  quantity: number;
  color?: string;
  size?: string;
  status: string;
  batch_id?: string;
  barcode?: string;
  created_at: string;
  updated_at?: string;
  // Related data
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
  location_details?: string;
}

export const useSimpleInventory = () => {
  return useQuery({
    queryKey: ['simple-inventory'],
    queryFn: async (): Promise<SimpleInventoryItem[]> => {
      console.log('Fetching simple inventory data');
      
      // Get inventory items first
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
        throw inventoryError;
      }
      
      if (!inventoryItems || inventoryItems.length === 0) {
        return [];
      }

      // Get unique product IDs
      const productIds = [...new Set(inventoryItems.map(item => item.product_id))];
      const warehouseIds = [...new Set(inventoryItems.map(item => item.warehouse_id))];
      const locationIds = [...new Set(inventoryItems.map(item => item.location_id).filter(Boolean))];
      
      // Fetch products separately
      let products: any[] = [];
      if (productIds.length > 0) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds);
        
        if (!productError) {
          products = productData || [];
        }
      }
      
      // Fetch warehouses separately
      let warehouses: any[] = [];
      if (warehouseIds.length > 0) {
        const { data: warehouseData, error: warehouseError } = await supabase
          .from('warehouses')
          .select('id, name')
          .in('id', warehouseIds);
        
        if (!warehouseError) {
          warehouses = warehouseData || [];
        }
      }
      
      // Fetch locations separately
      let locations: any[] = [];
      if (locationIds.length > 0) {
        const { data: locationData, error: locationError } = await supabase
          .from('warehouse_locations')
          .select('id, zone, floor')
          .in('id', locationIds);
        
        if (!locationError) {
          locations = locationData || [];
        }
      }
      
      // Create lookup maps
      const productMap = new Map(products.map(p => [p.id, p]));
      const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
      const locationMap = new Map(locations.map(l => [l.id, l]));
      
      // Combine the data
      return inventoryItems.map(item => {
        const product = productMap.get(item.product_id);
        const warehouse = warehouseMap.get(item.warehouse_id);
        const location = locationMap.get(item.location_id);
        
        return {
          ...item,
          product_name: product?.name || 'Unknown Product',
          product_sku: product?.sku || 'N/A',
          warehouse_name: warehouse?.name || 'Unknown Warehouse',
          location_details: location ? `Floor ${location.floor} - Zone ${location.zone}` : 'Unknown Location'
        } as SimpleInventoryItem;
      });
    }
  });
};
