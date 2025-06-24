// StockInWizard.tsx - handles stock-in processing via Edge Function
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as generateUUID } from 'uuid';
import { BarcodeViewerDialog } from './BarcodeViewerDialog';
import { Loader2 } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { BatchFormData } from './StockInStepBatches';

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { ToastAction } from "@/components/ui/toast";

// Import step components
import StockInStepReview from './StockInStepReview';
import StockInStepBatches from './StockInStepBatches';
import StockInStepFinalize from './StockInStepFinalize';

// Import shared types
import { BoxData, StepType, LOCATION_SEPARATOR, BatchData } from '../../types/shared';

// Define StockIn type based on database schema and StockInRequestData requirements
interface StockIn {
  id: string;
  // Product information (joined from products table)
  product: {
    id: string | null;
    name: string;
    sku?: string | null;
  };
  // Submitter information (joined from profiles table)
  submitter: {
    id: string | null;
    name: string;
    username: string;
  } | null;
  // Core fields from stock_in table
  boxes: number;
  status: "pending" | "approved" | "rejected" | "completed" | "processing";
  created_at: string;
  source: string;
  notes?: string | null;
  rejection_reason?: string | null;
  processed_by?: string | null;
  updated_at?: string | null;
  // Additional fields from stock_in table
  product_id?: string | null;
  requested_by?: string | null;
  warehouse_id?: string | null;
  quantity?: number | null;
  // UI-only fields (not in database)
  warehouse_name?: string;
  location_name?: string;
  location_id?: string;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  batch_id?: string | null;
  // For batch processing
  number_of_boxes?: number | null;
}

