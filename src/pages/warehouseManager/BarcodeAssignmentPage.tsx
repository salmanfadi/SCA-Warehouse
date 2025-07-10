
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Check, Box, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useStockInBatches } from '@/hooks/useStockInBatches';
import { useStockInData } from '@/hooks/useStockInData';
import { BoxMetadata, ProcessedBatch } from '@/types/batchStockIn';
import { generateBarcodeString } from '@/utils/barcodeUtils';
import { supabase } from '@/integrations/supabase/client';
import { BarcodePreview } from '@/components/warehouse/BarcodePreview';
import { BoxDetailsSection } from '@/components/warehouse/BoxDetailsSection';
import { LoadingState } from '@/components/warehouse/LoadingState';
import { ErrorState } from '@/components/warehouse/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const BarcodeAssignmentPage: React.FC = () => {
  const { stockInId } = useParams<{ stockInId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: batches, isLoading: batchesLoading, error: batchesError } = useStockInBatches(stockInId);
  const { stockInData, isLoadingStockIn, error: stockInError } = useStockInData(stockInId);

  const [boxesWithMetadata, setBoxesWithMetadata] = useState<Record<string, BoxMetadata>>({});
  const [processingBarcodes, setProcessingBarcodes] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 3;

  // Get state from the location if passed
  const fromBatchProcessing = location.state?.fromBatchProcessing || false;
  const hasErrors = location.state?.hasErrors || false;

  useEffect(() => {
    if (batches && batches.length > 0) {
      // Initialize box metadata for all boxes in all batches
      const initialBoxMetadata: Record<string, BoxMetadata> = {};
      
      batches.forEach(batch => {
        if (batch.barcodes) {
          batch.barcodes.forEach(barcode => {
            initialBoxMetadata[barcode] = {
              barcode,
              weight: 0,
              width: 0,
              height: 0,
              length: 0,
              remarks: ''
            };
          });
        }
      });
      
      setBoxesWithMetadata(initialBoxMetadata);
      setCurrentStep(2); // Move to step 2 as we now have batches
      
      // If coming from batch processing with errors, show a toast notification
      if (fromBatchProcessing && hasErrors) {
        toast.error("Some barcodes could not be processed automatically. Please review and fix before proceeding.");
      }
    }
  }, [batches, fromBatchProcessing, hasErrors]);

  // Count total boxes across all batches
  const totalBoxes = batches?.reduce((acc, batch) => {
    return acc + (batch.boxes_count || 0);
  }, 0) || 0;

  const handleMetadataChange = (barcode: string, field: keyof BoxMetadata, value: any) => {
    setBoxesWithMetadata(prev => ({
      ...prev,
      [barcode]: {
        ...prev[barcode],
        [field]: value
      }
    }));
  };

  const generateFinalBarcodes = async () => {
    if (!stockInData?.product || !batches || batches.length === 0) {
      toast.error("Missing product or batch data");
      return;
    }
    
    setProcessingBarcodes(true);
    
    try {
      const productSku = stockInData.product.sku || '';
      const productCategory = stockInData.product.category || '';
      
      // Create a new object to store newly generated barcodes
      const updatedBoxesWithMetadata = { ...boxesWithMetadata };
      
      for (const batch of batches) {
        if (!batch.barcodes || batch.barcodes.length === 0) continue;
        
        // Generate new barcodes for each box
        for (let i = 0; i < batch.barcodes.length; i++) {
          const oldBarcode = batch.barcodes[i];
          const boxNumber = i + 1;
          
          // Generate a proper barcode
          const newBarcode = await generateBarcodeString(
            productCategory,
            productSku,
            boxNumber
          );
          
          // Update metadata with new barcode
          updatedBoxesWithMetadata[newBarcode] = {
            ...updatedBoxesWithMetadata[oldBarcode],
            barcode: newBarcode
          };
          
          // Delete the old barcode entry
          if (oldBarcode !== newBarcode) {
            delete updatedBoxesWithMetadata[oldBarcode];
          }
        }
      }
      
      setBoxesWithMetadata(updatedBoxesWithMetadata);
      toast.success(`Successfully generated ${Object.keys(updatedBoxesWithMetadata).length} barcodes`);
      
      setCurrentStep(3); // Move to step 3
    } catch (error) {
      console.error('Error generating barcodes:', error);
      toast.error(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setProcessingBarcodes(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCompleteProcessing = async () => {
    if (!stockInId || !batches || batches.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      // Update all batch items with final barcodes and metadata
      for (const batch of batches) {
        if (!batch.id) continue;
        
        const barcodeList = Object.keys(boxesWithMetadata);
        
        // Update batch_items table with final barcodes
        for (const barcode of barcodeList) {
          const metadata = boxesWithMetadata[barcode];
          
          // Update batch_items with final barcode and metadata
          await supabase
            .from('batch_items')
            .update({
              barcode: metadata.barcode,
              metadata: {
                weight: metadata.weight,
                dimensions: {
                  width: metadata.width,
                  height: metadata.height,
                  length: metadata.length
                },
                remarks: metadata.remarks
              }
            })
            .eq('batch_id', batch.id)
            .eq('barcode', metadata.barcode);
          
          // Update inventory with final barcode
          await supabase
            .from('inventory')
            .update({
              barcode: metadata.barcode,
              metadata: {
                weight: metadata.weight,
                dimensions: {
                  width: metadata.width,
                  height: metadata.height,
                  length: metadata.length
                },
                remarks: metadata.remarks
              }
            })
            .eq('batch_id', batch.id)
            .eq('barcode', metadata.barcode);
        }
      }
      
      // Update stock_in status to completed
      await supabase
        .from('stock_in')
        .update({
          status: 'completed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', stockInId);
      
      toast.success("Stock-in has been successfully processed and inventory updated");
      
      // Navigate to the overview page
      navigate(`/manager/stock-in/batches/${stockInId}`);
      
    } catch (error) {
      console.error('Error completing processing:', error);
      toast.error(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingStockIn || batchesLoading) {
    return <LoadingState message="Loading barcode assignment data..." />;
  }

  if (stockInError || batchesError) {
    return (
      <ErrorState 
        message="Error loading data"
        details={(stockInError || batchesError)?.message || "Unknown error"} 
        onNavigateBack={() => navigate('/manager/stock-in')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate(`/manager/stock-in/batch/${stockInId}`)}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Batch Creation
        </Button>
        
        {stockInData && (
          <Badge 
            className={`text-xs px-2 py-1 ${
              stockInData.status === 'completed' ? 'bg-green-100 text-green-800' :
              stockInData.status === 'processing' ? 'bg-amber-100 text-amber-800' :
              'bg-blue-100 text-blue-800'
            }`}
          >
            {stockInData.status.charAt(0).toUpperCase() + stockInData.status.slice(1)}
          </Badge>
        )}
      </div>
      
      <PageHeader 
        description="Assign barcodes to batches."
      />

      {/* Error message when barcode processing had issues */}
      {fromBatchProcessing && hasErrors && (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Barcode Processing Issues</AlertTitle>
          <AlertDescription>
            Some barcodes could not be processed automatically. Please review the barcodes and metadata before proceeding.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Progress indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">Processing Steps</p>
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className={`h-2 flex-grow rounded-full ${
                  currentStep >= 1 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
              <div 
                className={`h-2 flex-grow rounded-full ${
                  currentStep >= 2 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
              <div 
                className={`h-2 flex-grow rounded-full ${
                  currentStep >= 3 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className={currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}>1. Create Batches</span>
              <span className={currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}>2. Assign Barcodes</span>
              <span className={currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}>3. Review & Complete</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Product info */}
      {stockInData && (
        <Card>
          <CardHeader>
            <CardTitle>Stock In Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Product</p>
                <p>{stockInData.product?.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Boxes</p>
                <p>{totalBoxes}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p>{stockInData.product?.sku || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Barcode Assignment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Barcode Assignment</CardTitle>
            <CardDescription>
              Generate final barcodes for all boxes
            </CardDescription>
          </div>
          <Button 
            onClick={generateFinalBarcodes} 
            disabled={processingBarcodes || currentStep >= 3}
          >
            {processingBarcodes && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate Final Barcodes
          </Button>
        </CardHeader>
        <CardContent>
          {batches && batches.map((batch) => (
            <div key={batch.id} className="mb-8">
              <h3 className="text-lg font-medium mb-4">
                Batch: {batch.warehouse?.name}, {batch.warehouseLocation?.floor}-{batch.warehouseLocation?.zone}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batch.barcodes?.map((barcode, index) => {
                  const finalBarcode = currentStep >= 3 
                    ? Object.keys(boxesWithMetadata).find(b => 
                        boxesWithMetadata[b].barcode === barcode || 
                        (boxesWithMetadata[barcode] && boxesWithMetadata[barcode].barcode)
                      ) || barcode
                    : barcode;
                    
                  const metadata = boxesWithMetadata[finalBarcode] || { barcode: finalBarcode };
                  
                  return (
                    <BoxDetailsSection
                      key={finalBarcode}
                      boxNumber={index + 1}
                      metadata={metadata}
                      onChange={(field, value) => handleMetadataChange(finalBarcode, field, value)}
                      readOnly={currentStep < 3}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* Barcode Preview and Print */}
      {currentStep >= 3 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Barcode Preview</CardTitle>
              <CardDescription>
                Review and print barcodes for all boxes
              </CardDescription>
            </div>
            <Button 
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print All Labels
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2">
              {Object.keys(boxesWithMetadata).map((barcode) => (
                <div key={barcode} className="border rounded-lg p-4 print:break-inside-avoid">
                  <BarcodePreview 
                    value={boxesWithMetadata[barcode].barcode} 
                    height={80}
                  />
                  <div className="mt-2 text-sm">
                    <p><strong>Box ID:</strong> {boxesWithMetadata[barcode].barcode}</p>
                    {boxesWithMetadata[barcode].weight && <p><strong>Weight:</strong> {boxesWithMetadata[barcode].weight} kg</p>}
                    {(boxesWithMetadata[barcode].width || boxesWithMetadata[barcode].height || boxesWithMetadata[barcode].length) && (
                      <p><strong>Dimensions:</strong> {boxesWithMetadata[barcode].width || 0} x {boxesWithMetadata[barcode].height || 0} x {boxesWithMetadata[barcode].length || 0} cm</p>
                    )}
                    {boxesWithMetadata[barcode].remarks && <p><strong>Remarks:</strong> {boxesWithMetadata[barcode].remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-4 print:hidden">
        <Button
          variant="outline"
          onClick={() => navigate('/manager/stock-in')}
        >
          Cancel
        </Button>
        
        {currentStep >= 3 && (
          <Button
            onClick={handleCompleteProcessing}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Check className="h-4 w-4 mr-2" />
            Complete Processing
          </Button>
        )}
      </div>
    </div>
  );
};

export default BarcodeAssignmentPage;
