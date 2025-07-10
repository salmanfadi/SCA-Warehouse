
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useManagerDashboardData = () => {
  const { user } = useAuth();
  
  // Fetch pending stock in count
  const pendingStockInQuery = useQuery({
    queryKey: ['manager-dashboard-pending-stock-in'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('stock_in')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch pending stock out count
  const pendingStockOutQuery = useQuery({
    queryKey: ['manager-dashboard-pending-stock-out'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('stock_out')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch total inventory count
  const activeInventoryQuery = useQuery({
    queryKey: ['manager-dashboard-active-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('status', 'available');
        
      if (error) throw error;
      return data ? data.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
    }
  });

  // Fetch warehouse count under management
  const warehousesQuery = useQuery({
    queryKey: ['manager-dashboard-warehouses'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('warehouses')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      return count || 0;
    }
  });

  return {
    pendingStockIn: pendingStockInQuery.data || 0,
    pendingStockOut: pendingStockOutQuery.data || 0,
    activeInventory: activeInventoryQuery.data || 0,
    warehouses: warehousesQuery.data || 0,
    isLoading: 
      pendingStockInQuery.isLoading || 
      pendingStockOutQuery.isLoading || 
      activeInventoryQuery.isLoading ||
      warehousesQuery.isLoading
  };
};
