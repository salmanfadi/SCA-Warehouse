import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DatabaseTables } from '@/types/supabase';

type StockOutRequest = DatabaseTables['stock_out_requests']['Row'] & {
  product?: DatabaseTables['products']['Row'];
  customer?: DatabaseTables['customers']['Row'];
  warehouse?: DatabaseTables['warehouses']['Row'];
  stock_out_details?: Array<{
    product_id: string;
    quantity: number;
    product: DatabaseTables['products']['Row'];
  }>;
};

interface ProcessStockOutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockOut: StockOutRequest;
  userId: string | undefined;
}

export const ProcessStockOutForm: React.FC<ProcessStockOutFormProps> = ({
  open,
  onOpenChange,
  stockOut,
  userId,
}) => {
  const [approvedQuantity, setApprovedQuantity] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStockOutMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User ID is required');
      if (!stockOut?.id) throw new Error('Stock out ID is required');

      // Update stock out request status
      const { error: updateError } = await supabase
        .from('stock_out_requests')
        .update({
          status: 'approved',
          approved_quantity: approvedQuantity,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', stockOut.id);

      if (updateError) throw updateError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockOutRequests'] });
      toast({
        title: 'Stock out approved',
        description: 'The stock out request has been approved successfully.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error approving stock out',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStockOutMutation.mutate();
  };

  if (!stockOut) return null;

  // Get the first product from stock_out_details or use the product from the transformed data
  const productDetails = stockOut.stock_out_details?.[0] || { 
    product_id: stockOut.product?.id,
    quantity: stockOut.quantity || 0,
    product: stockOut.product
  };
  
  if (!productDetails?.product_id && !productDetails?.product?.id) {
    console.error('No product information available');
    return null;
  }

  const requestedQuantity = productDetails.quantity || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Process Stock Out Request</DialogTitle>
          <DialogDescription>
            Review and approve the stock out request
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="font-medium">Product: {productDetails.product?.name || 'Unknown Product'}</div>
              {productDetails.product?.sku && (
                <div className="text-sm text-gray-500">SKU: {productDetails.product.sku}</div>
              )}
              <div className="text-sm text-gray-500">
                Requested Quantity: {requestedQuantity}
              </div>
              <div className="text-sm text-gray-500">
                Destination: {stockOut.destination}
              </div>
              {stockOut.customer && (
                <div className="text-sm text-gray-500">
                  Customer: {stockOut.customer.name}
                  {stockOut.customer.company && ` (${stockOut.customer.company})`}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="approved_quantity">Approved Quantity</Label>
              <Input
                id="approved_quantity"
                type="number"
                min={1}
                max={requestedQuantity}
                value={approvedQuantity}
                onChange={(e) => setApprovedQuantity(parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-gray-500">
                You can approve up to the requested quantity if inventory is available
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateStockOutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                approvedQuantity <= 0 ||
                approvedQuantity > requestedQuantity ||
                updateStockOutMutation.isPending
              }
            >
              {updateStockOutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Approve Stock Out'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 