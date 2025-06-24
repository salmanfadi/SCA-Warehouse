import React from 'react';
import { StockInRequestData } from '@/hooks/useStockInRequests';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useLocations } from '@/hooks/useLocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface StockInStepDetailsProps {
  stockIn: StockInRequestData;
  warehouseId: string;
  setWarehouseId: (id: string) => void;
  locationId: string;
  setLocationId: (id: string) => void;
  confirmedBoxes: number;
  setConfirmedBoxes: (boxes: number) => void;
  onContinue: () => void;
  onCancel: () => void;
}

const StockInStepDetails: React.FC<StockInStepDetailsProps> = ({
  stockIn,
  warehouseId,
  setWarehouseId,
  locationId,
  setLocationId,
  confirmedBoxes,
  setConfirmedBoxes,
  onContinue,
  onCancel,
}) => {
  const { warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const { locations, isLoading: isLoadingLocations } = useLocations(warehouseId);
  
  const isContinueDisabled = !warehouseId || !locationId || confirmedBoxes <= 0;

  // Handle continue button click with proper validation
  const handleContinue = () => {
    if (!warehouseId) {
      toast({
        title: "Missing Information",
        description: "Please select a warehouse",
        variant: "destructive",
      });
      return;
    }

    if (!locationId) {
      toast({
        title: "Missing Information",
        description: "Please select a location within the warehouse",
        variant: "destructive",
      });
      return;
    }

    if (confirmedBoxes <= 0) {
      toast({
        title: "Invalid Input",
        description: "Number of boxes must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    // All validations passed, proceed to next step
    onContinue();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Stock In Request Details</h2>
        
        {/* Request Details Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md mb-6">
          <div>
            <span className="text-sm text-muted-foreground">Product:</span>
            <p className="font-medium">{stockIn.product?.name || 'Unknown Product'}</p>
            {stockIn.product?.sku && (
              <p className="text-xs text-muted-foreground">SKU: {stockIn.product.sku}</p>
            )}
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{stockIn.status}</Badge>
            </div>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Submitted By:</span>
            <p>{stockIn.submitter?.name || 'Unknown User'}</p>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">Source:</span>
            <p>{stockIn.source}</p>
          </div>
          
          {stockIn.notes && (
            <div className="col-span-full">
              <span className="text-sm text-muted-foreground">Notes:</span>
              <p className="text-sm">{stockIn.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Processing Information</h3>
        
        {/* Warehouse Selection */}
        <div className="space-y-2">
          <Label htmlFor="warehouse">Warehouse <span className="text-destructive">*</span></Label>
          <Select
            value={warehouseId}
            onValueChange={setWarehouseId}
            disabled={isLoadingWarehouses}
          >
            <SelectTrigger id="warehouse">
              <SelectValue placeholder="Select a warehouse" />
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
        
        {/* Location Selection */}
        <div className="space-y-2">
          <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
          <Select
            value={locationId}
            onValueChange={setLocationId}
            disabled={!warehouseId || isLoadingLocations}
          >
            <SelectTrigger id="location">
              <SelectValue placeholder={warehouseId ? "Select a location" : "Select warehouse first"} />
            </SelectTrigger>
            <SelectContent>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  Zone {location.zone}, Floor {location.floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!warehouseId && (
            <p className="text-sm text-muted-foreground">Please select a warehouse first</p>
          )}
        </div>
        
        {/* Number of boxes */}
        <div className="space-y-2">
          <Label htmlFor="boxes">Number of Boxes <span className="text-destructive">*</span></Label>
          <Input
            id="boxes"
            type="number"
            value={confirmedBoxes}
            onChange={(e) => setConfirmedBoxes(parseInt(e.target.value) || 0)}
            min={1}
          />
          <p className="text-sm text-muted-foreground">
            Original request: {stockIn.boxes} {stockIn.boxes === 1 ? 'box' : 'boxes'}
          </p>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={handleContinue} 
          disabled={isContinueDisabled}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StockInStepDetails;
