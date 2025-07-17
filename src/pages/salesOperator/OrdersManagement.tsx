import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Calendar, Package, Truck, Loader2, Search, RefreshCw, Plus } from 'lucide-react';
import { useSalesOrders, SalesOrder } from '@/hooks/useSalesOrders';
import { CreateSalesOrderForm } from '@/components/sales/CreateSalesOrderForm';
import { ReserveOrderButton } from '@/components/warehouse/ReserveOrderButton';
import { ProductToReserve } from '@/components/warehouse/ReservationModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/**
 * Sales Orders Management Component
 * Displays and manages sales orders with action buttons for stock operations
 */
const OrdersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [orderToPush, setOrderToPush] = useState<any>(null);
  const [productData, setProductData] = useState<Record<string, ProductToReserve>>({});
  const [isLoadingProductData, setIsLoadingProductData] = useState<boolean>(false);
  const [productDataError, setProductDataError] = useState<string | null>(null);
  const { salesOrders, isLoading, isRefreshing, refreshSalesOrders, createSalesOrder, pushToStockOut } = useSalesOrders();
  
  // Create a stable reference for order IDs to prevent infinite loops
  const orderIdsString = useMemo(() => {
    return JSON.stringify(salesOrders?.map(order => order.id) || []);
  }, [salesOrders]);
  
  // Fetch product data for all order items
  useEffect(() => {
    const fetchProductData = async () => {
      if (!salesOrders || salesOrders.length === 0) {
        setProductData({});
        return;
      }
      
      setIsLoadingProductData(true);
      setProductDataError(null);
      const productIds = new Set<string>();
      
      // Collect all unique product IDs from orders
      salesOrders.forEach((order) => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item: any) => {
            if (item.product_id) {
              productIds.add(item.product_id);
            }
          });
        }
      });
      
      // Fetch product data for all collected IDs
      if (productIds.size > 0) {
        try {
          console.log('Fetching product data for IDs:', Array.from(productIds));
          
          // First get basic product info
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name, sku, category')
            .in('id', Array.from(productIds));
          
          if (productsError) {
            console.error('Error fetching product data:', productsError);
            toast.error('Failed to load product data');
            setProductDataError('Failed to load product data');
            setIsLoadingProductData(false);
            return;
          }
          
          if (!productsData || productsData.length === 0) {
            console.log('No products found');
            setIsLoadingProductData(false);
            return;
          }
          
          // Now get inventory quantities for these products
          const { data: inventoryData, error: inventoryError } = await supabase
            .from('inventory')
            .select('product_id, total_quantity, reserved_quantity')
            .in('product_id', Array.from(productIds));
            
          if (inventoryError) {
            console.error('Error fetching inventory data:', inventoryError);
            toast.error('Failed to load inventory data');
            setProductDataError('Failed to load inventory data');
          }
          
          // Create maps for total and reserved quantities
          const totalQuantityMap: Record<string, number> = {};
          const reservedQuantityMap: Record<string, number> = {};
          const availableQuantityMap: Record<string, number> = {};
          
          if (inventoryData) {
            inventoryData.forEach((item: any) => {
              const productId = item.product_id;
              const quantity = item.total_quantity || 0;
              const reservedQty = item.reserved_quantity || 0;
              
              // Initialize if not exists
              if (!totalQuantityMap[productId]) {
                totalQuantityMap[productId] = 0;
                reservedQuantityMap[productId] = 0;
              }
              
              // Add to totals
              totalQuantityMap[productId] += quantity;
              reservedQuantityMap[productId] += reservedQty;
            });
            
            // Calculate available quantities
            Array.from(productIds).forEach(productId => {
              const total = totalQuantityMap[productId] || 0;
              const reserved = reservedQuantityMap[productId] || 0;
              availableQuantityMap[productId] = Math.max(0, total - reserved);
            });
          }
          
          // Create the final product map with quantities
          const productMap: Record<string, ProductToReserve> = {};
          productsData.forEach((product: any) => {
            productMap[product.id] = {
              id: product.id,
              name: product.name,
              sku: product.sku,
              category: product.category,
              total_quantity: totalQuantityMap[product.id] || 0,
              reserved_quantity: reservedQuantityMap[product.id] || 0,
              available_quantity: availableQuantityMap[product.id] || 0
            };
          });
          
          setProductData(productMap);
          console.log('Product data map created with inventory quantities:', productMap);
          
        } catch (err) {
          console.error('Error in product data fetching process:', err);
          toast.error('Failed to load product data');
          setProductDataError('Failed to load product data');
        } finally {
          setIsLoadingProductData(false);
        }
      } else {
        console.log('No product IDs found in orders');
        setIsLoadingProductData(false);
      }
    };
    
    fetchProductData();
  }, [orderIdsString]); // Only re-run when order IDs change
  
  // We rely on the status from the database for button visibility

  const filteredOrders = useMemo(() => {
    if (!salesOrders || salesOrders.length === 0) return [];
    return salesOrders.filter(order => 
      (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer_company && order.customer_company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.sales_order_number && order.sales_order_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [salesOrders, searchTerm]);

  const handleCreateOrder = async (orderData: any) => {
    try {
      await createSalesOrder.mutateAsync(orderData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  // Order push confirmation state is already defined above

  const handlePushToStockOut = (order: any) => {
    setIsPushDialogOpen(false);
    setOrderToPush(null);
    
    // Perform the mutation - the status will be updated to 'finalizing'
    // which will make the button disappear on refetch
    pushToStockOut.mutate(order);
  };
  
  const openPushConfirmation = (order: SalesOrder) => {
    setOrderToPush(order);
    setIsPushDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">In Progress</Badge>;
      case 'finalizing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Finalizing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canPushToStockOut = (order: SalesOrder) => {
    // Only allow pushing to stock-out if the order is in_progress
    // Don't allow if it's already finalizing (being processed for stock-out) or completed
    return order.status === 'in_progress';
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        description="Manage and track sales orders."
      />
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sales Orders</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={refreshSalesOrders} 
              disabled={isRefreshing}
              className="flex-shrink-0"
              title="Refresh orders"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {order.sales_order_number ? (
                        <span className="font-mono text-sm">{order.sales_order_number}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 group relative">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {order.items.length} items
                        {order.items.length > 0 && (
                          <div className="absolute z-50 invisible group-hover:visible bg-white shadow-lg rounded-md p-3 w-64 mt-1 left-0">
                            <div className="text-sm font-medium mb-1">Products:</div>
                            <ul className="space-y-1">
                              {order.items.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {productData[item.product_id]?.name || 'Unknown Product'} <span className="font-medium">({item.quantity})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {order.is_reserved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Reserved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">Not Reserved</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row gap-2 items-center justify-start">
                        {/* Push to Stock-Out Button - Always visible but conditionally disabled */}
                        <Button
                          onClick={() => canPushToStockOut(order) && openPushConfirmation(order)}
                          disabled={!canPushToStockOut(order) || pushToStockOut.isPending}
                          size="sm"
                          className="flex items-center gap-1 px-2 h-8"
                          variant="secondary"
                          title={!canPushToStockOut(order) ? 'Cannot push to stock-out in current status' : 'Push this order to stock-out'}
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {pushToStockOut.isPending && pushToStockOut.variables?.id === order.id 
                            ? 'Processing...' 
                            : 'Stock-Out'}
                        </Button>
                        
                        {/* Reserve Stock Button - Always visible but conditionally disabled */}
                        {(() => {
                          // Create a list of products with required quantities for this order
                          const orderProducts: ProductToReserve[] = [];
                          const uniqueProductIds = new Set<string>();
                          
                          // Collect unique product IDs and calculate required quantities
                          if (order.items) {
                            order.items.forEach((item: any) => {
                              if (item.product_id && productData[item.product_id]) {
                                uniqueProductIds.add(item.product_id);
                              }
                            });
                          }
                          
                          // Create product objects with required quantities
                          Array.from(uniqueProductIds).forEach(productId => {
                            const product = productData[productId];
                            if (product) {
                              // Calculate required quantity from order items
                              const requiredQty = order.items
                                .filter((item: any) => item.product_id === productId)
                                .reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
                              
                              orderProducts.push({
                                ...product,
                                required_quantity: requiredQty
                              });
                            }
                          });
                          
                          if (isLoadingProductData) {
                            return (
                              <Button size="sm" variant="outline" disabled className="px-2 h-8">
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Loading...
                              </Button>
                            );
                          }
                          
                          // Always show the button, but disable it if needed
                          return (
                            <ReserveOrderButton
                              orderId={order.id}
                              products={orderProducts}
                              size="sm"
                              variant="outline"
                              className="px-2 h-8"
                              onReservationComplete={() => refreshSalesOrders()}
                              isDisabled={order.is_reserved || orderProducts.length === 0}
                              disabledReason={order.is_reserved ? 'Already Reserved' : 'No Products Available'}
                            />
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No sales orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
            isLoading={createSalesOrder.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Push to Stock-Out Confirmation Dialog */}
      <Dialog open={isPushDialogOpen} onOpenChange={setIsPushDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Order to Stock-Out</DialogTitle>
            <DialogDescription>
              This will create a stock-out request for warehouse processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {orderToPush && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Sales Order #:</div>
                  <div>
                    {orderToPush.sales_order_number ? (
                      <span className="font-mono text-sm">{orderToPush.sales_order_number}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not assigned</span>
                    )}
                  </div>
                  <div className="font-medium">Customer:</div>
                  <div>{orderToPush.customer_name}</div>
                  <div className="font-medium">Company:</div>
                  <div>{orderToPush.customer_company}</div>
                  <div className="font-medium">Items:</div>
                  <div className="group relative">
                    {orderToPush.items.length} items
                    {orderToPush.items.length > 0 && (
                      <div className="absolute z-50 invisible group-hover:visible bg-white shadow-lg rounded-md p-3 w-64 mt-1 left-0">
                        <div className="text-sm font-medium mb-1">Products:</div>
                        <ul className="space-y-1">
                          {orderToPush.items.map((item: any, idx: number) => (
                            <li key={idx} className="text-sm">
                              {productData[item.product_id]?.name || 'Unknown Product'} <span className="font-medium">({item.quantity})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t pt-2">
                  <p className="text-sm text-muted-foreground">
                    This action will create a stock-out request for the warehouse team and link it to this order.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPushDialogOpen(false)} disabled={pushToStockOut.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={() => orderToPush && handlePushToStockOut(orderToPush)}
              disabled={pushToStockOut.isPending}
              className="flex items-center gap-2"
            >
              {pushToStockOut.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {pushToStockOut.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersManagement;
