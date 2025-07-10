
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
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
import { useTransfers, TransferFormData } from '@/hooks/useTransfers';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useLocations } from '@/hooks/useLocations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TransferForm: React.FC = () => {
  const { createTransfer } = useTransfers();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TransferFormData>();
  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.warehouses;
  const isWarehousingLoading = warehousesQuery.isLoading;
  
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  
  // Get locations based on selected warehouses
  const fromLocationsQuery = useLocations(fromWarehouseId);
  const toLocationsQuery = useLocations(toWarehouseId);
  const fromLocations = fromLocationsQuery.locations;
  const toLocations = toLocationsQuery.locations;
  const fromLocationsLoading = fromLocationsQuery.isLoading;
  const toLocationsLoading = toLocationsQuery.isLoading;
  
  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku');
        
      if (error) throw error;
      return data;
    },
  });
  
  // Update the form when warehouse selections change
  useEffect(() => {
    register('product_id', { required: 'Product is required' });
    register('source_warehouse_id', { required: 'Source warehouse is required' });
    register('destination_warehouse_id', { required: 'Destination warehouse is required' });
    register('source_location_id', { required: 'Source location is required' });
    register('destination_location_id', { required: 'Destination location is required' });
    register('quantity', { 
      required: 'Quantity is required',
      min: { value: 1, message: 'Quantity must be at least 1' }
    });
  }, [register]);
  
  const handleFromWarehouseChange = (value: string) => {
    setFromWarehouseId(value);
    setValue('source_warehouse_id', value);
    setValue('source_location_id', ''); // Reset location when warehouse changes
  };
  
  const handleToWarehouseChange = (value: string) => {
    setToWarehouseId(value);
    setValue('destination_warehouse_id', value);
    setValue('destination_location_id', ''); // Reset location when warehouse changes
  };
  
  const onSubmit = (data: TransferFormData) => {
    createTransfer.mutate(data, {
      onSuccess: () => {
        reset(); // Reset form on success
        setFromWarehouseId('');
        setToWarehouseId('');
      }
    });
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Initiate Inventory Transfer</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id">Product</Label>
            <Select onValueChange={(value) => setValue('product_id', value)}>
              <SelectTrigger id="product_id">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {productsLoading ? (
                  <SelectItem value="loading" disabled>Loading products...</SelectItem>
                ) : products && products.length > 0 ? (
                  products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-products" disabled>No products available</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.product_id && (
              <p className="text-sm text-red-500">{errors.product_id.message}</p>
            )}
          </div>
          
          {/* Source Warehouse and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source_warehouse_id">From Warehouse</Label>
              <Select onValueChange={handleFromWarehouseChange}>
                <SelectTrigger id="source_warehouse_id">
                  <SelectValue placeholder="Select source warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {isWarehousingLoading ? (
                    <SelectItem value="loading" disabled>Loading warehouses...</SelectItem>
                  ) : warehouses && warehouses.length > 0 ? (
                    warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-warehouses" disabled>No warehouses available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.source_warehouse_id && (
                <p className="text-sm text-red-500">{errors.source_warehouse_id.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source_location_id">From Location</Label>
              <Select 
                disabled={!fromWarehouseId} 
                onValueChange={(value) => setValue('source_location_id', value)}
              >
                <SelectTrigger id="source_location_id">
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  {fromLocationsLoading ? (
                    <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                  ) : fromLocations && fromLocations.length > 0 ? (
                    fromLocations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        Floor {location.floor}, Zone {location.zone}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-locations" disabled>
                      {fromWarehouseId ? 'No locations in this warehouse' : 'Select a warehouse first'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.source_location_id && (
                <p className="text-sm text-red-500">{errors.source_location_id.message}</p>
              )}
            </div>
          </div>
          
          {/* Destination Warehouse and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination_warehouse_id">To Warehouse</Label>
              <Select onValueChange={handleToWarehouseChange}>
                <SelectTrigger id="destination_warehouse_id">
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {isWarehousingLoading ? (
                    <SelectItem value="loading" disabled>Loading warehouses...</SelectItem>
                  ) : warehouses && warehouses.length > 0 ? (
                    warehouses.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-warehouses" disabled>No warehouses available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.destination_warehouse_id && (
                <p className="text-sm text-red-500">{errors.destination_warehouse_id.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="destination_location_id">To Location</Label>
              <Select 
                disabled={!toWarehouseId} 
                onValueChange={(value) => setValue('destination_location_id', value)}
              >
                <SelectTrigger id="destination_location_id">
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent>
                  {toLocationsLoading ? (
                    <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                  ) : toLocations && toLocations.length > 0 ? (
                    toLocations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        Floor {location.floor}, Zone {location.zone}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-locations" disabled>
                      {toWarehouseId ? 'No locations in this warehouse' : 'Select a warehouse first'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.destination_location_id && (
                <p className="text-sm text-red-500">{errors.destination_location_id.message}</p>
              )}
            </div>
          </div>
          
          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              min={1}
              {...register('quantity', { 
                required: 'Quantity is required',
                min: { value: 1, message: 'Quantity must be at least 1' },
                valueAsNumber: true
              })}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>
          
          {/* Transfer Reason */}
          <div className="space-y-2">
            <Label htmlFor="transfer_reason">Transfer Reason (Optional)</Label>
            <Input
              id="transfer_reason" 
              placeholder="Reason for transfer"
              {...register('transfer_reason')}
            />
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Add any additional notes about this transfer"
              {...register('notes')}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={createTransfer.isPending}
          >
            {createTransfer.isPending ? 'Submitting...' : 'Submit Transfer Request'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TransferForm;
