import React from 'react';
import { StockInRequestData } from '@/hooks/useStockInRequests';
import { BoxData } from '@/hooks/useStockInBoxes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useLocations } from '@/hooks/useLocations';
import { Loader2 } from 'lucide-react';

interface StockInStepPreviewProps {
  stockIn: StockInRequestData;
  boxesData: BoxData[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

const StockInStepPreview: React.FC<StockInStepPreviewProps> = ({
  stockIn,
  boxesData,
  isSubmitting,
  onSubmit,
  onBack
}) => {
  const { warehouses } = useWarehouses();
  
  // Group boxes by warehouse/location
  const getBoxesByLocation = () => {
    const boxesByLocation: Record<string, {
      warehouseId: string;
      warehouseName: string;
      locationId: string;
      locationName: string;
      boxes: BoxData[];
      totalQuantity: number;
    }> = {};
    
    boxesData.forEach(box => {
      if (box.warehouse_id && box.location_id) {
        const key = `${box.warehouse_id}-${box.location_id}`;
        
        // Find warehouse name
        const warehouseName = warehouses?.find(w => w.id === box.warehouse_id)?.name || 'Unknown Warehouse';
        
        // Find location info
        let locationName = 'Unknown Location';
        const warehouse = warehouses?.find(w => w.id === box.warehouse_id);
        if (warehouse) {
          const { locations } = useLocations(box.warehouse_id);
          const location = locations?.find(l => l.id === box.location_id);
          if (location) {
            locationName = `Zone ${location.zone}, Floor ${location.floor}`;
          }
        }
        
        if (!boxesByLocation[key]) {
          boxesByLocation[key] = {
            warehouseId: box.warehouse_id,
            warehouseName,
            locationId: box.location_id,
            locationName,
            boxes: [],
            totalQuantity: 0
          };
        }
        
        boxesByLocation[key].boxes.push(box);
        boxesByLocation[key].totalQuantity += box.quantity || 0;
      }
    });
    
    return Object.values(boxesByLocation);
  };
  
  const batchGroups = getBoxesByLocation();
  
  // Calculate totals
  const totalBoxes = boxesData.length;
  const totalItems = boxesData.reduce((sum, box) => sum + (box.quantity || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-none bg-muted/50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Product</h3>
              <p className="text-lg font-semibold">{stockIn.product?.name}</p>
              {stockIn.product?.sku && (
                <p className="text-sm text-muted-foreground">SKU: {stockIn.product.sku}</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Source</h3>
              <p className="text-lg">{stockIn.source}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Items</h3>
              <p className="text-lg">{totalItems} items</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Boxes</h3>
              <p className="text-lg">{totalBoxes} boxes</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <h2 className="text-xl font-semibold mb-4">Boxes by Location</h2>
      
      {batchGroups.map((group, index) => (
        <Card key={index} className="mb-6">
          <CardHeader className="bg-muted py-4">
            <CardTitle className="text-lg">
              {group.warehouseName} - {group.locationName}
            </CardTitle>
            <CardDescription>
              {group.boxes.length} {group.boxes.length === 1 ? 'box' : 'boxes'} | 
              Total quantity: {group.totalQuantity} items
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Box #</th>
                    <th className="py-3 px-4 text-left font-medium">Barcode</th>
                    <th className="py-3 px-4 text-left font-medium">Quantity</th>
                    <th className="py-3 px-4 text-left font-medium">Color</th>
                    <th className="py-3 px-4 text-left font-medium">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {group.boxes.map((box, boxIndex) => (
                    <tr key={boxIndex} className="border-t border-muted">
                      <td className="py-3 px-4">{boxesData.indexOf(box) + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs">{box.barcode}</td>
                      <td className="py-3 px-4">{box.quantity}</td>
                      <td className="py-3 px-4">{box.color || '-'}</td>
                      <td className="py-3 px-4">{box.size || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitting} 
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Complete Processing'
          )}
        </Button>
      </div>
    </div>
  );
};

export default StockInStepPreview;
