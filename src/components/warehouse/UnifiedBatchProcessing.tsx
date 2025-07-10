import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useBatchStockIn } from '@/hooks/useBatchStockIn';
import { useStockInData } from '@/hooks/useStockInData';
import { toast } from 'sonner';
import { BackButton } from '@/components/warehouse/BackButton';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  CheckCircle, 
  PackagePlus,
  Printer, 
  Save,
  Loader2,
  Box,
  Barcode
} from 'lucide-react';
import { ProcessedBatch } from '@/types/batchStockIn';
import { useQueryClient } from '@tanstack/react-query';
import { BatchForm } from '@/components/warehouse/BatchForm';
import { BatchList } from '@/components/warehouse/BatchList';
import { BarcodePreview } from '@/components/warehouse/BarcodePreview';
import { BoxDetailsSection } from '@/components/warehouse/BoxDetailsSection';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateBarcodeString } from '@/utils/barcodeUtils';
import { useProcessedBatches } from '@/hooks/useProcessedBatches';

// Define the template type
interface BatchTemplate {
  name: string;
  boxes_count: number;
  quantity_per_box: number;
  color?: string;
  size?: string;
}

interface BoxMetadata {
  barcode: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  remarks?: string;
}

interface UnifiedBatchProcessingProps {
  adminMode?: boolean;
  sheetMode?: boolean;
  onClose?: () => void;
  stockInId?: string;
  onComplete?: (id: string) => void;
}

