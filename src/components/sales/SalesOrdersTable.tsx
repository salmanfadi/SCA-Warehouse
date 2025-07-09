import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { SalesOrder } from '@/hooks/useSalesOrders';
import { SalesOrderActions } from './SalesOrderActions';

interface SalesOrdersTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
  canPushToStockOut: (order: SalesOrder) => boolean;
  isPushPending: boolean;
  onViewOrder: (order: SalesOrder) => void;
  onPushToStockOut: (order: SalesOrder) => void;
}

export const SalesOrdersTable: React.FC<SalesOrdersTableProps> = ({
  orders,
  isLoading,
  canPushToStockOut,
  isPushPending,
  onViewOrder,
  onPushToStockOut
}) => {
  // Use React.memo for child components to prevent unnecessary re-renders
  const MemoizedSalesOrderActions = React.memo(SalesOrderActions);
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

  console.log('=== SALES ORDERS TABLE RENDER ===');
  console.log('Orders to display:', orders.length);
  console.log('isLoading:', isLoading);

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <div>Loading orders...</div>
            <div className="text-sm text-gray-500 mt-2">Debug: isLoading = {isLoading.toString()}</div>
          </div>
        ) : (
          <>
            <div className="p-4 bg-yellow-50 border-b text-sm">
              <strong>DEBUG INFO:</strong> Found {orders.length} orders to display
            </div>
            {/* Table for desktop/tablet */}
            <div className="hidden sm:block relative overflow-x-auto">
              <div className="absolute top-0 right-0 h-full w-8 pointer-events-none bg-gradient-to-l from-white/90 to-transparent z-10" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[250px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, rowIndex) => {
                    const canPush = canPushToStockOut(order);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.sales_order_number}
                          <div className="text-xs text-gray-500">ID: {order.id}</div>
                        </TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.customer_company}</TableCell>
                        <TableCell>
                          {format(new Date(order.order_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                          {order.pushed_to_stockout && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                              In Stock-Out
                            </Badge>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Status: {order.status}, Pushed: {order.pushed_to_stockout?.toString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <MemoizedSalesOrderActions
                            order={order}
                            canPushToStockOut={canPush}
                            isPushPending={isPushPending && order.id === localStorage.getItem('currentPushingOrderId')}
                            onViewOrder={() => onViewOrder(order)}
                            onPushToStockOut={() => {
                              // Store the current order ID being processed
                              localStorage.setItem('currentPushingOrderId', order.id);
                              onPushToStockOut(order);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div>No sales orders found</div>
                        <div className="text-sm text-gray-500 mt-2">
                          Search term applied or no orders in system
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Stacked card view for mobile */}
            <div className="sm:hidden flex flex-col gap-4 p-4">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <div>No sales orders found</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Search term applied or no orders in system
                  </div>
                </div>
              ) : (
                orders.map((order, rowIndex) => {
                  const canPush = canPushToStockOut(order);
                  return (
                    <div key={order.id} className="rounded-lg border p-4 shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500">{format(new Date(order.order_date), 'MMM d, yyyy')}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="font-semibold text-base mb-1">{order.customer_name}</div>
                      <div className="text-sm text-gray-700 mb-1">{order.customer_company}</div>
                      <div className="text-xs text-gray-500 mb-1">Order #: {order.sales_order_number}</div>
                      <div className="text-xs text-gray-500 mb-1">Amount: ${order.total_amount.toFixed(2)}</div>
                      {order.pushed_to_stockout && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 mb-1">
                          In Stock-Out
                        </Badge>
                      )}
                      <div className="flex flex-col gap-2 mt-2">
                        <MemoizedSalesOrderActions
                          order={order}
                          canPushToStockOut={canPush}
                          isPushPending={isPushPending && order.id === localStorage.getItem('currentPushingOrderId')}
                          onViewOrder={() => onViewOrder(order)}
                          onPushToStockOut={() => {
                            localStorage.setItem('currentPushingOrderId', order.id);
                            onPushToStockOut(order);
                          }}
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {order.status}, Pushed: {order.pushed_to_stockout?.toString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
