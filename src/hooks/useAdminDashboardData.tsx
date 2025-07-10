
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats } from '@/components/admin/DashboardStatsGrid';

export interface RecentActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export const useAdminDashboardData = () => {
  const statsQuery = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        // Get counts from various tables
        const [usersResult, warehousesResult, productsResult, inventoryResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('warehouses').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('inventory').select('id', { count: 'exact', head: true })
        ]);

        return {
          users: usersResult.count || 0,
          warehouses: warehousesResult.count || 0,
          products: productsResult.count || 0,
          inventory: inventoryResult.count || 0
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          users: 0,
          warehouses: 0,
          products: 0,
          inventory: 0
        };
      }
    }
  });

  const activityQuery = useQuery({
    queryKey: ['admin-dashboard-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      try {
        // Use stock_in table for activity data since it has the correct columns
        const { data, error } = await supabase
          .from('stock_in')
          .select(`
            id,
            created_at,
            submitted_by,
            status
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        return (data || []).map(item => ({
          id: item.id,
          action: `Stock in request - Status: ${item.status}`,
          user: item.submitted_by || 'Unknown',
          timestamp: item.created_at,
          details: `Request ID: ${item.id}`
        }));
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        return [];
      }
    }
  });

  return {
    stats: statsQuery.data,
    activity: activityQuery.data,
    statsLoading: statsQuery.isLoading,
    activityLoading: activityQuery.isLoading,
    statsError: statsQuery.error,
    activityError: activityQuery.error,
    refetchStats: statsQuery.refetch,
    refetchActivity: activityQuery.refetch
  };
};
