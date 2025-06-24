
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { CreateSalesOrderForm } from '@/components/sales/CreateSalesOrderForm';
import { SalesOrderDetailsDialog } from '@/components/sales/SalesOrderDetailsDialog';
import { SalesOrdersFilters } from '@/components/sales/SalesOrdersFilters';
import { SalesOrdersTable } from '@/components/sales/SalesOrdersTable';
import { useSalesOrderActions } from '@/hooks/useSalesOrderActions';

const SalesOrdersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { salesOrders, isLoading, isRefreshing, refreshSalesOrders } = useSalesOrders();
  
  const {
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
  } = useSalesOrderActions();

  console.log('🚀 SALES ORDERS PAGE DEBUG');
  console.log('Orders loaded:', salesOrders?.length || 0);
  console.log('Loading state:', isLoading);

  if (salesOrders && salesOrders.length > 0) {
    salesOrders.forEach((order, index) => {
      console.log(`Order ${index + 1}: ${order.sales_order_number} - Status: ${order.status}, Pushed: ${order.pushed_to_stockout}`);
    });
  }

  const filteredOrders = salesOrders?.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sales_order_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Sales Orders" 
        description="Manage sales orders and push to stock-out"
      />

      <SalesOrdersFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateClick={() => setIsCreateDialogOpen(true)}
        onRefresh={refreshSalesOrders}
        isRefreshing={isRefreshing}
      />

      <SalesOrdersTable
        orders={filteredOrders}
        isLoading={isLoading}
        canPushToStockOut={canPushToStockOut}
        isPushPending={pushToStockOut?.isPending || false}
        onViewOrder={handleViewOrder}
        onPushToStockOut={handlePushToStockOut}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Sales Order</DialogTitle>
            <DialogDescription>
              Create a new sales order from customer requirements
            </DialogDescription>
          </DialogHeader>
          <CreateSalesOrderForm
            onSubmit={handleCreateOrder}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>

      <SalesOrderDetailsDialog
        order={selectedOrder}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  );
};

export default SalesOrdersPage;