// Helper function to generate UUID if uuid package is not available
const generateUUIDFallback = () => {
  let dt = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

interface StockInWizard2Props {
  stockIn: StockIn;
  userId: string;
  onComplete?: (batchId: string) => void;
  onCancel?: () => void;
}

export interface DefaultValuesType {
  quantity: number;
  color: string;
  size: string;
}

export interface ProcessingStatusType {
  inProgress: boolean;
  message: string;
  currentBatch: number;
  totalBatches: number;
}

const StockInWizard: React.FC<StockInWizard2Props> = ({
  stockIn,
  userId,
  onComplete,
  onCancel,
}) => {
  // State initialization
  const [activeStep, setActiveStep] = useState<StepType>('review');
  const [batches, setBatches] = useState<Array<BatchFormData & { id: string }>>([]);
  const [boxesData, setBoxesData] = useState<BoxData[]>([]);
  const [confirmedBoxes, setConfirmedBoxes] = useState<BoxData[]>([]);
  const [remainingBoxes, setRemainingBoxes] = useState<number>(stockIn.boxes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedBatchId, setProcessedBatchId] = useState<string | null>(null);
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false);
  const [selectedBatchForBarcode, setSelectedBatchForBarcode] = useState<BatchFormData | null>(null);
  
  // Transform batch data for BarcodeViewerDialog
  const transformBatchForBarcode = (batch: BatchFormData) => {
    const now = new Date().toISOString();
    const quantityPerBox = Number(batch.quantityPerBox) || 1;
    const boxCount = Number(batch.boxCount) || 1;
    
    return {
      ...batch,
      // Ensure all required fields for BatchData are present
      id: batch.id,
      product_id: stockIn.product_id || batch.id,
      product_name: stockIn.product.name,
      product_sku: stockIn.product.sku || '',
      total_quantity: quantityPerBox * boxCount,
      total_boxes: boxCount,
      status: 'pending',
      processed_at: now,
      created_at: batch.created_at || now,
      updated_at: now,
      warehouse_id: batch.warehouse_id,
      warehouse_name: batch.warehouse_name,
      location_id: batch.location_id,
      location_name: batch.location_name,
      boxCount: boxCount,
      quantityPerBox: quantityPerBox,
      color: batch.color || '',
      size: batch.size || '',
      boxBarcodes: batch.boxBarcodes || [],
      barcodes: batch.boxBarcodes || [],
      batch_number: batch.id,
      quantity_per_box: quantityPerBox,
      // Explicitly set quantity to ensure it's not overridden by spread
      quantity: quantityPerBox * boxCount
    } as const;
  };
  const [locationId, setLocationId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [defaultValues, setDefaultValues] = useState<DefaultValuesType>({
    quantity: 1,
    color: '',
    size: '',
  });
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatusType>({
    inProgress: false,
    message: 'Processing stock-in request...',
    currentBatch: 0,
    totalBatches: 0,
  });
  const [runId] = useState<string>(() => generateUUID());
  
  // Update remaining boxes when confirmed boxes change
  useEffect(() => {
    setRemainingBoxes(prev => {
      const newRemaining = stockIn.boxes - confirmedBoxes.length;
      return newRemaining >= 0 ? newRemaining : 0;
    });
  }, [confirmedBoxes, stockIn.boxes]);

  const updateProcessingStatus = useCallback((status: Partial<ProcessingStatusType>) => {
    setProcessingStatus(prev => ({
      ...prev,
      ...status,
      currentBatch: status.currentBatch !== undefined ? status.currentBatch : prev.currentBatch,
      totalBatches: status.totalBatches !== undefined ? status.totalBatches : prev.totalBatches,
    }));
  }, []);

  // Hooks
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Log the current state to help with debugging
    console.log("Current step:", activeStep);
    console.log("Boxes data:", boxesData);
  }, [activeStep, boxesData]);

  // Memoize the navigation function to prevent unnecessary rerenders
  const navigateToStep = useCallback((step: StepType) => {
    console.log(`Navigating to step: ${step} from ${activeStep}`);
    setActiveStep(step);
  }, [activeStep]);

  // Handle cancel action
  const handleCancel = useCallback((): void => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/stock-in');
    }
  }, [navigate, onCancel]);

  // Handle warehouse and location selection
  const handleWarehouseLocationChange = useCallback((newWarehouseId: string, newLocationId: string) => {
    setWarehouseId(newWarehouseId);
    setLocationId(newLocationId);

    // Clear existing boxes when location changes
    setBoxesData([]);
  }, []);

  // Simple navigation to next step without initializing boxes
  const proceedToBoxDetails = async (): Promise<void> => {
    try {
      // Just navigate to the batches step without creating boxes upfront
      navigateToStep('batches');
    } catch (error) {
      console.error("Error proceeding to box details:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update an individual box
  const updateBox = useCallback((index: number, field: keyof BoxData, value: string | number): void => {
    setBoxesData(currentBoxes => {
      const updatedBoxes = [...currentBoxes];
      updatedBoxes[index] = {
        ...updatedBoxes[index],
        [field]: value,
      };
      return updatedBoxes;
    });
  }, []);

  // Update box location (warehouse and location)
  const updateBoxLocation = useCallback((index: number, warehouseId: string, locationId: string): void => {
    console.log(`Updating box ${index} location to warehouse: ${warehouseId}, location: ${locationId}`);
    setBoxesData(currentBoxes => {
      const updatedBoxes = [...currentBoxes];
      updatedBoxes[index] = {
        ...updatedBoxes[index],
        warehouse_id: warehouseId,
        location_id: locationId
      };
      return updatedBoxes;
    });
  }, []);

  // Apply default values to all boxes
  const applyToAllBoxes = useCallback((): void => {
    setBoxesData(currentBoxes =>
      currentBoxes.map(box => ({
        ...box,
        quantity: defaultValues.quantity,
        color: defaultValues.color,
        size: defaultValues.size,
      }))
    );

    toast({
      title: "Applied to All",
      description: "Default values have been applied to all boxes",
    });
  }, [boxesData, defaultValues, toast]);

  // Group boxes by warehouse/location to create batches
  // This is now handled by the Edge Function
  const getBoxesByLocation = useCallback((): Record<string, BoxData[]> => {
    const boxesByLocation: Record<string, BoxData[]> = {};

    boxesData.forEach((box) => {
      if (box.warehouse_id && box.location_id) {
        const key = `${box.warehouse_id}${LOCATION_SEPARATOR}${box.location_id}`;
        if (!boxesByLocation[key]) {
          boxesByLocation[key] = [];
        }
        boxesByLocation[key].push(box);
      }
    });

    return boxesByLocation;
  }, [boxesData]);

  // Submit the processed stock in via Edge Function
  const handleSubmit = async (): Promise<void> => {
    if (!stockIn.id || !userId) {
      toast({
        title: "Error",
        description: "Missing stock in information or user ID",
        variant: "destructive",
      });
      return;
    }

    if (batches.length === 0) {
      toast({
        title: "No Batches",
        description: "Please create at least one batch before submitting",
        variant: "destructive",
      });
      return;
    }

    // Validate all batches have required data
    const invalidBatches = batches.filter(batch => 
      !batch.warehouse_id || !batch.location_id || batch.boxCount <= 0 || batch.quantityPerBox <= 0
    );

    if (invalidBatches.length > 0) {
      toast({
        title: "Invalid Data",
        description: `${invalidBatches.length} batches have missing or invalid data`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    updateProcessingStatus({
      inProgress: true,
      message: 'Sending request to process stock-in...',
      currentBatch: 0,
      totalBatches: batches.length || 1
    });

    try {
      console.log('Processing stock-in via Edge Function...');

      // Format payload using the batch structure
      const payload = {
        run_id: runId,
        stock_in_id: stockIn.id,
        user_id: userId,
        product_id: stockIn.product?.id,
        batches: batches.map((b) => ({
          warehouse_id: b.warehouse_id,
          warehouse_name: b.warehouse_name,
          location_id: b.location_id,
          location_name: b.location_name,
          boxCount: Number(b.boxCount),
          quantityPerBox: Number(b.quantityPerBox),
          color: b.color || '',
          size: b.size || '',
          batchBarcode: b.batchBarcode || undefined,
          boxBarcodes: b.boxBarcodes || undefined,
        }))
      };

      // Get user information from the Supabase client
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        throw new Error('Failed to get user information');
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('stock-in-process', {
        body: {
          ...payload,
          _requesting_user_id: userData.user?.id
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to process stock-in');
      }
      
      console.log('Edge Function response:', data);
      
      if (!data?.batch_ids?.length) {
        console.error('Edge function returned no batch IDs:', data);
        throw new Error('No batch IDs returned from edge function');
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['processed-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-in-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-data'] });

      // Get all batch IDs for barcode viewing
      const batchIds = data.batch_ids;
      // Define firstBatchId in a higher scope so it's accessible in the setTimeout callback
      let firstBatchId = batchIds[0];
      const batchCount = batchIds.length;
      
      console.log(`${batchCount} batch IDs for barcode viewing:`, batchIds);
      
      // Fetch all batch details for barcode viewing
      const fetchBatchDetails = async (batchId: string) => {
        try {
          const { data: batchData } = await supabase
            .from('processed_batches')
            .select(`
              *,
              product:products(id, name, sku),
              warehouse:warehouses(id, name),
              location:warehouse_locations(id, name)
            `)
            .eq('id', batchId)
            .single();

          if (batchData) {
            const { data: barcodes } = await supabase
              .from('barcodes')
              .select('barcode')
              .eq('batch_id', batchId)
              .order('created_at');

            return {
              ...batchData,
              id: batchId,
              product_name: batchData.product?.name || 'Unknown Product',
              product_sku: batchData.product?.sku || 'N/A',
              warehouse_name: batchData.warehouse_name || 'Unknown Warehouse',
              location_name: batchData.location_name || 'Unknown Location',
              barcodes: barcodes?.map(b => b.barcode) || []
            };
          }
        } catch (error) {
          console.error(`Error fetching details for batch ${batchId}:`, error);
        }
        return null;
      };

      // Show success toast with View Barcodes action
      const showBarcodes = async () => {
        try {
          setIsLoading(true);
          // Fetch all batch details
          const batchPromises = batchIds.map(batchId => fetchBatchDetails(batchId));
          const batchesData = (await Promise.all(batchPromises)).filter(Boolean);
          
          if (batchesData.length > 0) {
            // Set the first batch as selected by default
            setSelectedBatchForBarcode(batchesData[0]);
            // Store all batches for navigation
            setBatches(batchesData);
            setShowBarcodeDialog(true);
          } else {
            toast({
              title: 'No Batch Data',
              description: 'Could not load batch details',
              variant: 'destructive',
            });
          }
        } catch (error) {
          console.error('Error fetching batch details:', error);
          toast({
            title: 'Error',
            description: 'Failed to load batch details',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };

      // Show toast with action button
      const toastId = toast({
        variant: "default",
        title: 'Stock-In Processed Successfully',
        description: (
          <div className="flex flex-col gap-2">
            <p>{`${batchCount} ${batchCount === 1 ? 'batch' : 'batches'} processed`}</p>
            <button
              onClick={(e) => {
                e.preventDefault();
                showBarcodes();
                toastId.dismiss();
              }}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-2"
            >
              View Barcodes
            </button>
          </div>
        ),
        duration: 15000,
      });
      
      console.log('Enhanced toast with action created for', batchCount, 'batches');
      
      // Also log the toast action for debugging
      console.log('Toast with action created for batch ID:', firstBatchId);

      if (onComplete && data.batch_ids?.length) {
        onComplete(data.batch_ids[0]);
      }
      
      // Navigate to success step or next view
      setActiveStep('finalize');
      
    } catch (error) {
      console.error('Error processing stock-in:', error);
      let errorMessage = 'Failed to process stock-in';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Try to update stock_in to rejected status
      try {
        await supabase
          .from('stock_in')
          .update({ 
            status: 'rejected',
            rejection_reason: errorMessage
          })
          .eq('id', stockIn.id);
      } catch (updateError) {
        console.error("Failed to update status after error:", updateError);
      }
    } finally {
      setIsSubmitting(false);
      updateProcessingStatus({
        inProgress: false,
        message: '',
        currentBatch: 0,
        totalBatches: 0
      });
    }
  };

  // When user adds a batch in Step 2
  const handleAddBatch = useCallback((batch: BatchFormData): void => {
    setBatches((prev) => {
      const newBatches = [...prev, batch];
      // Ensure we're not trying to spread undefined if boxes is not defined
      const boxesToAdd = batch.boxes || [];
      setBoxesData(prevBoxes => [...prevBoxes, ...boxesToAdd]);
      setRemainingBoxes(prev => Math.max(0, prev - boxesToAdd.length));
      return newBatches;
    });
  }, []);

  // Add function to delete a batch
  const handleDeleteBatch = useCallback((batchIndex: number): void => {
    setBatches(prev => {
      const newBatches = [...prev];
      const deletedBatch = newBatches.splice(batchIndex, 1)[0];
      if (deletedBatch?.boxes?.length) {
        setRemainingBoxes(prev => prev + deletedBatch.boxes.length);
      }
      return newBatches;
    });
  }, []);

  // Use our breakpoint hook for responsive design
  const { isMobile, isSmall, isMedium } = useBreakpoint();

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <h2 className="text-xl sm:text-2xl font-bold">Stock In Wizard</h2>
      
      <Tabs value={activeStep} className="w-full">
        <TabsList className="grid w-full grid-cols-3 p-1">
          <TabsTrigger 
            value="review" 
            onClick={() => navigateToStep('review')}
            className="py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-medium"
          >
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span className="rounded-full bg-muted w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium">
                1
              </span>
              <span className="text-center">{isMobile ? "Details" : "Verify Details"}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="batches"
            onClick={() => navigateToStep('batches')}
            disabled={activeStep === 'review'}
            className="py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-medium"
          >
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span className="rounded-full bg-muted w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium">
                2
              </span>
              <span className="text-center">{isMobile ? "Boxes" : "Box Details"}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="finalize"
            onClick={() => navigateToStep('finalize')}
            disabled={activeStep === 'review' || batches.length === 0}
            className="py-2 sm:py-3 text-xs sm:text-sm data-[state=active]:text-primary data-[state=active]:font-medium"
          >
            <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
              <span className="rounded-full bg-muted w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-medium">
                3
              </span>
              <span className="text-center">{isMobile ? "Submit" : "Preview & Submit"}</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-4 sm:mt-6">
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
            <StockInStepReview
              stockIn={stockIn}
              onContinue={proceedToBoxDetails}
              onCancel={handleCancel}
              warehouseId={warehouseId}
              setWarehouseId={setWarehouseId}
              locationId={locationId}
              setLocationId={setLocationId}
              defaultValues={defaultValues}
              setDefaultValues={setDefaultValues}
              confirmedBoxes={confirmedBoxes}
              onBoxesConfirmed={setConfirmedBoxes}
              isLoading={isLoading}
            />
          </div>
        </TabsContent>

        <TabsContent value="batches" className="mt-4 sm:mt-6">
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
            <StockInStepBatches
              onBack={() => navigateToStep('review')}
              onContinue={() => navigateToStep('finalize')}
              batches={batches}
              setBatches={setBatches}
              stockIn={stockIn}
              defaultValues={defaultValues}
            />
          </div>
        </TabsContent>

        <TabsContent value="finalize" className="mt-4 sm:mt-6">
          <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
            <StockInStepFinalize
              batches={batches}
              stockIn={stockIn}
              onSubmit={handleSubmit}
              onBack={() => navigateToStep('batches')}
              isSubmitting={isSubmitting}
              processingStatus={processingStatus}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Barcode Viewer Dialog */}
      {showBarcodeDialog && selectedBatchForBarcode && (
        <BarcodeViewerDialog
          open={showBarcodeDialog}
          onOpenChange={setShowBarcodeDialog}
          batch={transformBatchForBarcode(selectedBatchForBarcode)}
          batches={batches.map(transformBatchForBarcode)}
          onBatchChange={(batchId) => {
            if (!batchId) return;
            const selected = batches.find(b => b.id === batchId);
            if (selected) {
              setSelectedBatchForBarcode(selected);
            }
          }}
        />
      )}
    </div>
  );
};

export default StockInWizard;