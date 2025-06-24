import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '../barcode/BarcodeScanner';
import { useStockOutForm } from './useStockOutForm';
import { StockOutFormProps } from './types';
import { BatchItem } from '../barcode/BarcodeValidation';

const BarcodeStockOutForm: React.FC<StockOutFormProps> = ({ onComplete, userId, initialBarcode }) => {
  const {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    completeStockOut
  } = useStockOutForm(userId, initialBarcode);
  
  // Create a handler for BatchItem objects
  const handleBatchItemFound = (batchItem: BatchItem) => {
    // If we have a barcode, we can pass it to the existing handler
    if (batchItem && batchItem.barcode) {
      handleBarcodeScanned(batchItem.barcode);
    }
  };

  // If success state is true, show completion message
  if (state.isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              Stock out request has been successfully processed.
            </AlertDescription>
          </Alert>
          {onComplete && (
            <Button 
              className="w-full mt-4" 
              onClick={onComplete}
            >
              Return to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onBatchItemFound={handleBatchItemFound}
          isEnabled={state.scannerEnabled}
          isProcessing={state.isProcessing}
          isSuccess={state.isSuccess}
          stockOutRequest={state.stockOutRequest}
          processedItems={state.processedItems}
          onQuantityChange={handleQuantityChange}
        />
        
        {state.currentBatchItem && (
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={processBatchItem}
              disabled={state.isProcessing}
            >
              Process Batch Item
            </Button>
          </div>
        )}
        
        {state.stockOutRequest && state.stockOutRequest.remaining_quantity === 0 && (
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={completeStockOut}
              disabled={state.isProcessing}
            >
              Complete Stock Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeStockOutForm;
