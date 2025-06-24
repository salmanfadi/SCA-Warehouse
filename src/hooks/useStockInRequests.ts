import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  sku?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface StockInRecord {
  id: string;
  // Core fields from stock_in table
  product_id: string | null;
  requested_by: string | null;
  status: "pending" | "approved" | "rejected" | "completed" | "processing" | null;
  created_at: string | null;
  boxes: number | null;
  notes: string | null;
  source: string;
  processed_by: string | null;
  batch_id: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  updated_at: string | null;
  rejection_reason: string | null;
  number_of_boxes: number | null;
  warehouse_id: string | null;
  quantity: number | null;
  // Joined tables
  products: Product | null;
  profiles: Profile | null;
}

export interface StockInRequestData {
  id: string;
  // Product information (joined from products table)
  product: { 
    name: string; 
    id: string | null; 
    sku?: string | null 
  };
  // Submitter information (joined from profiles table)
  submitter: { 
    name: string; 
    username: string; 
    id: string | null;
    email?: string; 
  } | null;
  // Core fields from stock_in table
  boxes: number;
  status: "pending" | "approved" | "rejected" | "completed" | "processing";
  created_at: string;
  source: string;
  notes?: string | null;
  rejection_reason?: string | null;
  processed_by?: string | null;
  updated_at?: string | null;
  // Additional fields from stock_in table
  product_id?: string | null;
  requested_by?: string | null;
  warehouse_id?: string | null;
  quantity?: number | null;
  // UI-only fields (not in database)
  location_id?: string;
  warehouse_name?: string;
  location_name?: string;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  batch_id?: string | null;
  // For batch processing
  number_of_boxes?: number | null;
}

export const useStockInRequests = (filters: Record<string, any> = {}, page: number = 1, pageSize: number = 20) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchStockInRequests = useCallback(async () => {
    console.log('Fetching stock in requests with filter:', filters, 'page:', page, 'pageSize:', pageSize);
    try {
      // First get the count separately for better performance
      const countQuery = supabase
        .from('stock_in')
        .select('*', { count: 'exact', head: true });
      
      // Apply filters to count query
      let filteredCountQuery = countQuery;
      if (filters.status) {
        filteredCountQuery = filteredCountQuery.eq('status', filters.status);
      }
      if (filters.source) {
        filteredCountQuery = filteredCountQuery.ilike('source', `%${filters.source}%`);
      }
      if (filters.date_from) {
        filteredCountQuery = filteredCountQuery.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        filteredCountQuery = filteredCountQuery.lte('created_at', filters.date_to);
      }
      if (filters.submitted_by) {
        filteredCountQuery = filteredCountQuery.eq('submitted_by', filters.submitted_by);
      }
      
      const { count, error: countError } = await filteredCountQuery;
      if (countError) {
        console.error('Error counting stock in requests:', countError);
        throw countError;
      }
      
      // If no records, return early
      if (count === 0) {
        return { data: [], totalCount: 0 };
      }

      // Then fetch the actual data with joins
      let query = supabase
        .from('stock_in')
        .select(`
          id,
          product_id,
          submitted_by,
          number_of_boxes,
          status,
          created_at,
          source,
          notes,
          rejection_reason,
          products!inner (
            id,
            name,
            sku
          ),
          profiles:profiles!stock_in_submitted_by_fkey (
            id,
            email,
            full_name
          )
        `);
      
      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.source) {
        query = query.ilike('source', `%${filters.source}%`);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.submitted_by) {
        query = query.eq('submitted_by', filters.submitted_by);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: stockData, error: stockError, count: totalCount } = await query
        .order('created_at', { ascending: false });

      if (stockError) {
        console.error('Error fetching stock in requests:', stockError);
        throw stockError;
      }

      if (!stockData || stockData.length === 0) {
        return { data: [], totalCount: totalCount ?? 0 };
      }

      const processedData = (stockData as unknown as StockInRecord[]).map((item) => {
        const baseData: StockInRequestData = {
          id: item.id,
          // Map product information
          product: {
            id: item.products?.id || item.product_id || null,
            name: item.products?.name || 'Unknown Product',
            sku: item.products?.sku || null
          },
          // Map submitter information
          submitter: item.profiles ? {
            id: item.profiles.id || null,
            name: item.profiles.full_name || 'Unknown User',
            username: item.profiles.email?.split('@')[0] || 'user'
          } : null,
          // Map core fields
          boxes: item.number_of_boxes || item.boxes || 0,
          status: (item.status || 'pending') as 'pending' | 'approved' | 'rejected' | 'completed' | 'processing',
          created_at: item.created_at || new Date().toISOString(),
          source: item.source || 'Unknown',
          // Map optional fields with proper null handling
          notes: item.notes || undefined,
          rejection_reason: item.rejection_reason || undefined,
          processed_by: item.processed_by || null,
          updated_at: item.updated_at || null,
          // Map additional fields from stock_in table
          product_id: item.product_id || null,
          requested_by: item.requested_by || null,
          warehouse_id: item.warehouse_id || null,
          quantity: item.quantity || null,
          // Map batch processing fields
          number_of_boxes: item.number_of_boxes || null,
          batch_id: item.batch_id || null,
          processing_started_at: item.processing_started_at || null,
          processing_completed_at: item.processing_completed_at || null
        };

        return baseData;
      });
      
return { data: processedData, totalCount: totalCount ?? 0 };
    } catch (error) {
      console.error('Failed to fetch stock in requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Failed to load stock requests',
        description: errorMessage,
      });
      return { data: [], totalCount: 0 };
    }
  }, [filters, page, pageSize, toast]);

  const queryResult = useQuery({
    queryKey: ['stock-in-requests', filters, page, pageSize],
    queryFn: fetchStockInRequests,
    staleTime: 1000 * 30, // Data is fresh for 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute as a backup
    retry: 2, // Retry failed requests twice before showing an error
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  useEffect(() => {
    const subscription = supabase
      .channel('stock_in_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stock_in'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['stock-in-requests'] });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return queryResult;
};
