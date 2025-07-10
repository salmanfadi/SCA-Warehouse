
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationDetail {
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  zone: string;
  floor: string;
  quantity: number;
  batchId?: string;
  batchCreatedAt?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productCategory?: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationDetails: string;
  allLocationDetails?: LocationDetail[];
  barcode: string;
  quantity: number;
  color?: string;
  size?: string;
  status: string;
  batchId?: string;
  lastUpdated: string;
}

export interface InventoryDataResponse {
  data: InventoryItem[];
  totalCount: number;
  isPartialData?: boolean;
}

export const useInventoryData = (
  warehouseFilter: string = '',
  batchFilter: string = '',
  statusFilter: string = '',
  searchTerm: string = '',
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: ['inventory-data-simple', warehouseFilter, batchFilter, statusFilter, searchTerm, page, pageSize],
    queryFn: async (): Promise<InventoryDataResponse> => {
      try {
        // Simplified query using inventory_summary view
        const { data, error, count } = await supabase
          .from('inventory_summary')
          .select('*', { count: 'exact' })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
          console.error('Error fetching inventory:', error);
          throw error;
        }

        const inventoryItems: InventoryItem[] = (data || []).map((item: any) => ({
          id: item.product_id,
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          productSku: item.product_sku || '',
          productCategory: item.product_category || '',
          warehouseId: 'default',
          warehouseName: 'Multiple Warehouses',
          locationId: 'default',
          locationDetails: 'Multiple Locations',
          barcode: item.product_sku || '',
          quantity: item.total_quantity || 0,
          color: '',
          size: '',
          status: 'available',
          batchId: '',
          lastUpdated: item.last_updated || new Date().toISOString(),
          allLocationDetails: []
        }));

        return {
          data: inventoryItems,
          totalCount: count || 0,
          isPartialData: false
        };
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        throw error;
      }
    },
    staleTime: 30000,
  });
};
