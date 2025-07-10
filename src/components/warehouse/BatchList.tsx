import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { BatchCard } from '@/components/warehouse/BatchCard';
import { ProcessedBatch } from '@/types/batchStockIn';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BatchListProps {
  batches: ProcessedBatch[];
  editBatch: (index: number) => void;
  deleteBatch: (index: number) => void;
  handleBatchSubmission: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isProcessing: boolean;
  formSubmitted: boolean;
  barcodeValidationErrors?: { barcode: string; error: string }[];
  remainingBoxes: number;
}

export const BatchList: React.FC<BatchListProps> = ({
  batches,
  editBatch,
  deleteBatch,
  handleBatchSubmission,
  isSubmitting,
  isProcessing,
  formSubmitted,
  barcodeValidationErrors = [],
  remainingBoxes
}) => {
  // Count unique valid barcodes to ensure there are no duplicates within this batch
  const barcodeCount = new Set(batches.flatMap(batch => 
    Array.from({ length: batch.boxes_count }, (_, i) => 
      batch.barcodes?.[i] || '')
    ).filter(Boolean)
  ).size;
  
  // Check if there are duplicate barcodes within the current batch
  const hasDuplicateBarcodes = batches.flatMap(batch => 
    batch.barcodes || []
  ).filter(Boolean).length !== barcodeCount;
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Batches ({batches.length})</h3>
      
      {batches.length === 0 ? (
        <Card className="apple-shadow-sm">
          <CardContent className="p-6 text-center text-muted-foreground">
            No batches added yet. Use the form to add batches.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
          {batches.map((batch, index) => (
            <BatchCard 
              key={index}
              batch={batch}
              index={index}
              onEdit={() => !isSubmitting && !isProcessing && !formSubmitted && editBatch(index)} 
              onDelete={() => !isSubmitting && !isProcessing && !formSubmitted && deleteBatch(index)} 
              showBarcodes={true}
              disabled={isSubmitting || isProcessing || formSubmitted}
              hasError={barcodeValidationErrors.some(err => 
                batch.barcodes?.includes(err.barcode))}
            />
          ))}
          
          {hasDuplicateBarcodes && (
            <div className="flex items-center p-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-md text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Warning: Duplicate barcodes detected within batches. Please ensure all barcodes are unique.</span>
            </div>
          )}
          
          {barcodeValidationErrors.length > 0 && (
            <div className="flex items-center p-2 text-red-600 bg-red-50 border border-red-200 rounded-md text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{barcodeValidationErrors.length} barcode(s) already exist in inventory. Please correct before submitting.</span>
            </div>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button 
                    onClick={handleBatchSubmission} 
                    className={`w-full mt-4 apple-shadow-sm ${formSubmitted && !barcodeValidationErrors.length ? "bg-green-600 hover:bg-green-700" : ""}`}
                    disabled={batches.length === 0 || isSubmitting || isProcessing || (formSubmitted && !barcodeValidationErrors.length) || hasDuplicateBarcodes || remainingBoxes > 0}
                  >
                    {isSubmitting || isProcessing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : formSubmitted && !barcodeValidationErrors.length ? (
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Submitted! Navigating to Inventory...
                      </span>
                    ) : 'Submit All Batches'}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {batches.length === 0 ? (
                  <p>Please add at least one batch before submitting</p>
                ) : hasDuplicateBarcodes ? (
                  <p>Please resolve duplicate barcodes before submitting</p>
                ) : formSubmitted && !barcodeValidationErrors.length ? (
                  <p>Successfully submitted. Redirecting to inventory...</p>
                ) : (
                  <p>Submit {batches.length} batch(es) to inventory</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};
