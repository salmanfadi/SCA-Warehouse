
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { SalesOrder } from '@/hooks/useSalesOrders';

interface SalesOrderDetailsDialogProps {
  order: SalesOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SalesOrderDetailsDialog: React.FC<SalesOrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
}) => {
  if (!order) return null;

  const getStatusBadge = (status: SalesOrder['status']) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      confirmed: { variant: 'default' as const, label: 'Confirmed' },
      processing: { variant: 'default' as const, label: 'Processing' },
      dispatched: { variant: 'default' as const, label: 'Dispatched' },
      completed: { variant: 'default' as const, label: 'Completed' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sales Order Details</DialogTitle>
          <DialogDescription>
            Order Number: {order.sales_order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Name:</strong> {order.customer_name}
              </div>
              <div>
                <strong>Company:</strong> {order.customer_company}
              </div>
              <div>
                <strong>Email:</strong> {order.customer_email}
              </div>
              <div>
                <strong>Phone:</strong> {order.customer_phone || 'N/A'}
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Order Date:</strong> {format(new Date(order.order_date), 'MMM d, yyyy')}
              </div>
              <div>
                <strong>Status:</strong> {getStatusBadge(order.status)}
              </div>
              <div>
                <strong>Total Amount:</strong> ${order.total_amount.toFixed(2)}
              </div>
              {order.pushed_to_stockout && (
                <div className="md:col-span-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Pushed to Stock-Out
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items && order.items.length > 0 ? (
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.id || index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <strong>Product:</strong> {item.product?.name || 'Product not found'}
                        </div>
                        <div>
                          <strong>Quantity:</strong> {item.quantity}
                        </div>
                        <div>
                          <strong>SKU:</strong> {item.product?.sku || 'N/A'}
                        </div>
                        {item.requirements && (
                          <div className="md:col-span-3">
                            <strong>Requirements:</strong> {item.requirements}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No items found for this order</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
