import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Define BatchData type with all required fields
type BatchData = {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  total_quantity: number;
  total_boxes: number;
  status: string;
  processed_at: string;
  warehouse_id: string;
  warehouse_name?: string;
  location_id?: string;
  location_name?: string;
  boxCount?: number;
  quantityPerBox?: number;
  color?: string;
  size?: string;
  created_at: string;
  updated_at?: string;
  boxBarcodes?: string[];
  [key: string]: any; // Allow additional properties
};

import { BatchFormData } from './StockInStepBatches';
import { BatchInfo } from './barcode-viewer/BatchInfo';
import { BatchNavigation } from './barcode-viewer/BatchNavigation';
import { BarcodeList } from './barcode-viewer/BarcodeList';
import { BarcodeActions } from './barcode-viewer/BarcodeActions';
import { PdfGenerator } from './barcode-viewer/PdfGenerator';

// Type for batch data compatible with PDF generation
type PdfCompatibleBatch = BatchData & {
  barcodes: string[];
  batch_number: string;
  quantity_per_box: number;
  [key: string]: any; // Allow additional properties
};

// Type guard to check if an object is BatchData
const isBatchData = (item: any): item is BatchData => {
  return item && typeof item.id === 'string' && 'product_id' in item;
};

// Type guard to check if an object is BatchFormData
const isBatchFormData = (item: any): item is BatchFormData => {
  return item && 'id' in item && 'warehouse_name' in item;
};

// Helper function to transform BatchFormData to BatchData
const transformToBatchData = (data: BatchFormData): BatchData => {
  const now = new Date().toISOString();
  return {
    id: data.id,
    product_id: data.id, // Using batch ID as product ID if not available
    product_name: data.productName || 'Unknown Product',
    product_sku: data.productSku || '',
    total_quantity: (data.quantityPerBox || 0) * (data.boxCount || 1),
    total_boxes: data.boxCount || 1,
    status: 'pending',
    processed_at: now,
    created_at: data.created_at || now,
    updated_at: now,
    warehouse_id: data.warehouse_id,
    warehouse_name: data.warehouse_name || 'Unknown Warehouse',
    location_id: data.location_id || '',
    location_name: data.location_name || 'Unknown Location',
    boxCount: data.boxCount || 1,
    quantityPerBox: data.quantityPerBox || 0,
    color: data.color || '',
    size: data.size || '',
    boxBarcodes: data.boxBarcodes || [],
    barcodes: data.barcodes || [],
    batch_number: data.batch_number || data.id,
    quantity_per_box: data.quantityPerBox || 0,
    // Add any additional fields that might be needed
    ...data
  };
};

// Helper to safely access batch data
const getSafeBatch = (batch: BatchData | BatchFormData | null | undefined) => {
  if (!batch) return null;
  return batch;
};

// Helper function to transform BatchFormData to BatchData for PDF generation
const transformToPdfBatch = (batch: BatchFormData): BatchData => {
  const now = new Date().toISOString();
  return {
    id: batch.id,
    product_id: batch.id, // Using batch ID as product ID if not available
    product_name: batch.productName || 'Unknown Product',
    product_sku: batch.productSku || '',
    total_quantity: (batch.quantityPerBox || 0) * (batch.boxCount || 1),
    total_boxes: batch.boxCount || 1,
    status: 'completed', // Default status for PDF generation
    processed_at: now,
    created_at: batch.created_at || now,
    updated_at: now,
    warehouse_id: batch.warehouse_id || '',
    warehouse_name: batch.warehouse_name || 'Unknown Warehouse',
    location_id: batch.location_id || '',
    location_name: batch.location_name || 'Unknown Location',
    boxCount: batch.boxCount || 1,
    quantityPerBox: batch.quantityPerBox || 0,
    color: batch.color || '',
    size: batch.size || '',
    boxBarcodes: batch.boxBarcodes || [],
    barcodes: batch.boxBarcodes || [],
    batch_number: batch.batch_number || batch.id,
    quantity_per_box: batch.quantityPerBox || 0,
    // Spread any additional properties from the original batch
    ...batch
  };
};

export interface BarcodeViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: BatchData | null;
  batchData?: BatchData | null;
  batches?: BatchData[];
  onBatchChange?: (batchId: string) => void;
}

