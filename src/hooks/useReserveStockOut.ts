import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const useReserveStockOut = (onStatusUpdate?: (id: string) => void) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      product_id,
      quantity,
      destination,
      reservation_id
    }: {
      product_id: string;
      quantity: number;
      destination: string;
      reservation_id: string;
    }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Start a transaction to ensure data consistency
      const { error: txnError } = await supabase.rpc('begin_transaction');
      if (txnError) throw txnError;

      try {
        // First create the stock out header
        const { data: stockOutHeader, error: headerError } = await supabase
          .from('stock_out')
          .insert([{
            requested_by: user.id,
            status: 'pending',
            created_by: user.id,
            updated_by: user.id,
            destination,
            quantity,
            product_id,
            reservation_id
          }])
          .select()
          .single();

        if (headerError) throw headerError;

        // Then create the stock out details
        const { data: stockOutDetails, error: detailsError } = await supabase
          .from('stock_out_details')
          .insert([{
            stock_out_id: stockOutHeader.id,
            product_id,
            quantity,
            created_by: user.id,
            updated_by: user.id,
            barcode: `RES-${reservation_id}`, // Using reservation ID as reference
            status: 'pending'
          }])
          .select();

        if (detailsError) throw detailsError;

        // Commit the transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) throw commitError;

        // If we successfully created both records, update the reservation status
        if (onStatusUpdate) {
          onStatusUpdate(reservation_id);
        }

        return { header: stockOutHeader, details: stockOutDetails };
      } catch (error) {
        // Rollback on any error
        await supabase.rpc('rollback_transaction');
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Stock Out Request Created',
        description: `Created from reservation for ${variables.destination}. Awaiting approval.`,
      });
      
      // Navigate to the appropriate stock out page based on user role
      const basePath = user?.role === 'admin' ? '/admin' : 
                      user?.role === 'warehouse_manager' ? '/manager' : 
                      '/operator';
      navigate(`${basePath}/stock-out`);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Create Stock Out',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  });
}; 