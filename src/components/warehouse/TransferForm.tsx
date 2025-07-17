
import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductWithQuantity {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
}

interface InventoryWithWarehouseAndLocation {
  quantity: number;
  warehouses: {
    id: string;
    name: string;
  };
  warehouse_locations: {
    id: string;
    floor: number;
    zone: string;
  } | null;
}

interface WarehouseWithStock {
  id: string;
  name: string;
  quantity: number;
  locations: {
    id: string;
    floor: number;
    zone: string;
    quantity: number;
  }[];
}

interface InventoryWithProduct {
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    sku: string | null;
  };
}

interface BoxWithDetails {
  id: string;
  barcode: string;
  quantity: number;
  batch_id: string;
  status: string;
  processed_batches: {
    id: string;
    product_id: string;
    warehouse_id: string;
    location_id: string;
  };
}

export const TransferForm: React.FC = () => {
  const { createTransfer } = useTransfers();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TransferFormData>();
  const selectedProductId = watch('product_id');
  const selectedSourceWarehouseId = watch('source_warehouse_id');
  const selectedSourceLocationId = watch('source_location_id');
  
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);

  // Fetch all products with their quantities
  const { data: productsWithQuantity, isLoading: isLoadingProducts } = useQuery<ProductWithQuantity[]>({
    queryKey: ['products-with-quantity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            sku
          )
        `);

      if (error) throw error;

      // Group by product and sum quantities
      const productMap = new Map<string, ProductWithQuantity>();
      (data as unknown as InventoryWithProduct[]).forEach(item => {
        if (!item.products) return;
        const product = item.products;
        const existingQuantity = productMap.get(product.id)?.quantity || 0;
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: existingQuantity + (item.quantity || 0)
        });
      });

      return Array.from(productMap.values());
    }
  });

  // Fetch boxes for selected product and location
  const { data: availableBoxes = [], isLoading: isLoadingBoxes } = useQuery<BoxWithDetails[]>({
    queryKey: ['available-boxes', selectedProductId, selectedSourceWarehouseId, selectedSourceLocationId],
    queryFn: async () => {
      if (!selectedProductId || !selectedSourceWarehouseId || !selectedSourceLocationId) return [];

      const { data, error } = await supabase
        .from('batch_items')
        .select(`
          id,
          barcode,
          batch_id,
          quantity,
          status,
          product_id,
          warehouse_id,
          location_id
        `)
        .eq('status', 'available')
        .eq('product_id', selectedProductId)
        .eq('warehouse_id', selectedSourceWarehouseId)
        .eq('location_id', selectedSourceLocationId);

      if (error) throw error;

      // Transform the response to match BoxWithDetails type
      return data.map(item => ({
        id: item.id,
        barcode: item.barcode,
        batch_id: item.batch_id,
        quantity: item.quantity,
        status: item.status,
        processed_batches: {
          id: item.batch_id,
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          location_id: item.location_id
        }
      }));
    },
    enabled: !!(selectedProductId && selectedSourceWarehouseId && selectedSourceLocationId)
  });

  // Fetch warehouses and locations with stock for selected product
  const { data: warehousesWithStock, isLoading: isLoadingWarehouses } = useQuery<WarehouseWithStock[]>({
    queryKey: ['warehouses-with-product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];

      const { data, error } = await supabase
        .from('inventory')
        .select(`
          quantity,
          warehouses (
            id,
            name
          ),
          warehouse_locations (
            id,
            floor,
            zone
          )
        `)
        .eq('product_id', selectedProductId)
        .gt('quantity', 0);

      if (error) throw error;

      // Group by warehouse and sum quantities
      const warehouseMap = new Map<string, WarehouseWithStock>();
      (data as unknown as InventoryWithWarehouseAndLocation[]).forEach(item => {
        if (!item.warehouses) return;
        const warehouse = item.warehouses;
        const location = item.warehouse_locations;
        
        const existingWarehouse = warehouseMap.get(warehouse.id) || {
          id: warehouse.id,
          name: warehouse.name,
          quantity: 0,
          locations: []
        };

        if (location) {
          const existingLocation = existingWarehouse.locations.find(l => l.id === location.id);
          if (existingLocation) {
            existingLocation.quantity += item.quantity || 0;
          } else {
            existingWarehouse.locations.push({
              id: location.id,
              floor: location.floor,
              zone: location.zone,
              quantity: item.quantity || 0
            });
          }
        }
        
        existingWarehouse.quantity += item.quantity || 0;
        warehouseMap.set(warehouse.id, existingWarehouse);
      });

      return Array.from(warehouseMap.values());
    },
    enabled: !!selectedProductId
  });

  // Get all warehouses for destination selection
  const { warehouses: allWarehouses, isLoading: isLoadingAllWarehouses } = useWarehouses();

  // Get all locations for the selected destination warehouse
  const toLocationsQuery = useLocations(toWarehouseId);
  const toLocations = toLocationsQuery.locations;
  const isLoadingToLocations = toLocationsQuery.isLoading;

  // Filter source locations based on selected warehouse
  const availableSourceLocations = useMemo(() => {
    if (!fromWarehouseId || !warehousesWithStock) return [];
    const warehouse = warehousesWithStock.find(w => w.id === fromWarehouseId);
    return warehouse?.locations || [];
  }, [fromWarehouseId, warehousesWithStock]);

  const handleBoxSelectionChange = (boxId: string, selected: boolean) => {
    setSelectedBoxes(prev => 
      selected 
        ? [...prev, boxId]
        : prev.filter(id => id !== boxId)
    );
  };

  // Update the form when warehouse selections change
  useEffect(() => {
    register('product_id', { required: 'Product is required' });
    register('source_warehouse_id', { required: 'Source warehouse is required' });
    register('destination_warehouse_id', { required: 'Destination warehouse is required' });
    register('source_location_id', { required: 'Source location is required' });
    register('destination_location_id', { required: 'Destination location is required' });
    // register('quantity', { 
    //   required: 'Quantity is required',
    //   min: { value: 1, message: 'Quantity must be at least 1' }
    // });
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
    // Add selected boxes to the transfer data
    const transferData = {
      ...data,
      box_ids: selectedBoxes,
      quantity: availableBoxes
        .filter(box => selectedBoxes.includes(box.id))
        .reduce((sum, box) => sum + box.quantity, 0)
    };

    createTransfer.mutate(transferData, {
      onSuccess: () => {
        reset();
        setFromWarehouseId('');
        setToWarehouseId('');
        setSelectedBoxes([]);
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
                {isLoadingProducts ? (
                  <SelectItem value="loading" disabled>Loading products...</SelectItem>
                ) : productsWithQuantity && productsWithQuantity.length > 0 ? (
                  productsWithQuantity.map(product => (
                    <SelectItem 
                      key={product.id} 
                      value={product.id}
                      disabled={product.quantity === 0}
                    >
                      {product.name} {product.sku ? `(${product.sku})` : ''} - {product.quantity > 0 ? `${product.quantity} units` : 'Out of stock'}
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
                  {isLoadingWarehouses ? (
                    <SelectItem value="loading" disabled>Loading warehouses...</SelectItem>
                  ) : warehousesWithStock && warehousesWithStock.length > 0 ? (
                    warehousesWithStock.map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.quantity} units)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-warehouses" disabled>
                      {selectedProductId 
                        ? 'No warehouses have stock of this product' 
                        : 'Select a product first'}
                    </SelectItem>
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
                  {isLoadingWarehouses ? (
                    <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                  ) : availableSourceLocations.length > 0 ? (
                    availableSourceLocations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        Floor {location.floor}, Zone {location.zone} ({location.quantity} units)
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-locations" disabled>
                      {fromWarehouseId 
                        ? 'No locations have stock in this warehouse' 
                        : 'Select a warehouse first'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.source_location_id && (
                <p className="text-sm text-red-500">{errors.source_location_id.message}</p>
              )}
            </div>
          </div>

          {/* Box Selection */}
          {selectedSourceLocationId && (
            <div className="space-y-2">
              <Label>Select Boxes to Transfer</Label>
              <div className="space-y-2">
                <div className="p-2 border rounded-md bg-gray-50">
                  <div className="text-sm font-medium">
                    Total Selected: {selectedBoxes.length > 0 
                      ? availableBoxes
                          .filter(box => selectedBoxes.includes(box.id))
                          .reduce((sum, box) => sum + box.quantity, 0)
                      : 0} units
                  </div>
                </div>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {isLoadingBoxes ? (
                      <p className="text-sm text-gray-500">Loading boxes...</p>
                    ) : availableBoxes.length > 0 ? (
                      availableBoxes.map(box => (
                        <div key={box.id} className="flex items-center justify-between space-x-2 p-2 hover:bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`box-${box.id}`}
                              checked={selectedBoxes.includes(box.id)}
                              onCheckedChange={(checked) => handleBoxSelectionChange(box.id, checked as boolean)}
                            />
                            <Label htmlFor={`box-${box.id}`} className="text-sm">
                              {box.barcode}
                            </Label>
                          </div>
                          <span className="text-sm font-medium">{box.quantity} units</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No boxes available in this location</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          
          {/* Destination Warehouse and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination_warehouse_id">To Warehouse</Label>
              <Select onValueChange={handleToWarehouseChange}>
                <SelectTrigger id="destination_warehouse_id">
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingAllWarehouses ? (
                    <SelectItem value="loading" disabled>Loading warehouses...</SelectItem>
                  ) : allWarehouses && allWarehouses.length > 0 ? (
                    allWarehouses.map(warehouse => (
                      <SelectItem 
                        key={warehouse.id} 
                        value={warehouse.id}
                      >
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
                  {isLoadingToLocations ? (
                    <SelectItem value="loading" disabled>Loading locations...</SelectItem>
                  ) : toLocations && toLocations.length > 0 ? (
                    toLocations.map(location => (
                      <SelectItem 
                        key={location.id} 
                        value={location.id}
                        disabled={toWarehouseId === fromWarehouseId && location.id === watch('source_location_id')}
                      >
                        Floor {location.floor}, Zone {location.zone}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-locations" disabled>
                      {toWarehouseId 
                        ? 'No locations available in this warehouse' 
                        : 'Select a warehouse first'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.destination_location_id && (
                <p className="text-sm text-red-500">{errors.destination_location_id.message}</p>
              )}
            </div>
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
            disabled={createTransfer.isPending || selectedBoxes.length === 0}
          >
            {createTransfer.isPending ? 'Submitting...' : 'Submit Transfer Request'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TransferForm;
