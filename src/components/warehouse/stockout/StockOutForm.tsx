import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BarcodeScanner from './BarcodeScanner';
import BatchItemDetails from './BatchItemDetails';
import StockOutProgress from './StockOutProgress';
import { useStockOut } from '@/hooks/useStockOut';
import { StockOutRequest, ProcessedItem } from '@/services/stockout/types';

interface StockOutFormProps {
  userId: string;
  stockOutRequest: StockOutRequest | null;
  initialBarcode?: string;
  onComplete: (processedItems: ProcessedItem[]) => void;
  skipStockOutCompletion?: boolean; // Flag to skip completing the stock out in the database
}

const StockOutForm: React.FC<StockOutFormProps> = ({
  userId,
  stockOutRequest,
  initialBarcode = '',
  onComplete,
  skipStockOutCompletion = false
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
            <Button onClick={() => onComplete(state.processedItems)}>Return to Stock Out List</Button>
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
            state.stockOutRequest.quantity - state.processedItems.reduce((sum, item) => sum + item.quantity, 0)
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
            onClick={async (e) => {
              e.preventDefault();
              if (skipStockOutCompletion) {
                // Skip the database updates and just pass the processed items to the callback
                onComplete(state.processedItems);
              } else {
                // Complete the stock out in the database and then call the callback
                await handleCompleteStockOut();
                onComplete(state.processedItems);
              }
            }}
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
              {(() => {
                const remainingQuantity = state.stockOutRequest.quantity - state.processedItems.reduce((sum, item) => sum + item.quantity, 0);
                return remainingQuantity > 0 
                  ? `Please scan all required items (${remainingQuantity} remaining) before approving.`
                  : 'Stock out is ready for approval.';
              })()} 
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOutForm;
