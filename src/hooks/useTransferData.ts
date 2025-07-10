
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTransferData = (targetWarehouseId: string) => {
  // Fetch warehouses
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .order('name');
        
      if (error) throw error;
      return data;
    },
  });

  // Fetch locations based on selected warehouse
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', targetWarehouseId],
    queryFn: async () => {
      if (!targetWarehouseId) return [];
      
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, floor, zone, warehouse_id')
        .eq('warehouse_id', targetWarehouseId)
        .order('floor')
        .order('zone');
        
      if (error) throw error;
      return data;
    },
    enabled: !!targetWarehouseId,
  });

  return {
    warehouses,
    warehousesLoading,
    locations,
    locationsLoading
  };
};
