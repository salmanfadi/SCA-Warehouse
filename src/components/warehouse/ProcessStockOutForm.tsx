import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProcessStockOutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockOut: {
    id: string;
    product?: {
      id: string;
      name: string;
      sku?: string;
    };
    quantity?: number;
    destination: string;
    notes?: string;
    customer?: {
      name: string;
      email?: string;
      phone?: string;
      company?: string;
    };
    stock_out_details?: Array<{
      id: string;
      product_id: string;
      quantity: number;
      product?: {
        id: string;
        name: string;
        sku?: string;
      };
    }>;
  } | null;
  userId?: string;
}

const ProcessStockOutForm: React.FC<ProcessStockOutFormProps> = ({
  open,
  onOpenChange,
  stockOut,
  userId,
}) => {
  const [approvedQuantity, setApprovedQuantity] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const productId = productDetails.product_id || productDetails.product?.id;
  const requestedQuantity = productDetails.quantity || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !stockOut.id) return;

    setIsSubmitting(true);
    try {
      console.log('Processing stock out request:', stockOut.id, 'for product:', productId);
      
      // First check available inventory
      console.log('Checking inventory for product:', productId);
      const { data: inventoryData, error: inventoryError } = await executeQuery('inventory', async (supabase) => {
        return await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', productId)
          .eq('status', 'in_stock');
      });

      if (inventoryError) {
        console.error('Inventory check error:', inventoryError);
        throw inventoryError;
      }
      
      console.log('Inventory data:', inventoryData);

      const availableQuantity = Array.isArray(inventoryData) ? inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;

      if (availableQuantity < approvedQuantity) {
        toast({
          title: 'Error',
          description: `Not enough inventory available. Only ${availableQuantity} units in stock.`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Try direct SQL update instead of RPC
      console.log('Updating stock_out with id:', stockOut.id);
      
      // First try a simple direct update with just the status
      const { data: updateData, error: updateError } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .update({ status: 'approved' })
          .eq('id', stockOut.id)
          .select();
      });
      
      console.log('Update result:', { data: updateData, error: updateError });

      if (updateError) {
        console.error('Stock out update error:', JSON.stringify(updateError, null, 2));
        console.error('Stock out ID:', stockOut.id);
        console.error('Update payload:', { status: 'approved' });
        
        // Try to get more details about the error
        const errorMessage = updateError.message || 'Unknown error';
        const errorDetails = updateError.details || '';
        const errorHint = updateError.hint || '';
        const errorCode = updateError.code || '';
        
        console.error('Error details:', { 
          message: errorMessage,
          details: errorDetails,
          hint: errorHint,
          code: errorCode
        });
        
        toast({
          title: 'Error',
          description: `Failed to approve stock out: ${errorMessage}`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log('Stock out successfully updated');

      // Success
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      toast({
        title: 'Success',
        description: 'Stock out request has been approved.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing stock out:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // If it's a Supabase error, it might have additional details
      const supabaseError = error as { code?: string; details?: string; hint?: string; message?: string };
      if (supabaseError.code || supabaseError.details || supabaseError.hint) {
        console.error('Supabase error details:', {
          code: supabaseError.code,
          details: supabaseError.details,
          hint: supabaseError.hint
        });
      }
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process stock out request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                approvedQuantity <= 0 ||
                approvedQuantity > requestedQuantity ||
                isSubmitting
              }
            >
              {isSubmitting ? (
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

export default ProcessStockOutForm; 