import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BarcodeScanner from './BarcodeScanner';
import BatchItemDetails from './BatchItemDetails';
import StockOutProgress from './StockOutProgress';
import { useStockOut } from '@/hooks/useStockOut';
import { StockOutRequest } from '@/services/stockout/types';

interface StockOutFormProps {
  userId: string;
  stockOutRequest: StockOutRequest | null;
  initialBarcode?: string;
  onComplete: () => void;
}

const StockOutForm: React.FC<StockOutFormProps> = ({
  userId,
  stockOutRequest,
  initialBarcode,
  onComplete
}) => {
  const {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    handleCompleteStockOut,
    isReadyForApproval,
    deleteProcessedItem
  } = useStockOut({
    userId,
    initialBarcode,
    initialStockOutRequest: stockOutRequest || undefined
  });

  // If no stock out request is provided, show an error
  if (!stockOutRequest) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          No stock out request found. Please select a valid stock out request.
        </AlertDescription>
      </Alert>
    );
  }

  // If the stock out has been successfully completed, show a success message
  if (state.isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="text-xl font-medium text-center">Stock Out Completed Successfully</h3>
            <p className="text-center text-muted-foreground">
              All items have been processed and the stock out has been completed.
            </p>
            <Button onClick={onComplete}>Return to Stock Out List</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock Out Request Details and Progress */}
      {state.stockOutRequest && (
        <StockOutProgress
          stockOutRequest={state.stockOutRequest}
          processedItems={state.processedItems}
          progress={state.progress}
          onDeleteItem={deleteProcessedItem}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        isEnabled={state.scannerEnabled && !state.isSuccess}
        isProcessing={state.isProcessing}
        currentBatchItem={state.currentBatchItem}
        initialBarcode={initialBarcode}
      />

      {/* Batch Item Details (when a barcode has been scanned) */}
      {state.currentBatchItem && state.stockOutRequest && (
        <BatchItemDetails
          batchItem={state.currentBatchItem}
          quantity={state.quantity}
          onQuantityChange={handleQuantityChange}
          onProcess={processBatchItem}
          isProcessing={state.isProcessing}
          maxQuantity={Math.min(
            state.currentBatchItem.quantity,
            state.stockOutRequest.remaining_quantity
          )}
        />
      )}

      {/* Complete Stock Out Button */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Complete Stock Out</CardTitle>
          <CardDescription>
            Approve the stock out when all items have been scanned and processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            disabled={!isReadyForApproval() || state.isLoading}
            onClick={handleCompleteStockOut}
          >
            {state.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Approve Stock Out'
            )}
          </Button>
          
          {!isReadyForApproval() && state.processedItems.length > 0 && state.stockOutRequest && (
            <p className="text-sm text-amber-600 mt-2">
              {state.stockOutRequest.remaining_quantity > 0 
                ? `Please scan all required items (${state.stockOutRequest.remaining_quantity} remaining) before approving.`
                : 'Stock out is ready for approval.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOutForm;
