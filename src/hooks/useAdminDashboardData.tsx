
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

interface StockInWithProfile {
  id: string;
  created_at: string;
  status: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export const useAdminDashboardData = () => {
  const statsQuery = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        // Get total users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get total products count
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        // Get total warehouses count
        const { count: warehousesCount } = await supabase
          .from('warehouses')
          .select('*', { count: 'exact', head: true });

        // Get total stock in requests count
        const { count: stockInCount } = await supabase
          .from('stock_in')
          .select('*', { count: 'exact', head: true });

        return {
          totalUsers: usersCount || 0,
          totalProducts: productsCount || 0,
          totalWarehouses: warehousesCount || 0,
          totalStockIn: stockInCount || 0,
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          totalUsers: 0,
          totalProducts: 0,
          totalWarehouses: 0,
          totalStockIn: 0,
        };
      }
    }
  });

  const activityQuery = useQuery({
    queryKey: ['admin-dashboard-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      try {
        // Fetch stock in requests with user profiles
        const { data: stockInData, error: stockInError } = await supabase
          .from('stock_in')
          .select(`
            id,
            created_at,
            status,
            profiles:profiles!stock_in_submitted_by_fkey (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (stockInError) throw stockInError;

        return (stockInData || []).map(item => {
          const typedItem = item as unknown as StockInWithProfile;
          return {
            id: typedItem.id,
            action: `Stock in request - Status: ${typedItem.status}`,
            user: typedItem.profiles?.full_name || typedItem.profiles?.email?.split('@')[0] || 'Unknown User',
            timestamp: typedItem.created_at,
            details: `Request ID: ${typedItem.id}`
          };
        });
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
