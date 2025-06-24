
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StockInWithDetails } from './types';
import { mapStockInWithDetails } from './utils';

export const useStockInData = (stockInId?: string, page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ['stock-in-detail', stockInId, page, pageSize],
    queryFn: async (): Promise<StockInWithDetails[]> => {
      if (!stockInId) {
        return [];
      }
      try {
        const { data: stockIns, error } = await supabase
          .from('stock_in')
          .select(`
            *,
            products (
              id,
              name,
              sku,
              category
            ),
            profiles (
              id,
              name,
              username
            )
          `)
          .eq('id', stockInId);
        if (error) {
          console.error('Error fetching stock-in data:', error);
          throw error;
        }
        if (!stockIns || stockIns.length === 0) {
          console.warn('No stock-in data found.');
          return [];
        }
        const stockInWithDetails = await Promise.all(
          stockIns.map(async (stockIn) => {
            // Paginated details
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            const { data: details, error: detailsError, count } = await supabase
              .from('stock_in_details')
              .select('*', { count: 'exact' })
              .eq('stock_in_id', stockIn.id)
              .range(from, to);
            if (detailsError) {
              console.error(`Error fetching details for stock-in ID ${stockIn.id}:`, detailsError);
              return { ...mapStockInWithDetails(stockIn, []), detailsTotalCount: 0 };
            }
            return { ...mapStockInWithDetails(stockIn, details || []), detailsTotalCount: count ?? 0 };
          })
        );
        return stockInWithDetails;
      } catch (error) {
        console.error('Failed to fetch stock-in data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch stock-in data.',
        });
        throw error;
      }
    },
    enabled: !!stockInId,
  });
};
