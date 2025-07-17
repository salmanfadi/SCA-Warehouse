import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useReserveStockOut } from '@/hooks/useReserveStockOut';

interface DummyProduct {
  id: string;
  name: string;
  sku?: string;
}

interface ReservedItem {
  id: string;
  product: DummyProduct;
  quantity: number;
  customer: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Expired' | 'Cancelled' | 'Processing Stock Out';
}

const ReserveStock: React.FC = () => {
  const navigate = useNavigate();
  const reserveStockOut = useReserveStockOut((id) => {
    setReservedItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'Processing Stock Out' } : item
    ));
  });

  // Dummy product data for the combobox
  const dummyProducts: DummyProduct[] = [
    { id: 'prod-1', name: 'Laptop Pro X', sku: 'LPX-2023' },
    { id: 'prod-2', name: 'Wireless Mouse', sku: 'WM-500' },
    { id: 'prod-3', name: 'Mechanical Keyboard', sku: 'MK-Brown' },
    { id: 'prod-4', name: 'USB-C Hub', sku: 'UCH-MULTI' },
    { id: 'prod-5', name: 'Monitor Stand', sku: 'MS-ADJ' },
  ];

  // State for creating a new reservation
  const [newReservation, setNewReservation] = useState({
    productId: '',
    quantity: 0,
    customer: '',
    startDate: '',
    endDate: '',
  });

  // State for the product name combobox (create form)
  const [productNameInput, setProductNameInput] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<DummyProduct[]>(dummyProducts);
  const [selectedProduct, setSelectedProduct] = useState<DummyProduct | null>(null);

  // State for the list of reserved items (dummy data)
  const [reservedItems, setReservedItems] = useState<ReservedItem[]>([
    {
      id: 'res-1',
      product: { id: 'prod-1', name: 'Laptop Pro X' },
      quantity: 5,
      customer: 'John Doe',
      startDate: '2024-07-20',
      endDate: '2024-08-20',
      status: 'Active',
    },
    {
      id: 'res-2',
      product: { id: 'prod-2', name: 'Wireless Mouse' },
      quantity: 10,
      customer: 'Jane Smith',
      startDate: '2024-07-10',
      endDate: '2024-07-15',
      status: 'Expired',
    },
  ]);

  // Filter products based on input when productNameInput changes
  useEffect(() => {
    if (productNameInput) {
      const lowerCaseInput = productNameInput.toLowerCase();
      const filtered = dummyProducts.filter(product =>
        product.name.toLowerCase().includes(lowerCaseInput) ||
        (product.sku && product.sku.toLowerCase().includes(lowerCaseInput))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(dummyProducts);
    }
  }, [productNameInput, dummyProducts]);

  // Handle input changes for new reservation form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewReservation(prev => ({ ...prev, [name]: value }));
  };

  // Handle product name input change for combobox
  const handleProductNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProductNameInput(value);
    setSelectedProduct(null);
    setIsProductDropdownOpen(true);
    setNewReservation(prev => ({ ...prev, productId: '', name: value }));
  };

  // Handle product selection from combobox
  const handleProductSelect = (product: DummyProduct) => {
    setProductNameInput(product.name);
    setSelectedProduct(product);
    setNewReservation(prev => ({ ...prev, productId: product.id, name: product.name }));
    setIsProductDropdownOpen(false);
  };

  // Handle creating a new reservation (dummy logic)
  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || newReservation.quantity <= 0 || !newReservation.customer || !newReservation.startDate || !newReservation.endDate) {
      alert('Please fill in all required fields (Product, Quantity, Customer, Dates).');
      return;
    }

    const id = `res-${Date.now()}`;
    const newReservedItem: ReservedItem = {
      id,
      product: selectedProduct,
      quantity: newReservation.quantity,
      customer: newReservation.customer,
      startDate: newReservation.startDate,
      endDate: newReservation.endDate,
      status: 'Active',
    };

    setReservedItems(prev => [...prev, newReservedItem]);
    // Reset form
    setNewReservation({ productId: '', quantity: 0, customer: '', startDate: '', endDate: '' });
    setProductNameInput('');
    setSelectedProduct(null);
    alert('Reservation created (dummy data)!');
  };

  // Check for expired reservations
  useEffect(() => {
    const checkExpiredReservations = () => {
      const now = new Date();
      setReservedItems(prev => {
        const updated = prev.map(item => {
          if (item.status === 'Active' && new Date(item.endDate) < now) {
            return { ...item, status: 'Expired' as const };
          }
          return item;
        });
        
        // Only update state if there are actual changes
        const hasChanges = updated.some(
          (item, index) => item.status !== prev[index].status
        );
        return hasChanges ? updated : prev;
      });
    };

    // Check immediately
    checkExpiredReservations();

    // Set up interval for future checks
    const interval = setInterval(checkExpiredReservations, 60000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array since we're not using any external values

  // Basic action handlers
  const handleCancelReservation = (id: string) => {
    setReservedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Cancelled' };
      }
      return item;
    }));
  };

  const handlePushToStockOut = (id: string) => {
    const itemToPush = reservedItems.find(item => item.id === id);
    if (!itemToPush) return;

    // Create stock out request with proper structure
    reserveStockOut.mutate({
      product_id: itemToPush.product.id,
      quantity: itemToPush.quantity,
      destination: itemToPush.customer,
      reservation_id: id
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reserve Stock"
        description="Create and manage reserved stock for specific customers"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/operator')}
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
                  name="productNameInput"
                  value={productNameInput}
                  onChange={handleProductNameInputChange}
                  onFocus={() => setIsProductDropdownOpen(true)}
                  onBlur={() => setIsProductDropdownOpen(false)}
                  placeholder="Search or select product"
                  required
                />
                {isProductDropdownOpen && filteredProducts.length > 0 && (
                  <ul className="absolute z-10 w-full bg-popover border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground">
                    {filteredProducts.map(product => (
                      <li
                        key={product.id}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        onMouseDown={() => handleProductSelect(product)}
                      >
                        {product.name} {product.sku && `(${product.sku})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedProduct && (
                <p className="text-sm text-muted-foreground">Selected: {selectedProduct.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity*</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={newReservation.quantity}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer Name/ID*</Label>
              <Input
                id="customer"
                name="customer"
                value={newReservation.customer}
                onChange={handleInputChange}
                placeholder="Enter customer name or ID"
                required
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="startDate">Start Date*</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={newReservation.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="endDate">End Date*</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={newReservation.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <Button type="submit">
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
                {reservedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No reserved items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reservedItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.customer}</TableCell>
                      <TableCell>{format(new Date(item.startDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(item.endDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <span>{item.status}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.status === 'Active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handlePushToStockOut(item.id)}>
                              Push to Stock Out
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleCancelReservation(item.id)}>
                              Cancel
                            </Button>
                          </>
                        )}
                        {(item.status === 'Expired' || item.status === 'Cancelled') && (
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