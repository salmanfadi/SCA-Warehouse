
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useStockOutOperations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createStockOut = useMutation({
    mutationFn: async (stockOutData: any) => {
      console.log('Creating stock out:', stockOutData);
      
      const { data, error } = await supabase
        .from('stock_out')
        .insert({
          destination: stockOutData.destination,
          notes: stockOutData.notes,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(`
          *,
          product:products(
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      // Transform the response to match expected type
      return {
        ...data,
        product_id: data.product?.[0]?.id || '',
        quantity: 0,
        product: data.product?.[0] || { id: '', name: '' }
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      toast({
        title: 'Success',
        description: 'Stock out request created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating stock out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create stock out request',
      });
    },
  });

  const updateStockOut = useMutation({
    mutationFn: async (stockOutData: any) => {
      console.log('Updating stock out:', stockOutData);
      
      const { data, error } = await supabase
        .from('stock_out')
        .update({
          destination: stockOutData.destination,
          notes: stockOutData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stockOutData.id)
        .select(`
          *,
          product:products(
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      // Transform the response to match expected type
      return {
        ...data,
        product_id: data.product?.[0]?.id || '',
        quantity: 0,
        product: data.product?.[0] || { id: '', name: '' }
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      toast({
        title: 'Success',
        description: 'Stock out request updated successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Error updating stock out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update stock out request',
      });
    },
  });

  const deleteStockOut = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting stock out:', id);
      
      const { error } = await supabase
        .from('stock_out')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-outs'] });
      toast({
        title: 'Success',
        description: 'Stock out request deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting stock out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete stock out request',
      });
    },
  });

  return {
    createStockOut: createStockOut.mutate,
    updateStockOut: updateStockOut.mutate,
    deleteStockOut: deleteStockOut.mutate,
    isCreating: createStockOut.isPending,
    isUpdating: updateStockOut.isPending,
    isDeleting: deleteStockOut.isPending,
  };
};