export const BarcodeViewerDialog: React.FC<BarcodeViewerDialogProps> = ({
  open,
  onOpenChange,
  batch,
  batchData,
  batches = [],
  onBatchChange,
}) => {
  // Use batch or batchData (for backward compatibility)
  const currentBatch = batch || batchData;

  // Helper to get barcodes from either barcodes 
  const getBarcodes = (batchItem: BatchData | BatchFormData | null | undefined): string[] => {
    if (!batchItem) return [];
    if ('boxBarcodes' in batchItem && batchItem.boxBarcodes) {
      return batchItem.boxBarcodes;
    }
    if ('barcodes' in batchItem && batchItem.barcodes) {
      return batchItem.barcodes;
    }
    return [];
  };

  // Helper to get quantity per box
  const getQuantityPerBox = (batchItem: BatchData | BatchFormData | null | undefined): number => {
    if (!batchItem) return 0;
    if ('quantityPerBox' in batchItem) {
      return batchItem.quantityPerBox || 0;
    }
    if ('quantity_per_box' in batchItem) {
      return batchItem.quantity_per_box || 0;
    }
    return 0;
  };

  // Helper to get batch number
  const getBatchNumber = (batchItem: BatchData | BatchFormData | null | undefined): string => {
    if (!batchItem) return '';
    if ('id' in batchItem) {
      return batchItem.id || '';
    }
    return '';
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = React.useState(0);

  const { toast } = useToast();
  
  // Get current batch safely
  const safeCurrentBatch = React.useMemo(() => {
    return currentBatch || (batches && batches.length > 0 ? batches[currentBatchIndex] : null);
  }, [currentBatch, batches, currentBatchIndex]);

  // Update current batch index when currentBatch changes
  React.useEffect(() => {
    if (safeCurrentBatch && batches && batches.length > 0) {
      const index = batches.findIndex(batchItem => batchItem.id === safeCurrentBatch.id);
      if (index >= 0) {
        setCurrentBatchIndex(index);
      }
    }
  }, [safeCurrentBatch, batches]);

  // Handle batch navigation
  const handlePreviousBatch = () => {
    if (currentBatchIndex > 0 && batches) {
      const newIndex = currentBatchIndex - 1;
      setCurrentBatchIndex(newIndex);
      if (onBatchChange) {
        onBatchChange(batches[newIndex]);
      }
    }
  };

  const handleNextBatch = () => {
    if (batches && currentBatchIndex < batches.length - 1) {
      const newIndex = currentBatchIndex + 1;
      setCurrentBatchIndex(newIndex);
      if (onBatchChange) {
        onBatchChange(batches[newIndex]);
      }
    }
  };

  const generatePdf = (allBatches = false) => {
    if (!safeCurrentBatch) return;

    setIsGeneratingPdf(true);

    try {
      const targetBatches = allBatches && batches && batches.length > 0 ? batches : [safeCurrentBatch];
      
      // Transform BatchFormData to PdfCompatibleBatch format
      const formattedBatches = targetBatches.map(batch => {
        const pdfBatch = transformToPdfBatch(batch);
        // Ensure barcodes are properly set
        pdfBatch.barcodes = getBarcodes(batch);
        return pdfBatch;
      });
      
      // Use the transformed batches with the PDF generator
      PdfGenerator.generateBarcodesPdf(
        formattedBatches,
        (batch: any) => batch.barcodes || [],
        (batch: any) => batch.batch_number || batch.id,
        allBatches
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!safeCurrentBatch) return null;

  const hasMultipleBatches = batches.length > 1;
  const totalBatches = batches.length || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-w-4xl max-h-[90vh] flex flex-col',
        'overflow-hidden'
      )}>
        <DialogHeader>
          <DialogTitle>Barcode Viewer</DialogTitle>
        </DialogHeader>

        {safeCurrentBatch && (
          <>
            <BatchInfo 
              batch={safeCurrentBatch} 
              getQuantityPerBox={getQuantityPerBox} 
              productName={safeCurrentBatch.productName}
              productSku={safeCurrentBatch.productSku}
            />
            
            <div className="mb-6">
              <BarcodeList 
                batch={{
                  ...safeCurrentBatch,
                  product_id: '',
                  total_quantity: (safeCurrentBatch.quantityPerBox || 0) * (safeCurrentBatch.boxCount || 0),
                  total_boxes: safeCurrentBatch.boxCount || 0,
                  status: 'active',
                  processed_at: new Date().toISOString(),
                  created_at: safeCurrentBatch.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }}
                getBarcodes={getBarcodes}
                getBatchNumber={getBatchNumber}
                hasMultipleBatches={batches.length > 1}
              />
            </div>
            
            <BarcodeActions 
              hasMultipleBatches={hasMultipleBatches}
              isGeneratingPdf={isGeneratingPdf}
              onGenerateSingleBatch={() => generatePdf(false)}
              onGenerateAllBatches={() => generatePdf(true)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
