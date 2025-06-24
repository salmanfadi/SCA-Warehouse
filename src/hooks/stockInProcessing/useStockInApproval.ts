
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useStockInApproval = (stockInId?: string) => {
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleApproval = async (isApproved: boolean) => {
    if (!stockInId) return;
    
    setIsSubmitting(true);
    
    try {
      // Update the stock-in status
      const newStatus = isApproved ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('stock_in')
        .update({
          status: newStatus,
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          rejection_reason: isApproved ? null : approvalNotes
        })
        .eq('id', stockInId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: `Stock-in request ${isApproved ? 'approved' : 'rejected'}`,
        description: isApproved ? 'The stock-in request has been approved' : 'The stock-in request has been rejected',
      });
      
      // Navigate back to the stock-in list
      navigate('/manager/stock-in');
    } catch (error) {
      console.error('Error updating stock-in:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${isApproved ? 'approve' : 'reject'} the stock-in request.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    approvalNotes,
    setApprovalNotes,
    handleApproval,
    isSubmitting,
    navigate
  };
};
