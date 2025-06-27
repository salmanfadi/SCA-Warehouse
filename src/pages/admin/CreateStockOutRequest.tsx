import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface StockOutFormData {
  customer: CustomerDetails;
  product_id: string;
  quantity: number;
  destination: string;
  notes: string;
  warehouse_id: string;
}

const generateDocumentNumber = (prefix: string) => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

const CreateStockOutRequest: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<StockOutFormData>({
    customer: {
      name: '',
      email: '',
      phone: '',
      company: '',
    },
    product_id: '',
    quantity: 0,
    destination: '',
    notes: '',
    warehouse_id: '',
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('is_active.eq.true,active.eq.true');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses
  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Check available quantity for selected product
  const { data: availableQuantity, isLoading: quantityLoading } = useQuery({
    queryKey: ['available-quantity', formData.product_id, formData.warehouse_id],
    queryFn: async () => {
      if (!formData.product_id || !formData.warehouse_id) return 0;

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', formData.product_id)
        .eq('warehouse_id', formData.warehouse_id)
        .eq('status', 'available');
      
      if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }

      // Calculate total available quantity
      const total = data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      return total;
    },
    enabled: !!formData.product_id && !!formData.warehouse_id,
  });

  // Create stock out request mutation
  const createStockOut = useMutation({
    mutationFn: async (data: StockOutFormData) => {
      // First check if we have enough quantity
      if (!availableQuantity || data.quantity > availableQuantity) {
        throw new Error('Requested quantity exceeds available stock');
      }

      // Generate document numbers
      const invoiceNumber = generateDocumentNumber('INV');
      const packingSlipNumber = generateDocumentNumber('PKG');

      const { data: stockOut, error } = await supabase
        .from('stock_out')
        .insert([
          {
            requested_by: user?.id,
            product_id: data.product_id,
            quantity: data.quantity,
            destination: data.destination,
            notes: data.notes,
            status: 'pending',
            customer_name: data.customer.name,
            customer_email: data.customer.email,
            customer_phone: data.customer.phone,
            customer_company: data.customer.company,
            invoice_number: invoiceNumber,
            packing_slip_number: packingSlipNumber,
            warehouse_id: data.warehouse_id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating stock out request:', error);
        throw error;
      }
      return stockOut;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Stock out request created successfully',
      });
      navigate('/admin/stock-out');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create stock out request',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customer.name || !formData.warehouse_id || !formData.product_id || !formData.quantity || !formData.destination) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    await createStockOut.mutateAsync(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    if (field.startsWith('customer.')) {
      const customerField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          [customerField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const isLoading = productsLoading || warehousesLoading || quantityLoading || createStockOut.isPending;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Create Stock Out Request" 
        description="Create a new stock out request for customer orders"
      />

      <Card>
        <CardHeader>
          <CardTitle>Stock Out Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customer.name}
                    onChange={(e) => handleInputChange('customer.name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerCompany">Company</Label>
                  <Input
                    id="customerCompany"
                    value={formData.customer.company}
                    onChange={(e) => handleInputChange('customer.company', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customer.email}
                    onChange={(e) => handleInputChange('customer.email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customer.phone}
                    onChange={(e) => handleInputChange('customer.phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Order Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warehouse">Warehouse *</Label>
                  <Select
                    value={formData.warehouse_id}
                    onValueChange={(value) => handleInputChange('warehouse_id', value)}
                    required
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
                <div>
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => handleInputChange('product_id', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={availableQuantity}
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                      required
                    />
                    {availableQuantity !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        Available: {availableQuantity}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="destination">Destination *</Label>
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="h-24"
                placeholder="Add any special instructions or notes for the field operator"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/stock-out')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || formData.quantity > (availableQuantity || 0)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateStockOutRequest; 