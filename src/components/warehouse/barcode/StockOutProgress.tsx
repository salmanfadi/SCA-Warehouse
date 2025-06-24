import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StockOutRequest } from './BarcodeValidation';
import { format } from 'date-fns';

// Helper function to validate date strings
const isValidDate = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
};

interface StockOutProgressProps {
  stockOutRequest: StockOutRequest;
}

export const StockOutProgress: React.FC<StockOutProgressProps> = ({ stockOutRequest }) => {
  // Calculate progress percentage
  // Ensure we don't have negative remaining quantity
  const remaining = Math.max(0, stockOutRequest.remaining_quantity || 0);
  const total = Math.max(1, stockOutRequest.quantity || 1); // Avoid division by zero
  
  const progressPercentage = Math.min(100, Math.round(
    ((total - remaining) / total) * 100
  ));

  // Calculate fulfilled quantity
  const fulfilledQuantity = Math.min(total, total - remaining);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Stock Out Request</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{stockOutRequest.product_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Request ID</p>
              <p className="font-mono text-sm">{stockOutRequest.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requested By</p>
              <p className="font-medium">{stockOutRequest.requested_by}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Requested At</p>
              <p className="font-medium">
                {stockOutRequest.requested_at && isValidDate(stockOutRequest.requested_at) ? 
                  format(new Date(stockOutRequest.requested_at), 'MMM d, yyyy HH:mm') : 
                  'Not specified'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                {fulfilledQuantity} of {stockOutRequest.quantity} units processed
              </span>
              <span>
                {stockOutRequest.remaining_quantity} units remaining
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockOutProgress;
