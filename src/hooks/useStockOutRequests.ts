 import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Define stock out detail type
type StockOutDetail = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_description: string;
  quantity: number;
  barcode: string;
  processed_quantity: number;
  processed_by: string;
  processed_at: string;
  created_at: string;
  updated_at: string;
};

// Main stock out request data interface
export interface StockOutRequestData {
  id: string;
  requester_id?: string;
  requested_by?: string;
  requester_name?: string;
  requester_email?: string;
  approved_by?: string;
  approved_at?: string;
  processed_by?: string;
  processed_at?: string;
  status: string;
  destination?: string;
  notes?: string;
  reason?: string; // Alias for notes in some components
  created_at: string;
  updated_at: string;
  priority?: string;
  reference_number?: string;
  product_id?: string;
  product_name?: string;
  product_sku?: string;
  product_description?: string;
  total_quantity: number;
  processed_quantity: number;
  remaining_quantity: number;
  quantity?: number; // Alias for total_quantity in some components
  details: StockOutDetail[];
}

export interface StockOutRequestsFilter {
  status?: string | string[];
  priority?: string | string[];
  requester_id?: string;
  approved_by?: string;
  processed_by?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  destination?: string;
  date_from?: string;
  date_to?: string;
}

export const useStockOutRequests = (
  filter: StockOutRequestsFilter = {},
  page: number = 1,
  pageSize: number = 20,
  enabled = true,
  refetchInterval?: number
) => {
  const { toast } = useToast();
  return useQuery<{ data: StockOutRequestData[]; totalCount: number }, Error>({
    queryKey: ['stock-out-requests', filter, page, pageSize],
    enabled,
    refetchInterval: refetchInterval || 1000 * 60,
    queryFn: async (): Promise<{ data: StockOutRequestData[]; totalCount: number }> => {
      try {
        const { data, error, count } = await executeQuery('stock_out', async (supabase) => {
          // Use the new view with all joins already included for better performance
          let query = supabase
            .from('stock_out_requests_detailed')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

          // Apply filters
          if (filter.status && filter.status !== 'all') {
            if (Array.isArray(filter.status)) {
              query = query.in('status', filter.status);
            } else {
              query = query.eq('status', filter.status);
            }
          }
          if (filter.priority) {
            if (Array.isArray(filter.priority)) {
              query = query.in('priority', filter.priority);
            } else {
              query = query.eq('priority', filter.priority);
            }
          }
          if (filter.destination) {
            query = query.ilike('destination', `%${filter.destination}%`);
          }
          if (filter.date_from || filter.startDate) {
            query = query.gte('created_at', filter.date_from || filter.startDate);
          }
          if (filter.date_to || filter.endDate) {
            query = query.lte('created_at', filter.date_to || filter.endDate);
          }
          if (filter.requester_id) {
            query = query.eq('requester_id', filter.requester_id);
          }
          if (filter.approved_by) {
            query = query.eq('approved_by', filter.approved_by);
          }
          if (filter.processed_by) {
            query = query.eq('processed_by', filter.processed_by);
          }
          if (filter.search) {
            query = query.or(`reference_number.ilike.%${filter.search}%,requester_name.ilike.%${filter.search}%`);
          }

          // Pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          return query.range(from, to);
        });

        if (error) {
          console.error('Error fetching stock out requests:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch stock out requests',
            variant: 'destructive',
          });
          return { data: [], totalCount: 0 };
        }
        
        if (!data || data.length === 0) {
          return { data: [], totalCount: count || 0 };
        }

        // Process the data from our optimized view with joins
        const processedData = data.map((stockOut: any) => {
          // Parse the details JSON array from our view
          const details = stockOut.details || [];
          
          // Calculate quantities
          const totalQuantity = details.reduce(
            (sum: number, detail: any) => sum + (detail.quantity || 0),
            0
          );
          
          const processedQuantity = details.reduce(
            (sum: number, detail: any) => sum + (detail.processed_quantity || 0),
            0
          );
          
          // Get product details from the first detail
          const firstDetail = details[0] || {};
          const productId = firstDetail?.product_id;
          const productName = firstDetail?.product_name || 'Unknown Product';
          const productSku = firstDetail?.product_sku || '';
          const productDescription = firstDetail?.product_description || '';
          
          return {
            id: stockOut.id,
            requester_id: stockOut.requester_id,
            requested_by: stockOut.requested_by,
            requester_name: stockOut.requester_full_name || stockOut.requester_name || 'Unknown',
            requester_email: stockOut.requester_email || '',
            approved_by: stockOut.approved_by,
            approved_at: stockOut.approved_at,
            processed_by: stockOut.processed_by,
            processed_at: stockOut.processed_at,
            status: stockOut.status || 'pending',
            destination: stockOut.destination || '',
            notes: stockOut.notes,
            reason: stockOut.notes, // Alias for notes used in some components
            created_at: stockOut.created_at,
            updated_at: stockOut.updated_at,
            priority: stockOut.priority,
            reference_number: stockOut.reference_number,
            product_id: productId,
            product_name: productName,
            product_sku: productSku,
            product_description: productDescription,
            total_quantity: totalQuantity,
            quantity: totalQuantity, // Alias for total_quantity used in some components
            processed_quantity: processedQuantity,
            remaining_quantity: totalQuantity - processedQuantity,
            details: details
          };
        });

        return { data: processedData, totalCount: count ?? 0 };
      } catch (error) {
        console.error('Failed to fetch stock out requests:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          variant: 'destructive',
          title: 'Failed to load stock out requests',
          description: errorMessage,
        });
        return { data: [], totalCount: 0 };
      }
    },
    staleTime: 1000 * 30
  });
};
