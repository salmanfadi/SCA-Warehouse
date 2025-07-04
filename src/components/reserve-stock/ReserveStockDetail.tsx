import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reserveStockService, ReserveStockWithDetails } from '@/services/reserveStockService';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReserveStockDetailProps {
  id: string;
  onClose: () => void;
}

export const ReserveStockDetail: React.FC<ReserveStockDetailProps> = ({ id, onClose }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: stock, isLoading, error } = useQuery({
    queryKey: ['reserve-stocks', id],
    queryFn: () => reserveStockService.getById(id),
  });

  const { data: reservedInventory, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['reserve-stocks', id, 'inventory'],
    queryFn: () => reserveStockService.getReservedInventory(id),
    enabled: !!stock,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ReserveStockWithDetails['status']) => 
      reserveStockService.updateStatus(id, status),
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
        description: 'Failed to update reserve stock status.',
        variant: 'destructive',
      });
      console.error('Error updating reserve stock status:', error);
    },
  });

  const convertToStockOutMutation = useMutation({
    mutationFn: () => reserveStockService.convertToStockOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reserve-stocks'] });
      toast({
        title: 'Success',
        description: 'Reserve stock converted to stock out successfully.',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to convert reserve stock to stock out.',
        variant: 'destructive',
      });
      console.error('Error converting reserve stock to stock out:', error);
    },
  });

  if (isLoading || isLoadingInventory) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="text-center p-8 text-red-500">
        Error loading reserve stock details: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      updateStatusMutation.mutate('cancelled');
    }
  };

  const handleComplete = () => {
    if (window.confirm('Are you sure you want to complete this reservation?')) {
      updateStatusMutation.mutate('completed');
    }
  };

  const handleActivate = () => {
    if (window.confirm('Are you sure you want to activate this reservation?')) {
      updateStatusMutation.mutate('active');
    }
  };

  const handleConvertToStockOut = () => {
    if (window.confirm('Are you sure you want to convert this reservation to a stock out?')) {
      convertToStockOutMutation.mutate();
    }
  };

  return (
    <ScrollArea className="h-[80vh] pr-4">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Reservation Details</h3>
          <p className="text-sm text-muted-foreground">
            Created on {format(new Date(stock.created_at), 'MMM d, yyyy HH:mm')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <h4 className="font-medium text-sm">Status</h4>
            <Badge variant={getStatusVariant(stock.status)} className="mt-1">
              {formatStatus(stock.status)}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium text-sm">Product</h4>
            <p className="mt-1">{stock.product.name}</p>
            {stock.product.sku && (
              <p className="text-sm text-muted-foreground">SKU: {stock.product.sku}</p>
            )}
            {stock.product.description && (
              <p className="text-sm text-muted-foreground mt-1">{stock.product.description}</p>
            )}
          </div>

          <div>
            <h4 className="font-medium text-sm">Warehouse</h4>
            <p className="mt-1">{stock.warehouse.name}</p>
            {stock.warehouse.code && (
              <p className="text-sm text-muted-foreground">Code: {stock.warehouse.code}</p>
            )}
          </div>

          <div>
            <h4 className="font-medium text-sm">Customer</h4>
            <p className="mt-1">{stock.customer_name}</p>
            {stock.customer && (
              <>
                {stock.customer.company && (
                  <p className="text-sm text-muted-foreground">{stock.customer.company}</p>
                )}
                {stock.customer.email && (
                  <p className="text-sm text-muted-foreground">{stock.customer.email}</p>
                )}
                {stock.customer.phone && (
                  <p className="text-sm text-muted-foreground">{stock.customer.phone}</p>
                )}
              </>
            )}
          </div>

          <div>
            <h4 className="font-medium text-sm">Quantity</h4>
            <p className="mt-1">{stock.quantity}</p>
          </div>

          <div>
            <h4 className="font-medium text-sm">Start Date</h4>
            <p className="mt-1">{format(new Date(stock.start_date), 'MMM d, yyyy')}</p>
          </div>

          <div>
            <h4 className="font-medium text-sm">End Date</h4>
            <p className="mt-1">{format(new Date(stock.end_date), 'MMM d, yyyy')}</p>
          </div>

          {stock.notes && (
            <div className="col-span-2">
              <h4 className="font-medium text-sm">Notes</h4>
              <p className="mt-1 whitespace-pre-wrap">{stock.notes}</p>
            </div>
          )}
        </div>

        {reservedInventory && reservedInventory.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-4">Reserved Inventory</h3>
              <div className="space-y-4">
                {reservedInventory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm">Product</h4>
                        <p>{item.product.name}</p>
                        {item.product.sku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Warehouse</h4>
                        <p>{item.warehouse.name}</p>
                        {item.warehouse.code && (
                          <p className="text-sm text-muted-foreground">Code: {item.warehouse.code}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Quantity</h4>
                        <p>{item.quantity}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Reserved At</h4>
                        <p>{format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-end gap-2">
          {stock.status === 'pending' && (
            <>
              <Button
                variant="default"
                onClick={handleActivate}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Activate'
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending}
              >
                Cancel
              </Button>
            </>
          )}

          {stock.status === 'active' && (
            <>
              <Button
                variant="default"
                onClick={handleConvertToStockOut}
                disabled={convertToStockOutMutation.isPending}
              >
                {convertToStockOutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Convert to Stock Out'
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={handleComplete}
                disabled={updateStatusMutation.isPending}
              >
                Complete
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending}
              >
                Cancel
              </Button>
            </>
          )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'outline';
    case 'converted_to_stockout':
      return 'default';
    default:
      return 'outline';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 