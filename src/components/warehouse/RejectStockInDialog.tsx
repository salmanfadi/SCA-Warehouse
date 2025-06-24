
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface StockInData {
  id: string;
  product: { name: string; id?: string | null };
  submitter: { name: string; username: string; id?: string | null } | null;
  boxes: number;
  status: "pending" | "approved" | "rejected" | "completed" | "processing";
  created_at: string;
  source: string;
  notes?: string;
  rejection_reason?: string;
}

interface RejectStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStockIn: StockInData | null;
  userId: string | undefined;
}

export const RejectStockInDialog: React.FC<RejectStockInDialogProps> = ({
  open,
  onOpenChange,
  selectedStockIn,
  userId,
}) => {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  
  // Reset reason when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRejectionReason('');
      setError('');
    }
  }, [open]);

  // Reject stock in mutation
  const rejectStockInMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      console.log('Rejecting stock in request:', id, 'with reason:', reason);
      
      try {
        // Create a notification for the rejection
        const notifResult = await supabase.from('notifications').insert([{
          user_id: selectedStockIn?.submitter?.id || null,
          role: 'field_operator', 
          action_type: 'stock_in_rejected',
          metadata: {
            stock_in_id: id,
            reason: reason,
            product_name: selectedStockIn?.product?.name
          }
        }]);
        
        if (notifResult.error) {
          console.error('Error creating notification:', notifResult.error);
        }
        
        // Update stock in status to rejected
        const { data, error } = await supabase
          .from('stock_in')
          .update({ 
            status: 'rejected',
            processed_by: userId,
            rejection_reason: reason
          })
          .eq('id', id)
          .select();

        if (error) {
          console.error('Error rejecting stock in:', error);
          throw error;
        }
        
        console.log('Stock in rejected successfully:', data);
        return data;
      } catch (error) {
        console.error('Failed to reject stock in:', error);
        throw error;
      }
    },
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['stock-in-requests'] });
      toast({
        title: 'Stock In Rejected',
        description: 'The stock in request has been rejected.',
      });
    },
    onError: (error) => {
      console.error('Error in rejection mutation:', error);
      toast({
        variant: 'destructive',
        title: 'Rejection failed',
        description: error instanceof Error ? error.message : 'Failed to reject stock in',
      });
    },
  });

  const handleReject = () => {
    if (!selectedStockIn) return;
    
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    
    rejectStockInMutation.mutate({
      id: selectedStockIn.id,
      reason: rejectionReason.trim()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Stock In Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this stock in request.
          </DialogDescription>
        </DialogHeader>
        
        {selectedStockIn && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="font-medium">Product: {selectedStockIn.product?.name}</div>
              <div className="text-sm text-gray-500">Total Boxes: {selectedStockIn.boxes}</div>
              <div className="text-sm text-gray-500">
                Submitted By: {selectedStockIn.submitter ? `${selectedStockIn.submitter.name} (${selectedStockIn.submitter.username})` : 'Unknown'}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please explain why this stock in request is being rejected..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                className={error ? 'border-red-500' : ''}
                rows={4}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={rejectStockInMutation.isPending}
          >
            {rejectStockInMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
