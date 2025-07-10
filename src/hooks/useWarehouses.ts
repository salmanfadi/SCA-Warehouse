
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse } from '@/types/database';

export const useWarehouses = () => {
  const fetchWarehouses = async (): Promise<Warehouse[]> => {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as Warehouse[];
  };
  
  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses
  });
  
  return {
    warehouses: warehousesQuery.data || [],
    isLoading: warehousesQuery.isLoading,
    error: warehousesQuery.error,
    refetch: warehousesQuery.refetch
  };
};
