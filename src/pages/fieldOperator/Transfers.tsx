import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, ArrowRight } from 'lucide-react';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { ScannedItemsList } from '@/components/transfers/ScannedItemsList';
import { TransferDestinationForm } from '@/components/transfers/TransferDestinationForm';
import { useTransferLogic } from '@/hooks/useTransferLogic';
import { useTransferData } from '@/hooks/useTransferData';

const FieldOperatorTransfers: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    currentScannedBarcode,
    setCurrentScannedBarcode,
    scannedItems,
    targetWarehouseId,
    setTargetWarehouseId,
    targetLocationId,
    setTargetLocationId,
    reason,
    setReason,
    handleBarcodeScanned,
    removeScannedItem,
    transferMutation,
    isSubmitDisabled
  } = useTransferLogic();

  const {
    warehouses,
    warehousesLoading,
    locations,
    locationsLoading
  } = useTransferData(targetWarehouseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Transfer Inventory" 
        description="Move inventory between warehouses and locations"
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/field')}
        className="flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScanLine className="mr-2 h-5 w-5" />
              Scan Items
            </CardTitle>
            <CardDescription>
              Scan inventory items to transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MobileBarcodeScanner 
              onBarcodeScanned={handleBarcodeScanned}
              allowManualEntry={true}
              inputValue={currentScannedBarcode}
              onInputChange={(e) => setCurrentScannedBarcode(e.target.value)}
              scanButtonLabel="Scan Item"
            />
            
            <ScannedItemsList 
              scannedItems={scannedItems}
              onRemoveItem={removeScannedItem}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRight className="mr-2 h-5 w-5" />
              Transfer Details
            </CardTitle>
            <CardDescription>
              Select destination and submit transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <TransferDestinationForm
                targetWarehouseId={targetWarehouseId}
                setTargetWarehouseId={setTargetWarehouseId}
                targetLocationId={targetLocationId}
                setTargetLocationId={setTargetLocationId}
                reason={reason}
                setReason={setReason}
                warehouses={warehouses}
                warehousesLoading={warehousesLoading}
                locations={locations}
                locationsLoading={locationsLoading}
              />
            </form>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitDisabled()}
              className="w-full"
            >
              {transferMutation.isPending ? 'Processing...' : 'Submit Transfer'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default FieldOperatorTransfers;
