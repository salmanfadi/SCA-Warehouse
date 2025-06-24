
import { useState } from 'react';
import { SalesOrder, useSalesOrders } from '@/hooks/useSalesOrders';
import { toast } from '@/hooks/use-toast';

export const useSalesOrderActions = () => {
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { createSalesOrder, pushToStockOut } = useSalesOrders();

  const handleCreateOrder = async (orderData: any) => {
    try {
      await createSalesOrder.mutateAsync(orderData);
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Sales order created successfully',
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create sales order',
      });
    }
  };

  const handlePushToStockOut = async (order: SalesOrder) => {
    console.log('=== PUSH TO STOCK-OUT CLICKED ===');
    console.log('Order being pushed:', order);
    try {
      await pushToStockOut.mutateAsync(order);
      console.log('Push to stock-out successful');
      toast({
        title: 'Success',
        description: `Order ${order.sales_order_number} pushed to stock-out successfully`,
      });
    } catch (error) {
      console.error('Error pushing to stock-out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to push order to stock-out',
      });
    }
  };

  const handleViewOrder = (order: SalesOrder) => {
    console.log('View order clicked:', order);
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
  };

  const canPushToStockOut = (order: SalesOrder) => {
    console.log(`🔍 Checking canPush for order ${order.sales_order_number}`);
    console.log(`Status: "${order.status}", Pushed: ${order.pushed_to_stockout}`);
    
    const allowedStatuses = ['confirmed', 'pending'];
    const statusOk = allowedStatuses.includes(order.status);
    const notPushed = !order.pushed_to_stockout;
    const result = statusOk && notPushed;
    
    console.log(`Can push result: ${result} (statusOk: ${statusOk}, notPushed: ${notPushed})`);
    return result;
  };

  return {
    selectedOrder,
    isDetailsDialogOpen,
    setIsDetailsDialogOpen,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    handleCreateOrder,
    handlePushToStockOut,
    handleViewOrder,
    canPushToStockOut,
    pushToStockOut
  };
};