const UnifiedBatchProcessing: React.FC<UnifiedBatchProcessingProps> = ({ 
  adminMode = false, 
  sheetMode = false,
  onClose,
  stockInId: propStockInId,
  onComplete
}) => {
  const { stockInId: paramStockInId } = useParams<{ stockInId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Use the prop stockInId if provided, otherwise use the one from URL params
  const finalStockInId = propStockInId || paramStockInId;
  const { stockInData, isLoadingStockIn } = useStockInData(finalStockInId);
  const queryClient = useQueryClient();
  
  // Commonly used templates for quick batch creation
  const [templates, setTemplates] = useState<BatchTemplate[]>([
    { name: 'Standard Box (50)', boxes_count: 1, quantity_per_box: 50 },
    { name: 'Small Box (25)', boxes_count: 1, quantity_per_box: 25 },
    { name: 'Large Box (100)', boxes_count: 1, quantity_per_box: 100 },
  ]);

  const [source, setSource] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [remainingBoxes, setRemainingBoxes] = useState<number>(0);
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [processedBatchId, setProcessedBatchId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<string>('batch-creation');
  const [boxesWithMetadata, setBoxesWithMetadata] = useState<Record<string, BoxMetadata>>({});
  const [processingBarcodes, setProcessingBarcodes] = useState<boolean>(false);
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);
  
  // Track recent warehouse/location selections for quick reuse
  const [recentLocations, setRecentLocations] = useState<Array<{warehouse_id: string, location_id: string, name: string}>>([]);
  
  const handleGoBack = () => {
    if (sheetMode && onClose) {
      onClose();
    } else {
      if (adminMode) {
        navigate('/admin/stock-in');
      } else {
        navigate('/manager/stock-in');
      }
    }
  };

  const {
    batches,
    addBatch,
    editBatch,
    deleteBatch,
    editingIndex,
    setEditingIndex,
    submitStockIn,
    isSubmitting,
    isProcessing,
    isSuccess,
    barcodeErrors,
    resetBatches
  } = useBatchStockIn(user?.id || '');

  // Populate form with stockInData when it's loaded
  useEffect(() => {
    if (stockInData) {
      setSource(stockInData.source || '');
      setNotes(stockInData.notes || '');
      
      // Initialize remaining boxes from stock in data with safety check
      const totalBoxes = stockInData.boxes || 0;
      const batchBoxesCount = batches.reduce((sum, batch) => sum + (batch?.boxes_count || 0), 0);
      setRemainingBoxes(totalBoxes - batchBoxesCount);
    }
  }, [stockInData, batches]);

  // Subscribe to processed batches to get the batch ID when it's created
  useEffect(() => {
    if (isSubmitting || isProcessing) {
      const channel = supabase
        .channel('processed-batch-creation')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'processed_batches' },
          (payload) => {
            if (payload.new && payload.new.stock_in_id === finalStockInId) {
              setProcessedBatchId(payload.new.id);
              console.log(`Setting processed batch ID: ${payload.new.id}`);
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isSubmitting, isProcessing, finalStockInId]);

  // Navigate to batches overview page after successful submission
  useEffect(() => {
    if (isSuccess && !isProcessing && !isSubmitting && !isNavigating) {
      setIsNavigating(true);
      queryClient.invalidateQueries({ queryKey: ['inventory-data'] });
      queryClient.invalidateQueries({ queryKey: ['stock-in-requests'] });
      queryClient.invalidateQueries({ queryKey: ['processed-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock-in-batches', finalStockInId] });
      
      // Show success message
      if (barcodeErrors && barcodeErrors.length > 0) {
        toast('Batch Processed with Warnings', {
          description: 'There were some issues with barcode processing. Please continue to barcode assignment.'
        });
        
        // Automatically move to barcode assignment step
        setActiveStep('barcode-assignment');
      } else {
        toast.success('Batch Processed Successfully', {
          description: 'All batches have been processed. You can now assign barcodes.'
        });
        
        // Automatically move to barcode assignment step
        setTimeout(() => {
          setActiveStep('barcode-assignment');
        }, 500);
      }
    }
  }, [isSuccess, isProcessing, isSubmitting, queryClient, navigate, finalStockInId, barcodeErrors, isNavigating]);

  // Custom batch add function that validates against remaining boxes
  const handleAddBatch = (formData: any) => {
    // Prevent adding new batches when we're submitting
    if (isSubmitting || isProcessing || formSubmitted) {
      return;
    }

    // If editing, we need to account for the current batch's boxes
    const currentEditingBoxes = editingIndex !== null ? batches[editingIndex].boxes_count : 0;
    const effectiveNewBoxes = editingIndex !== null 
      ? formData.boxes_count - currentEditingBoxes 
      : formData.boxes_count;

    // Check if adding this batch would exceed the remaining boxes
    if (effectiveNewBoxes > remainingBoxes && editingIndex === null) {
      toast.error('Box count exceeds limit', {
        description: `You can only add ${remainingBoxes} more boxes. Please adjust the quantity.`
      });
      return;
    }
    
    // Save this location combination for quick access if it's new
    const newLocation = {
      warehouse_id: formData.warehouse?.id || '',
      location_id: formData.location?.id || '',
      name: `${formData.warehouse?.name || ''} - ${formData.location?.floor || ''}${formData.location?.zone || ''}`
    };
    
    // Add to recent locations if not already there
    if (newLocation.warehouse_id && newLocation.location_id && 
        !recentLocations.some(loc => 
          loc.warehouse_id === newLocation.warehouse_id && 
          loc.location_id === newLocation.location_id)) {
      setRecentLocations(prev => [newLocation, ...prev.slice(0, 4)]);
    }

    // Proceed with adding the batch
    addBatch(formData);
  };
  
  // Apply a template to quickly create a batch
  const applyTemplate = (template: BatchTemplate) => {
    if (!stockInData?.product) {
      toast.error('Missing product information', {
        description: 'Please select a product before applying a template'
      });
      return;
    }
    
    // If we have recent locations, use the most recent one
    const recentLocation = recentLocations.length > 0 ? recentLocations[0] : null;
    
    // Find warehouse and location objects (would need proper implementation)
    // This is a placeholder - in a real implementation, you'd fetch these objects
    const templateBatch = {
      product: stockInData.product,
      warehouse: { id: recentLocation?.warehouse_id || '' },
      location: { id: recentLocation?.location_id || '' },
      boxes_count: template.boxes_count,
      quantity_per_box: template.quantity_per_box,
      color: template.color || '',
      size: template.size || ''
    };
    
    handleAddBatch(templateBatch);
  };

  const handleBatchSubmission = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event propagation
    
    if (!user) return;
    if (batches.length === 0) {
      toast.error('No batches added', {
        description: 'Please add at least one batch before submitting'
      });
      return;
    }

    setFormSubmitted(true);

    // Fixed type handling for productId
    let productId: string;
    
    if (stockInData?.product && 'id' in stockInData.product && stockInData.product.id) {
      productId = stockInData.product.id;
    } else if (batches.length > 0 && batches[0].product_id) {
      productId = batches[0].product_id;
    } else {
      console.error("No product ID found in either stockInData or batches");
      toast.error('Error', {
        description: 'Could not determine product ID for batch submission'
      });
      return;
    }
    
    // Ensure each batch has the required properties
    const processedBatches = batches.map(batch => ({
      ...batch,
      quantity_per_box: batch.quantity_per_box || 1,
      created_by: user.id
    }));
    
    submitStockIn({
      stockInId: finalStockInId,
      productId,
      source,
      notes,
      submittedBy: user.id,
      batches: processedBatches
    });
  };
  
  // Generate barcodes for all boxes
  const generateBarcodes = async () => {
    if (!stockInData?.product) {
      toast.error('Error', {
        description: 'Missing product information'
      });
      return;
    }
    
    setProcessingBarcodes(true);
    
    try {
      const productSku = stockInData.product.sku || '';
      const productCategory = stockInData.product.category || '';
      
      // Create a new object to store generated barcodes
      const updatedBoxesWithMetadata = { ...boxesWithMetadata };
      
      // Batch barcode generation for all boxes
      for (const batch of batches) {
        if (!batch.barcodes || batch.barcodes.length === 0) continue;
        
        for (let i = 0; i < batch.barcodes.length; i++) {
          const oldBarcode = batch.barcodes[i];
          const boxNumber = i + 1;
          
          // Generate a proper barcode
          const newBarcode = await generateBarcodeString(
            productCategory,
            productSku,
            boxNumber
          );
          
          // Add or update metadata with new barcode
          updatedBoxesWithMetadata[newBarcode] = {
            ...(updatedBoxesWithMetadata[oldBarcode] || {}),
            barcode: newBarcode,
            weight: updatedBoxesWithMetadata[oldBarcode]?.weight || 0,
            width: updatedBoxesWithMetadata[oldBarcode]?.width || 0,
            height: updatedBoxesWithMetadata[oldBarcode]?.height || 0,
            length: updatedBoxesWithMetadata[oldBarcode]?.length || 0,
            remarks: updatedBoxesWithMetadata[oldBarcode]?.remarks || ''
          };
          
          // Delete the old barcode entry if different
          if (oldBarcode !== newBarcode && updatedBoxesWithMetadata[oldBarcode]) {
            delete updatedBoxesWithMetadata[oldBarcode];
          }
        }
      }
      
      setBoxesWithMetadata(updatedBoxesWithMetadata);
      toast.success('Barcodes Generated', {
        description: `Successfully generated ${Object.keys(updatedBoxesWithMetadata).length} barcodes`
      });
      
    } catch (error) {
      console.error('Error generating barcodes:', error);
      toast.error('Failed to Generate Barcodes', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setProcessingBarcodes(false);
    }
  };
  
  // Process all metadata updates and finish processing
  const completeProcessing = async () => {
    if (!finalStockInId || !batches || batches.length === 0 || Object.keys(boxesWithMetadata).length === 0) {
      toast.error('Missing data', {
        description: 'Please ensure batches and barcodes are properly set up before completing'
      });
      return;
    }
    
    setProcessingBarcodes(true);
    
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
        .eq('id', finalStockInId);
      
      toast.success('Processing Completed', {
        description: 'Stock-in has been successfully processed and inventory updated'
      });
      
      setProcessingComplete(true);
      
      // Prepare for navigation
      if (onComplete && processedBatchId) {
        setTimeout(() => onComplete(processedBatchId), 1000);
        return;
      }
      
      if (onClose && sheetMode) {
        setTimeout(() => onClose(), 1000);
        return;
      }
      
      setTimeout(() => {
        navigate(`${adminMode ? '/admin' : '/manager'}/stock-in/batches/${finalStockInId}`, { 
          state: { 
            fromBatchProcessing: true,
            batchId: processedBatchId,
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error completing processing:', error);
      toast.error('Failed to Complete Processing', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setProcessingBarcodes(false);
    }
  };

  const handleMetadataChange = (barcode: string, field: keyof BoxMetadata, value: any) => {
    setBoxesWithMetadata(prev => ({
      ...prev,
      [barcode]: {
        ...prev[barcode],
        [field]: value
      }
    }));
  };
  
  // Apply metadata to multiple boxes at once
  const applyMetadataToSelected = (selectedBarcodes: string[], metadata: Partial<BoxMetadata>) => {
    setBoxesWithMetadata(prev => {
      const updated = { ...prev };
      selectedBarcodes.forEach(barcode => {
        updated[barcode] = {
          ...updated[barcode],
          ...metadata
        };
      });
      return updated;
    });
    
    toast.success('Metadata Applied', {
      description: `Applied metadata to ${selectedBarcodes.length} box(es)`
    });
  };
  
  // Handle printing barcodes
  const handlePrint = () => {
    window.print();
  };

  // Initialize barcode metadata when batches are created
  useEffect(() => {
    if (batches && batches.length > 0 && activeStep === 'barcode-assignment') {
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
      
      setBoxesWithMetadata(prev => ({...prev, ...initialBoxMetadata}));
    }
  }, [batches, activeStep]);

  if (isLoadingStockIn) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading batch processing...</p>
      </div>
    );
  }

  // Count total boxes across all batches
  const totalBoxes = stockInData?.boxes || 0;
  const batchBoxesCount = batches.reduce((sum, batch) => sum + (batch?.boxes_count || 0), 0);
  const allBoxesAdded = batchBoxesCount === totalBoxes;
  const barcodeCount = Object.keys(boxesWithMetadata).length;

  return (
    <>
      {!sheetMode && (
        <div className="flex items-center gap-2 mb-6">
          <BackButton onClick={handleGoBack} className="hover-lift" />
        </div>
      )}
      
      {!sheetMode && (
        <PageHeader 
          title={finalStockInId ? "All-in-One Batch Processing" : "Streamlined Batch Processing"}
          description={finalStockInId 
            ? `Process the stock-in request with our streamlined workflow` 
            : "Create, process and assign barcodes to batches - all in one place"
          }
        />
      )}
      
      {/* Main content */}
      <div className="space-y-4">
        {/* Product & Request Information */}
        {stockInData && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center">
                <span>{stockInData.product?.name}</span>
                <span className="text-sm font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {stockInData.status}
                </span>
              </CardTitle>
              <CardDescription>
                {stockInData.product?.sku && <span>SKU: {stockInData.product.sku} | </span>}
                Total Boxes: {totalBoxes} | Source: {stockInData.source}
                {stockInData.notes && <div className="mt-1">Notes: {stockInData.notes}</div>}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {/* Processing steps */}
        <Tabs 
          value={activeStep} 
          onValueChange={setActiveStep}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batch-creation" disabled={isSubmitting || isProcessing}>
              <Box className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Batch Creation</span>
              <span className="inline sm:hidden">Batches</span>
            </TabsTrigger>
            <TabsTrigger 
              value="barcode-assignment"
              disabled={!isSuccess || batches.length === 0}
            >
              <Barcode className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Barcode Assignment</span>
              <span className="inline sm:hidden">Barcodes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="review-complete" 
              disabled={barcodeCount === 0 || activeStep !== 'barcode-assignment'}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Review & Complete</span>
              <span className="inline sm:hidden">Complete</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Step 1: Batch Creation */}
          <TabsContent value="batch-creation" className="space-y-4">
            {/* Quick templates section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Quick Templates</CardTitle>
                <CardDescription>
                  Choose a pre-defined template to quickly create a batch
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {templates.map(template => (
                    <Button 
                      key={template.name}
                      variant="outline"
                      className="h-auto py-2 justify-start text-left flex flex-col items-start"
                      onClick={() => applyTemplate(template)}
                      disabled={remainingBoxes < template.boxes_count || isSubmitting || isProcessing}
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.boxes_count} box(es) with {template.quantity_per_box} items each
                      </span>
                    </Button>
                  ))}
                </div>
                
                {recentLocations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Locations:</h4>
                    <div className="flex flex-wrap gap-2">
                      {recentLocations.map((loc, index) => (
                        <Button 
                          key={index} 
                          variant="secondary" 
                          size="sm"
                          className="text-xs h-7 bg-slate-100"
                          // This would need implementation to actually use the location
                          onClick={() => toast({
                            title: "Location selected",
                            description: `Selected ${loc.name}`
                          })}
                        >
                          {loc.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Processing status if applicable */}
            {(isSubmitting || isProcessing) && (
              <Alert className="bg-blue-50 border-blue-200">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                <AlertTitle>Processing batches...</AlertTitle>
                <AlertDescription>
                  Please wait while we process your batches. This may take a moment.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Custom batch form */}
              <div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Custom Batch</CardTitle>
                    <CardDescription>
                      {remainingBoxes === 0 
                        ? "All boxes have been allocated" 
                        : `Create a custom batch - ${remainingBoxes} box(es) remaining`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {remainingBoxes === 0 ? (
                      <div className="bg-green-50 p-4 rounded-md text-green-700 text-center">
                        <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                        <p>All boxes for this stock-in request have been processed.</p>
                      </div>
                    ) : (
                      <BatchForm 
                        onAddBatch={handleAddBatch} 
                        isSubmitting={isSubmitting || isProcessing || formSubmitted}
                        editingBatch={editingIndex !== null ? batches[editingIndex] : undefined}
                        onCancel={editingIndex !== null ? () => setEditingIndex(null) : undefined}
                        maxBoxes={remainingBoxes + (editingIndex !== null ? batches[editingIndex].boxes_count : 0)}
                        stockInData={stockInData}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Batch List */}
              <div>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Batches</CardTitle>
                    <CardDescription>
                      {batches.length === 0 
                        ? "No batches added yet" 
                        : `${batches.length} batch(es) - ${batchBoxesCount}/${totalBoxes} boxes`
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 h-[calc(100%-80px)] overflow-y-auto">
                    <BatchList 
                      batches={batches.map(batch => ({
                        ...batch,
                        quantity_per_box: batch.quantity_per_box || 1,
                        created_by: user?.id || '',
                        warehouse_id: batch.warehouse_id, 
                        location_id: batch.location_id
                      }) as ProcessedBatch)}
                      editBatch={editBatch}
                      deleteBatch={deleteBatch}
                      handleBatchSubmission={handleBatchSubmission}
                      isSubmitting={isSubmitting}
                      isProcessing={isProcessing}
                      formSubmitted={formSubmitted}
                      barcodeValidationErrors={barcodeErrors}
                      remainingBoxes={remainingBoxes}
                    />
                  </CardContent>
                  
                  <CardFooter className="border-t pt-4">
                    <Button 
                      onClick={handleBatchSubmission}
                      className="w-full"
                      disabled={
                        batches.length === 0 || 
                        isSubmitting || 
                        isProcessing || 
                        formSubmitted || 
                        !allBoxesAdded
                      }
                    >
                      {isSubmitting || isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Process Batches {allBoxesAdded ? '' : `(${batchBoxesCount}/${totalBoxes} boxes)`}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Step 2: Barcode Assignment */}
          <TabsContent value="barcode-assignment" className="space-y-4">
            {barcodeErrors && barcodeErrors.length > 0 && (
              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Barcode Processing Issues</AlertTitle>
                <AlertDescription>
                  {barcodeErrors.length} barcode(s) had issues during processing. 
                  Please review and regenerate barcodes.
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Barcode Assignment</CardTitle>
                  <CardDescription>
                    Generate and assign barcodes for all boxes
                  </CardDescription>
                </div>
                <Button 
                  onClick={generateBarcodes} 
                  disabled={processingBarcodes || batches.length === 0}
                >
                  {processingBarcodes ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Barcode className="h-4 w-4 mr-2" />
                  )}
                  Generate Barcodes
                </Button>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {batches.map((batch, batchIndex) => (
                    <AccordionItem key={batchIndex} value={`batch-${batchIndex}`}>
                      <AccordionTrigger className="hover:bg-slate-50 px-4 py-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <span>Batch {batchIndex + 1}: {batch.boxes_count} box(es)</span>
                          {batch.warehouse_id && (
                            <span className="text-xs bg-slate-200 rounded px-2 py-0.5">
                              {/* We would need a function to get warehouse name */}
                              Warehouse ID: {batch.warehouse_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-2">
                          {batch.barcodes?.map((barcode, index) => {
                            const metadata = boxesWithMetadata[barcode] || { barcode };
                            
                            return (
                              <BoxDetailsSection
                                key={barcode + index}
                                boxNumber={index + 1}
                                metadata={metadata}
                                onChange={(field, value) => handleMetadataChange(barcode, field, value)}
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-end">
                <Button 
                  onClick={() => setActiveStep('review-complete')} 
                  disabled={Object.keys(boxesWithMetadata).length === 0}
                >
                  Continue to Review
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Step 3: Review & Complete */}
          <TabsContent value="review-complete" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Review & Complete</CardTitle>
                  <CardDescription>
                    Review all barcodes and complete the processing
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={handlePrint}
                  className="print:hidden"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print All Labels
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2">
                  {Object.keys(boxesWithMetadata).map((barcode) => (
                    <div key={barcode} className="border rounded-lg p-4 print:break-inside-avoid">
                      <BarcodePreview value={boxesWithMetadata[barcode].barcode} height={80} />
                      <div className="mt-2 text-sm">
                        <p><strong>Box ID:</strong> {boxesWithMetadata[barcode].barcode}</p>
                        {boxesWithMetadata[barcode].weight > 0 && <p><strong>Weight:</strong> {boxesWithMetadata[barcode].weight} kg</p>}
                        {(boxesWithMetadata[barcode].width || boxesWithMetadata[barcode].height || boxesWithMetadata[barcode].length) && (
                          <p><strong>Dimensions:</strong> {boxesWithMetadata[barcode].width || 0} x {boxesWithMetadata[barcode].height || 0} x {boxesWithMetadata[barcode].length || 0} cm</p>
                        )}
                        {boxesWithMetadata[barcode].remarks && <p><strong>Remarks:</strong> {boxesWithMetadata[barcode].remarks}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveStep('barcode-assignment')}
                  disabled={processingComplete}
                >
                  Back to Barcode Assignment
                </Button>
                
                <Button 
                  onClick={completeProcessing} 
                  disabled={processingBarcodes || Object.keys(boxesWithMetadata).length === 0 || processingComplete}
                >
                  {processingBarcodes ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {processingComplete ? "Processing Complete" : "Complete Processing"}
                </Button>
              </CardFooter>
            </Card>
            
            {processingComplete && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Processing Complete</AlertTitle>
                <AlertDescription>
                  Stock-in has been successfully processed and inventory updated.
                  {onClose ? " Closing sheet..." : " Redirecting to overview..."}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default UnifiedBatchProcessing;
