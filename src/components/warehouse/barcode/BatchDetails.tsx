import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BatchItem } from './BarcodeValidation';

interface BatchDetailsProps {
  batchItem: any;
  onQuantityChange: (quantity: number) => void;
  onProcess: () => void;
  isProcessing: boolean;
  maxQuantity?: number;
  stockOutRequest?: any;
}

const BatchDetails: React.FC<BatchDetailsProps> = ({
  batchItem,
  onQuantityChange,
  onProcess,
  isProcessing,
  maxQuantity,
  stockOutRequest
}) => {
  // Use deduct_quantity from batchItem if available, otherwise default to 1
  const [quantity, setQuantity] = useState<number>(batchItem.deduct_quantity || 1);
  // Determine the maximum quantity that can be deducted
  // Ensure maxDeductible is always a valid number
  const maxDeductible = maxQuantity !== undefined && !isNaN(maxQuantity)
    ? maxQuantity 
    : (batchItem.quantity && !isNaN(batchItem.quantity)) ? batchItem.quantity : 1;

  // Handle quantity input change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    let newValue = 1;
    
    if (isNaN(value) || value < 1) {
      newValue = 1;
    } else if (value > maxDeductible) {
      newValue = maxDeductible;
    } else {
      newValue = value;
    }
    
    setQuantity(newValue);
    onQuantityChange(newValue);
  };

  // Handle quantity increment/decrement
  const adjustQuantity = (amount: number) => {
    const newValue = quantity + amount;
    let finalValue = newValue;
    
    if (newValue < 1) {
      finalValue = 1;
    } else if (newValue > maxDeductible) {
      finalValue = maxDeductible;
    }
    
    setQuantity(finalValue);
    onQuantityChange(finalValue);
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Box Details</h3>
          
          <div className="grid grid-cols-2 gap-4 border rounded-md p-3 bg-muted/10">
            <div>
              <p className="text-sm font-medium">Box ID</p>
              <p className="font-mono text-base">
                <span title={batchItem.id}>
                  {batchItem.id ? batchItem.id.slice(-8) : 'N/A'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Barcode</p>
              <p className="font-mono text-base">{batchItem.barcode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Number</p>
              <p className="font-medium">{batchItem.batch_number || 'N/A'}</p>
            </div>
            {/* Always show product name */}
            <div>
              <p className="text-sm font-medium">Product</p>
              <p className="font-medium">{batchItem.product_name || 'Unknown Product'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="font-medium">{batchItem.location_name || batchItem.warehouse_name || 'Unknown Location'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Available Quantity</p>
              <p className="font-medium text-base">{batchItem.quantity}</p>
            </div>
          </div>
          
          <div className="space-y-2 border rounded-md p-4 bg-accent/10">
            <label htmlFor="quantity" className="text-sm font-medium flex items-center justify-between">
              <span>Quantity to Deduct</span>
              {stockOutRequest && (
                <span className="text-sm text-muted-foreground">
                  Required: {stockOutRequest.quantity || 0}
                </span>
              )}
            </label>
            <div className="flex items-center space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => adjustQuantity(-1)}
                disabled={quantity <= 1 || isProcessing}
                className="h-10 w-10"
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxDeductible}
                value={quantity}
                onChange={handleQuantityChange}
                className="w-20 text-center text-lg font-medium"
                disabled={isProcessing}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => adjustQuantity(1)}
                disabled={quantity >= maxDeductible || isProcessing}
                className="h-10 w-10"
              >
                +
              </Button>
              <div className="ml-2 text-sm bg-muted px-2 py-1 rounded-md">
                <span className="font-medium">Available:</span> {maxDeductible}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onProcess}
            disabled={isProcessing || quantity <= 0}
            className="w-full mt-2"
            variant="default"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Add {quantity} {quantity === 1 ? 'Unit' : 'Units'} to Deduction Table
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchDetails;
