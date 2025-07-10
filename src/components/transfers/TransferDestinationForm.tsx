
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

interface Location {
  id: string;
  floor: string;
  zone: string;
  warehouse_id: string;
}

interface TransferDestinationFormProps {
  targetWarehouseId: string;
  setTargetWarehouseId: (value: string) => void;
  targetLocationId: string;
  setTargetLocationId: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  warehouses: Warehouse[] | undefined;
  warehousesLoading: boolean;
  locations: Location[] | undefined;
  locationsLoading: boolean;
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
  locationsLoading
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="destination-warehouse">Destination Warehouse</Label>
        <Select 
          value={targetWarehouseId} 
          onValueChange={setTargetWarehouseId}
        >
          <SelectTrigger id="destination-warehouse">
            <SelectValue placeholder="Select warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehousesLoading ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : warehouses?.map(warehouse => (
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
          disabled={!targetWarehouseId}
        >
          <SelectTrigger id="destination-location">
            <SelectValue placeholder={targetWarehouseId ? "Select location" : "Select warehouse first"} />
          </SelectTrigger>
          <SelectContent>
            {locationsLoading ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : locations?.length ? 
              locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  Floor {location.floor}, Zone {location.zone}
                </SelectItem>
              )) : (
                <SelectItem value="no-locations" disabled>No locations available</SelectItem>
              )
            }
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea 
          id="reason"
          placeholder="Reason for transfer"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
};
