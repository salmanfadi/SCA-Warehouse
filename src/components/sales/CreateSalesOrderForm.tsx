
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { SalesOrderItem } from '@/hooks/useSalesOrders';

interface CreateSalesOrderFormProps {
  onSubmit: (orderData: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialInquiry?: any;
}

export const CreateSalesOrderForm: React.FC<CreateSalesOrderFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialInquiry
}) => {
  const [customerName, setCustomerName] = useState(initialInquiry?.customer_name || '');
  const [customerEmail, setCustomerEmail] = useState(initialInquiry?.customer_email || '');
  const [customerCompany, setCustomerCompany] = useState(initialInquiry?.customer_company || '');
  const [customerPhone, setCustomerPhone] = useState(initialInquiry?.customer_phone || '');
  const [items, setItems] = useState<SalesOrderItem[]>(
    initialInquiry?.items?.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      requirements: item.specific_requirements || '',
      product: item.product,
    })) || [{ product_id: '', quantity: 1, requirements: '' }]
  );

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, hsn_code, gst_rate')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, requirements: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SalesOrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If product is selected, update product details
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        updatedItems[index].product = selectedProduct;
      }
    }
    
    setItems(updatedItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      return;
    }

    // Calculate total amount as 0 since prices are not collected
    const totalAmount = 0;

    onSubmit({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_company: customerCompany,
      customer_phone: customerPhone,
      order_date: new Date().toISOString(),
      total_amount: totalAmount,
      status: 'pending',
      inquiry_id: initialInquiry?.id,
      items: validItems,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerCompany">Company *</Label>
              <Input
                id="customerCompany"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Order Items
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div className="md:col-span-2">
                <Label>Product *</Label>
                <Select
                  value={item.product_id}
                  onValueChange={(value) => updateItem(index, 'product_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.sku && `(${product.sku})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Requirements</Label>
                <Textarea
                  value={item.requirements || ''}
                  onChange={(e) => updateItem(index, 'requirements', e.target.value)}
                  placeholder="Special requirements..."
                  rows={2}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Sales Order'}
        </Button>
      </div>
    </form>
  );
};
