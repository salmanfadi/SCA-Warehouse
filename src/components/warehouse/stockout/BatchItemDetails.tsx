import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Package, Check } from 'lucide-react';
import { BatchItem } from '@/services/stockout/types';

interface BatchItemDetailsProps {
  batchItem: BatchItem;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onProcess: () => void;
  isProcessing: boolean;
  maxQuantity: number;
}

const BatchItemDetails: React.FC<BatchItemDetailsProps> = ({
  batchItem,
  quantity,
  onQuantityChange,
  onProcess,
  isProcessing,
  maxQuantity
}) => {
  // Handle quantity input change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onQuantityChange(newQuantity);
    }
  };

  // Handle increment/decrement buttons
  const incrementQuantity = () => {
    if (quantity < Math.min(batchItem.quantity, maxQuantity)) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Scanned Item Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Item Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Product</p>
              <p className="font-medium">{batchItem.product_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Barcode</p>
              <p className="font-medium">{batchItem.barcode}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Batch</p>
              <p className="font-medium">{batchItem.batch_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location</p>
              <p className="font-medium">{batchItem.location_name || 'Unknown'}</p>
              {batchItem.warehouse_name && (
                <p className="text-xs text-muted-foreground">{batchItem.warehouse_name}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available Quantity</p>
              <p className="font-medium">{batchItem.quantity}</p>
            </div>
            {batchItem.color && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Color</p>
                <p className="font-medium">{batchItem.color}</p>
              </div>
            )}
            {batchItem.size && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Size</p>
                <p className="font-medium">{batchItem.size}</p>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Quantity to Process</p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={decrementQuantity}
                disabled={quantity <= 1 || isProcessing}
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                min={1}
                max={Math.min(batchItem.quantity, maxQuantity)}
                disabled={isProcessing}
                className="w-20 text-center"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={incrementQuantity}
                disabled={quantity >= Math.min(batchItem.quantity, maxQuantity) || isProcessing}
              >
                +
              </Button>
              <div className="text-sm text-muted-foreground ml-2">
                Max: {Math.min(batchItem.quantity, maxQuantity)}
              </div>
            </div>
          </div>

          {/* Process Button */}
          <Button 
            className="w-full mt-2" 
            onClick={onProcess}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Process Item
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchItemDetails;
