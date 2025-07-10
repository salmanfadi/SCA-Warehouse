import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BatchFormData, ProcessedBatch } from '@/types/batchStockIn';
import { generateBarcodeString } from '@/utils/barcodeUtils';
import { Product, Warehouse } from '@/types/database';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Package, Save, X, InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { StockInData } from '@/hooks/useStockInBoxes';

type WarehouseLocationRow = {
  id: string;
  warehouse_id: string;
  zone: string;
  floor: string;
};

interface BatchFormProps {
  onAddBatch: (batchData: BatchFormData) => void;
  isSubmitting?: boolean;
  editingBatch?: ProcessedBatch;
  onCancel?: () => void;
  maxBoxes?: number;
  stockInData?: StockInData | null;
}

export const BatchForm: React.FC<BatchFormProps> = ({ 
  onAddBatch, 
  isSubmitting = false,
  editingBatch,
  onCancel,
  maxBoxes,
  stockInData
}) => {
  // Initialize batch data with default values
  const [batchData, setBatchData] = useState<BatchFormData>({
    product: null,
    warehouse: null,
    location: null,
    boxes_count: editingBatch ? editingBatch.boxes_count : undefined,
    quantity_per_box: 10,
    color: '',
    size: ''
  });

  // Set form data when editing an existing batch or when stockInData is available
  useEffect(() => {
    if (editingBatch) {
      setBatchData({
        product: editingBatch.product || null,
        warehouse: editingBatch.warehouse || null,
        location: editingBatch.warehouseLocation || null,
        boxes_count: editingBatch.boxes_count,
        quantity_per_box: editingBatch.quantity_per_box,
        color: editingBatch.color || '',
        size: editingBatch.size || ''
      });
    } else if (stockInData?.product && (!batchData.product || Object.keys(batchData.product).length === 0)) {
      // Set product from stockInData if available and product is not already set
      console.log('Setting product from stockInData:', stockInData.product);
      setBatchData(prev => ({
        ...prev,
        product: stockInData.product as Product
      }));
    }
  }, [editingBatch, stockInData, batchData.product]);

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('is_active.eq.true,active.eq.true')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch warehouses
  const { data: warehouses, isLoading: isLoadingWarehouses, error: warehousesError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Warehouse[];
    }
  });

  // Debugging: log warehouses
  console.log('Warehouses loaded:', warehouses, 'Error:', warehousesError);

  // Fetch locations based on selected warehouse
  const { data: locations, isLoading: isLoadingLocations, error: locationsError } = useQuery({
    queryKey: ['locations', batchData.warehouse?.id],
    queryFn: async () => {
      if (!batchData.warehouse?.id) {
        console.log('No warehouse selected');
        return [];
      }
      
      console.log('Fetching locations for warehouse:', batchData.warehouse.id);
      try {
        const { data, error } = await supabase
          .from('warehouse_locations')
          .select('id, warehouse_id, zone, floor')
          .eq('warehouse_id', batchData.warehouse.id)
          .order('zone')
          .order('floor');
        
        if (error) {
          console.error('Error fetching locations:', error);
          throw error;
        }
        
        console.log('Successfully fetched locations:', data);
        return data as WarehouseLocationRow[];
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        throw error;
      }
    },
    enabled: !!batchData.warehouse?.id
  });

  const handleChange = (field: keyof BatchFormData, value: any) => {
    setBatchData(prev => ({
      ...prev,
      [field]: value
    }));

    // If warehouse changes, reset location
    if (field === 'warehouse') {
      setBatchData(prev => ({
        ...prev,
        warehouse: value,
        location: null
      }));
    }
  };

  const handleProductChange = (productId: string) => {
    const selectedProduct = products?.find(p => p.id === productId) || null;
    handleChange('product', selectedProduct);
  };

  const handleWarehouseChange = (warehouseId: string) => {
    const selectedWarehouse = warehouses?.find(w => w.id === warehouseId) || null;
    handleChange('warehouse', selectedWarehouse);
  };

  const handleLocationChange = (locationId: string) => {
    const selectedLocation = locations?.find(l => l.id === locationId) || null;
    handleChange('location', selectedLocation);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate box count if maxBoxes is provided
    if (
      batchData.boxes_count === undefined ||
      batchData.boxes_count === null ||
      isNaN(Number(batchData.boxes_count)) ||
      batchData.boxes_count < 1 ||
      (maxBoxes !== undefined && batchData.boxes_count > maxBoxes && !editingBatch)
    ) {
      toast.error(`Please enter a valid number of boxes (1 or more, up to ${maxBoxes ?? 'N/A'}).`);
      return;
    }
    
    onAddBatch(batchData);
    
    // Reset form if not editing
    if (!editingBatch) {
      setBatchData({
        product: stockInData?.product as Product || batchData.product, // Keep the product selected
        warehouse: batchData.warehouse, // Keep the warehouse selected
        location: batchData.location, // Keep the location selected
        boxes_count: undefined,
        quantity_per_box: 10,
        color: '',
        size: ''
      });
    }
  };

  const isFormValid = 
    batchData.product !== null && 
    batchData.warehouse !== null && 
    batchData.location !== null && 
    batchData.boxes_count > 0 && 
    batchData.quantity_per_box > 0;

  // Debugging logs to trace product selection
  console.log('Current batch data product:', batchData.product);
  console.log('StockInData product:', stockInData?.product);
  console.log('Is product field disabled:', isLoadingProducts || isSubmitting || !!stockInData?.product?.id || !!editingBatch);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          {editingBatch ? "Edit Batch" : "Create New Batch"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select 
              onValueChange={handleProductChange} 
              disabled={isLoadingProducts || isSubmitting || !!editingBatch}
              value={batchData.product?.id || ''}
              defaultValue={stockInData?.product?.id}
            >
              <SelectTrigger id="product" className={!batchData.product && !!stockInData?.product ? "border-blue-500 ring-1 ring-blue-500" : ""}>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingProducts ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading products...
                  </SelectItem>
                ) : (
                  products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {stockInData?.product && (
              <p className="text-xs text-muted-foreground mt-1">
                Using product from stock-in request: {stockInData.product.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="boxes_count">Number of Boxes</Label>
                {maxBoxes !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    Max: {maxBoxes}
                  </span>
                )}
              </div>
              <Input
                id="boxes_count"
                type="number"
                min={1}
                max={maxBoxes !== undefined ? maxBoxes : undefined}
                value={batchData.boxes_count === undefined ? '' : batchData.boxes_count}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange('boxes_count', val === '' ? undefined : parseInt(val));
                }}
                disabled={isSubmitting || !!editingBatch}
                placeholder="Enter number of boxes"
                className={maxBoxes !== undefined && batchData.boxes_count > maxBoxes ? "border-red-500" : ""}
              />
              {maxBoxes !== undefined && batchData.boxes_count > maxBoxes && !editingBatch && (
                <div className="text-xs text-red-500 flex items-center mt-1">
                  <InfoIcon className="h-3 w-3 mr-1" />
                  Exceeds available box count
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_per_box">Quantity per Box</Label>
              <Input
                id="quantity_per_box"
                type="number"
                min={1}
                value={batchData.quantity_per_box}
                onChange={(e) => handleChange('quantity_per_box', parseInt(e.target.value) || 1)}
                disabled={isSubmitting || !!editingBatch}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select 
              onValueChange={handleWarehouseChange} 
              disabled={isLoadingWarehouses || isSubmitting || !!editingBatch}
              value={batchData.warehouse?.id || ''}
            >
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingWarehouses ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading warehouses...
                  </SelectItem>
                ) : warehousesError ? (
                  <SelectItem value="error" disabled>
                    Error loading warehouses
                  </SelectItem>
                ) : warehouses && warehouses.length > 0 ? (
                  warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No warehouses found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select 
              onValueChange={handleLocationChange} 
              disabled={!batchData.warehouse || isLoadingLocations || isSubmitting || !!editingBatch}
              value={batchData.location?.id || ''}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder={!batchData.warehouse ? "Select warehouse first" : "Select location"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingLocations ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading locations...
                  </SelectItem>
                ) : locationsError ? (
                  <SelectItem value="error" disabled>
                    Error loading locations
                  </SelectItem>
                ) : locations && locations.length > 0 ? (
                  locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.zone}, {location.floor}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    {batchData.warehouse ? "No locations found for this warehouse" : "Select a warehouse first"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {locationsError && (
              <p className="text-sm text-red-500 mt-1">
                Failed to load locations. Please try again.
              </p>
            )}
            {batchData.warehouse && locations && locations.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No locations available for {batchData.warehouse.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color (Optional)</Label>
              <Input
                id="color"
                value={batchData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="e.g. Red"
                disabled={isSubmitting || !!editingBatch}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Size (Optional)</Label>
              <Input
                id="size"
                value={batchData.size}
                onChange={(e) => handleChange('size', e.target.value)}
                placeholder="e.g. Large"
                disabled={isSubmitting || !!editingBatch}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!isFormValid || isSubmitting}
            className={onCancel ? "ml-2" : "w-full"}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : editingBatch ? (
              <Save className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {editingBatch ? "Update Batch" : "Add Batch"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
