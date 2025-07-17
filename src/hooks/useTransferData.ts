
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse, Location } from '@/types/warehouse';

export const useTransferData = (selectedWarehouseId: string) => {
  const warehousesQuery = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const locationsQuery = useQuery<Location[]>({
    queryKey: ['warehouse-locations', selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return [];
      
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('*')
        .eq('warehouse_id', selectedWarehouseId)
        .order('zone');
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWarehouseId
  });

  return {
    warehouses: warehousesQuery.data || [],
    warehousesLoading: warehousesQuery.isLoading,
    locations: locationsQuery.data || [],
    locationsLoading: locationsQuery.isLoading
  };
};
