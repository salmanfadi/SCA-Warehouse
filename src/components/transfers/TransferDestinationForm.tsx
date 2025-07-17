
import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Warehouse, Location } from '@/types/warehouse';
import { Box } from '@/types/stockout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
}

interface TransferDestinationFormProps {
  targetWarehouseId: string;
  setTargetWarehouseId: (id: string) => void;
  targetLocationId: string;
  setTargetLocationId: (id: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  warehouses: Warehouse[];
  warehousesLoading: boolean;
  locations: Location[];
  locationsLoading: boolean;
  availableBoxes: Box[];
  selectedBoxes: string[];
  onBoxSelectionChange: (boxId: string, selected: boolean) => void;
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  availableWarehouses: Warehouse[];
}

export const TransferDestinationForm: React.FC<TransferDestinationFormProps> = ({
  targetWarehouseId,
  setTargetWarehouseId,
  targetLocationId,
  setTargetLocationId,
  reason,
  setReason,
  warehouses,
  warehousesLoading,
  locations,
  locationsLoading,
  availableBoxes,
  selectedBoxes,
  onBoxSelectionChange,
  products,
  selectedProductId,
  setSelectedProductId,
  availableWarehouses
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="product">Product</Label>
        <Select 
          value={selectedProductId} 
          onValueChange={setSelectedProductId}
        >
          <SelectTrigger id="product">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products?.map(product => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''} - {product.quantity} units
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination-warehouse">Destination Warehouse</Label>
        <Select 
          value={targetWarehouseId} 
          onValueChange={setTargetWarehouseId}
          disabled={!selectedProductId}
        >
          <SelectTrigger id="destination-warehouse">
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehousesLoading ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : availableWarehouses?.map(warehouse => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination-location">Destination Location</Label>
        <Select
          value={targetLocationId}
          onValueChange={setTargetLocationId}
          disabled={!targetWarehouseId || locationsLoading}
        >
          <SelectTrigger id="destination-location">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locationsLoading ? (
              <SelectItem value="loading" disabled>Loading locations...</SelectItem>
            ) : locations?.map(location => (
              <SelectItem key={location.id} value={location.id}>
                {location.zone} - Floor {location.floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Select Boxes to Transfer</Label>
        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-2">
            {availableBoxes.map(box => (
              <div key={box.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`box-${box.id}`}
                  checked={selectedBoxes.includes(box.id)}
                  onCheckedChange={(checked) => onBoxSelectionChange(box.id, checked as boolean)}
                />
                <Label htmlFor={`box-${box.id}`} className="text-sm">
                  {box.barcode} - {box.product_name} ({box.quantity} units)
                  {box.warehouse_name && ` - From: ${box.warehouse_name}`}
                  {box.location_name && `, ${box.location_name}`}
                </Label>
              </div>
            ))}
            {availableBoxes.length === 0 && (
              <p className="text-sm text-gray-500">No boxes available for transfer</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Transfer Reason</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for transfer"
          className="resize-none"
        />
      </div>
    </div>
  );
};
