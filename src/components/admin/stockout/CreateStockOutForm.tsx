import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatabaseTables } from '@/types/supabase';

type StockOutRequest = DatabaseTables['stock_out_requests']['Row'];
type Product = DatabaseTables['products']['Row'];
type Warehouse = DatabaseTables['warehouses']['Row'];
type Customer = DatabaseTables['customers']['Row'];

interface CreateStockOutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  initialBarcode?: string | null;
}

export const CreateStockOutForm: React.FC<CreateStockOutFormProps> = ({
  open,
  onOpenChange,
  userId,
  initialBarcode,
}) => {
  const [formData, setFormData] = useState<Omit<StockOutRequest, 'id' | 'created_at' | 'created_by' | 'status'>>({
    product_id: '',
    warehouse_id: '',
    customer_id: null,
    quantity: 0,
    destination: '',
    notes: null,
    approved_by: null,
    approved_at: null,
    approved_quantity: null,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouses
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // If initialBarcode is provided, find the corresponding product
  useEffect(() => {
    if (initialBarcode && products) {
      const product = products.find(p => p.sku === initialBarcode);
      if (product) {
        setFormData(prev => ({ ...prev, product_id: product.id }));
      }
    }
  }, [initialBarcode, products]);

  const createStockOutMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data, error } = await supabase
        .from('stock_out_requests')
        .insert({
          ...formData,
          status: 'pending',
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockOutRequests'] });
      toast({
        title: 'Stock out request created',
        description: 'The stock out request has been created successfully.',
      });
      onOpenChange(false);
      setFormData({
        product_id: '',
        warehouse_id: '',
        customer_id: null,
        quantity: 0,
        destination: '',
        notes: null,
        approved_by: null,
        approved_at: null,
        approved_quantity: null,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating stock out request',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStockOutMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Stock Out Request</DialogTitle>
          <DialogDescription>
            Create a new stock out request for processing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.code && `(${warehouse.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer (Optional)</Label>
              <Select
                value={formData.customer_id || ''}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.company && `(${customer.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createStockOutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.product_id ||
                !formData.warehouse_id ||
                formData.quantity <= 0 ||
                !formData.destination ||
                createStockOutMutation.isPending
              }
            >
              {createStockOutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Stock Out'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 