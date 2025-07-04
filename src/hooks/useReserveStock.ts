import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ReserveStockItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  customer_name: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'processed';
  warehouse_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateReserveStockInput {
  product_id: string;
  quantity: number;
  customer_name: string;
  start_date: string;
  end_date: string;
  warehouse_id: string;
}

export const useReserveStock = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all reserve stock items
  const { data: reserveStockItems, isLoading, error } = useQuery({
    queryKey: ['reserveStock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reserve_stock')
        .select(`
          *,
          product:products (
            id,
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReserveStockItem[];
    }
  });

  // Create new reserve stock
  const createReserveStock = useMutation({
    mutationFn: async (input: CreateReserveStockInput) => {
      const { data, error } = await supabase
        .from('reserve_stock')
        .insert({
          ...input,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reserveStock']);
      toast({
        title: 'Success',
        description: 'Stock has been reserved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Cancel reserve stock
  const cancelReserveStock = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reserve_stock')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reserveStock']);
      toast({
        title: 'Success',
        description: 'Reservation has been cancelled.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Push to stock out
  const pushToStockOut = useMutation({
    mutationFn: async (id: string) => {
      const { data: reservation, error: fetchError } = await supabase
        .from('reserve_stock')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Create stock out request
      const { data, error } = await supabase
        .from('stock_out')
        .insert({
          product_id: reservation.product_id,
          quantity: reservation.quantity,
          destination: reservation.customer_name,
          status: 'pending',
          requested_by: user?.id,
          warehouse_id: reservation.warehouse_id,
          reserve_stock_id: id
        })
        .select()
        .single();

      if (error) throw error;

      // Update reserve stock status
      const { error: updateError } = await supabase
        .from('reserve_stock')
        .update({ 
          status: 'processed',
          stock_out_id: data.id
        })
        .eq('id', id);

      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reserveStock']);
      toast({
        title: 'Success',
        description: 'Stock out request has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    reserveStockItems,
    isLoading,
    error,
    createReserveStock,
    cancelReserveStock,
    pushToStockOut
  };
}; 