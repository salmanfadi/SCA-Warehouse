import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useReserveStock } from '@/hooks/useReserveStock';
import { useProducts } from '@/hooks/useProducts';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useInventoryData } from '@/hooks/useInventoryData';

const ReserveStock: React.FC = () => {
  const navigate = useNavigate();
  const { 
    reserveStockItems, 
    isLoading: isLoadingReserveStock,
    createReserveStock,
    cancelReserveStock,
    pushToStockOut
  } = useReserveStock();

  const { products, isLoading: isLoadingProducts } = useProducts();
  const { warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryData();

  // State for creating a new reservation
  const [newReservation, setNewReservation] = useState({
    product_id: '',
    quantity: '',
    customer_name: '',
    start_date: '',
    end_date: '',
    warehouse_id: ''
  });

  // State for product search
  const [productNameInput, setProductNameInput] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState(products || []);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Get available quantity for selected product and warehouse
  const getAvailableQuantity = () => {
    if (!selectedProduct || !newReservation.warehouse_id || !inventoryData) return null;
    
    const inventoryItem = inventoryData.find(
      item => item.product_id === selectedProduct.id && 
              item.warehouse_id === newReservation.warehouse_id
    );
    
    return inventoryItem?.available_quantity || 0;
  };

  // Filter products based on input
  useEffect(() => {
    if (productNameInput && products) {
      const lowerCaseInput = productNameInput.toLowerCase();
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(lowerCaseInput) ||
        (product.sku && product.sku.toLowerCase().includes(lowerCaseInput))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products || []);
    }
  }, [productNameInput, products]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'quantity') {
      const availableQty = getAvailableQuantity();
      const numValue = parseInt(value);
      
      if (numValue > availableQty!) {
        toast({
          title: 'Invalid Quantity',
          description: `Maximum available quantity is ${availableQty}`,
          variant: 'destructive'
        });
        return;
      }
    }
    
    setNewReservation(prev => ({ ...prev, [name]: value }));
  };

  // Handle warehouse selection
  const handleWarehouseChange = (value: string) => {
    setNewReservation(prev => ({ ...prev, warehouse_id: value, quantity: '' }));
  };

  // Handle product selection
  const handleProductSelect = (product: any) => {
    setProductNameInput(product.name);
    setNewReservation(prev => ({ ...prev, product_id: product.id, quantity: '' }));
    setSelectedProduct(product);
    setIsProductDropdownOpen(false);
  };

  // Handle form submission
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReservation.product_id || !newReservation.warehouse_id) {
      toast({
        title: 'Error',
        description: 'Please select a product and warehouse.',
        variant: 'destructive'
      });
      return;
    }

    const quantity = parseInt(newReservation.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quantity.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createReserveStock.mutateAsync({
        ...newReservation,
        quantity: parseInt(newReservation.quantity)
      });
      
      // Reset form
      setNewReservation({
        product_id: '',
        quantity: '',
        customer_name: '',
        start_date: '',
        end_date: '',
        warehouse_id: ''
      });
      setProductNameInput('');
      setSelectedProduct(null);
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create reservation',
        variant: 'destructive'
      });
    }
  };

  // Handle cancellation
  const handleCancelReservation = async (id: string) => {
    try {
      await cancelReserveStock.mutateAsync(id);
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel reservation',
        variant: 'destructive'
      });
    }
  };

  // Handle push to stock out
  const handlePushToStockOut = async (id: string) => {
    try {
      await pushToStockOut.mutateAsync(id);
    } catch (error: any) {
      console.error('Error pushing to stock out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to push to stock out',
        variant: 'destructive'
      });
    }
  };

  if (isLoadingReserveStock || isLoadingProducts || isLoadingWarehouses || isLoadingInventory) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const availableQuantity = getAvailableQuantity();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserve Stock"
        description="Create and manage reserved stock for specific customers"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/manager')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Create Reservation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Reservation</CardTitle>
          <CardDescription>Enter Reservation Details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateReservation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productNameInput">Product*</Label>
              <div className="relative">
                <Input
                  id="productNameInput"
                  value={productNameInput}
                  onChange={(e) => setProductNameInput(e.target.value)}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  placeholder="Search for a product"
                  required
                />
                {isProductDropdownOpen && filteredProducts.length > 0 && (
                  <ul className="absolute z-10 w-full bg-popover border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {filteredProducts.map((product) => (
                      <li
                        key={product.id}
                        className="px-4 py-2 cursor-pointer hover:bg-accent"
                        onMouseDown={() => handleProductSelect(product)}
                      >
                        {product.name} {product.sku && `(${product.sku})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse_id">Warehouse*</Label>
              <Select
                value={newReservation.warehouse_id}
                onValueChange={handleWarehouseChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity* {availableQuantity !== null && (
                  <span className="text-sm text-muted-foreground">
                    (Available: {availableQuantity})
                  </span>
                )}
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max={availableQuantity || undefined}
                value={newReservation.quantity}
                onChange={handleInputChange}
                required
                disabled={!selectedProduct || !newReservation.warehouse_id}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name*</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={newReservation.customer_name}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="start_date">Start Date*</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={newReservation.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="end_date">End Date*</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={newReservation.end_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={createReserveStock.isPending || !availableQuantity}
            >
              {createReserveStock.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Reservation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reserved Items Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reserved Items</CardTitle>
          <CardDescription>List of currently reserved stock items.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reserved For</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!reserveStockItems?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No reserved items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reserveStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product.name}
                        {item.product.sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.product.sku}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell>{format(new Date(item.start_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(item.end_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'active' ? 'default' :
                            item.status === 'expired' ? 'destructive' :
                            item.status === 'cancelled' ? 'secondary' :
                            'outline'
                          }
                        >
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePushToStockOut(item.id)}
                              disabled={pushToStockOut.isPending}
                            >
                              {pushToStockOut.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Push to Stock Out
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelReservation(item.id)}
                              disabled={cancelReserveStock.isPending}
                            >
                              {cancelReserveStock.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Cancel
                            </Button>
                          </>
                        )}
                        {(item.status === 'expired' || item.status === 'cancelled' || item.status === 'processed') && (
                          <span className="text-sm text-muted-foreground">No actions available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReserveStock; 