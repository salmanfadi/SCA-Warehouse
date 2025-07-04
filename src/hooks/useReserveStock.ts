import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DatabaseTables } from '@/types/supabase';

type ReserveStock = DatabaseTables['reserve_stock']['Row'] & {
  product: DatabaseTables['products']['Row'];
  warehouse: DatabaseTables['warehouses']['Row'];
};

interface CreateReserveStockInput {
  product_id: string;
  warehouse_id: string;
  customer_name: string;
  quantity: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

interface UpdateReserveStockStatusInput {
  id: string;
  status: ReserveStock['status'];
}

interface ConvertToStockOutInput {
  id: string;
  destination: string;
}

export function useReserveStock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all reserve stocks with related data
  const { data: reserveStocks, isLoading, error } = useQuery({
    queryKey: ['reserve-stocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reserve_stock')
        .select(`
          *,
          product:products(id, name, sku, description),
          warehouse:warehouses(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReserveStock[];
    },
  });

  // Create a new reserve stock
  const { mutate: createReserveStock, isPending: isCreating } = useMutation({
    mutationFn: async (input: CreateReserveStockInput) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('reserve_stock')
        .insert({
          product_id: input.product_id,
          warehouse_id: input.warehouse_id,
          customer_name: input.customer_name,
          quantity: input.quantity,
          start_date: input.start_date,
          end_date: input.end_date,
          notes: input.notes,
          requested_by: user.data.user.id,
          requested_at: new Date().toISOString(),
          duration_days: 7,
          return_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          customer_id: null,
          stock_out_id: null,
          location_id: null, // This should be set based on warehouse selection
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reserve-stocks'] });
      toast({
        title: 'Success',
        description: 'Stock has been reserved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reserve stock',
        variant: 'destructive',
      });
    },
  });

  // Update reserve stock status
  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async (input: UpdateReserveStockStatusInput) => {
      const { data, error } = await supabase
        .from('reserve_stock')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reserve-stocks'] });
      toast({
        title: 'Success',
        description: 'Reserve stock status updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  // Convert reserve stock to stock out
  const { mutate: convertToStockOut, isPending: isConverting } = useMutation({
    mutationFn: async (input: ConvertToStockOutInput) => {
      const { data: reserveStock, error: fetchError } = await supabase
        .from('reserve_stock')
        .select('*')
        .eq('id', input.id)
        .single();

      if (fetchError) throw fetchError;
      if (!reserveStock) throw new Error('Reserve stock not found');

      const { error: updateError } = await supabase
        .from('reserve_stock')
        .update({
          status: 'converted_to_stockout',
          stock_out_id: null, // Will be set by the trigger
        })
        .eq('id', input.id);

      if (updateError) throw updateError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reserve-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stockOutRequests'] });
      toast({
        title: 'Success',
        description: 'Reserve stock converted to stock out successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to convert to stock out',
        variant: 'destructive',
      });
    },
  });

  return {
    reserveStocks,
    isLoading,
    error,
    createReserveStock,
    isCreating,
    updateStatus,
    isUpdating,
    convertToStockOut,
    isConverting,
  };
}
