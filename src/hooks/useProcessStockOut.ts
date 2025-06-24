
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface ProcessStockOutParams {
  requestId: string;
  items: Array<{
    id: string;
    quantity: number;
  }>;
}

interface ProcessStockOutOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useProcessStockOut = (options?: ProcessStockOutOptions) => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, items }: ProcessStockOutParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Process each item in sequence
      for (const item of items) {
        // Update the stock out detail
        const { error } = await supabase
          .from('stock_out_details')
          .update({ 
            quantity: item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Update the stock out status
      const { error: statusError } = await supabase
        .from('stock_out')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (statusError) throw statusError;

      return { success: true };
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    }
  });
};
