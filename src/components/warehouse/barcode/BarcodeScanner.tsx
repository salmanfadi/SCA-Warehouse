import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, Check, X, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { executeQuery } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import StockOutProgress from './StockOutProgress';
import StockOutItemsTable from './StockOutItemsTable';
import BatchDetails from './BatchDetails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define interfaces for type safety
interface BatchItem {
  id: string;
  barcode: string;
  quantity: number;
  product_id: string;
  batch_id: string;
  location_id?: string;
  product_name: string;
  batch_number: string;
  location_name?: string;
  deduct_quantity?: number;
}

interface StockOutRequest {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  remaining_quantity: number;
  requested_by: string;
  requested_at: string;
  status: string;
}

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onBatchItemFound: (batchItem: BatchItem) => void;
  isEnabled: boolean;
  isProcessing: boolean;
  isSuccess: boolean;
  stockOutRequest?: StockOutRequest;
  processedItems?: BatchItem[];
  onQuantityChange?: (quantity: number) => void;
  initialBarcode?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onBatchItemFound,
  isEnabled,
  isProcessing,
  isSuccess,
  stockOutRequest,
  processedItems = [],
  onQuantityChange,
  initialBarcode
}) => {
  const [barcode, setBarcode] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [currentBatchItem, setCurrentBatchItem] = useState<BatchItem | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [processedItemsState, setProcessedItemsState] = useState<BatchItem[]>(processedItems);
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set());
  const [showProductMismatch, setShowProductMismatch] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Update processed items when the prop changes
  useEffect(() => {
    if (processedItems && processedItems.length > 0) {
      setProcessedItemsState([...processedItems]);
      
      // Update scanned barcodes set
      const newScannedBarcodes = new Set<string>(scannedBarcodes);
      processedItems.forEach(item => {
        if (item.barcode) {
          newScannedBarcodes.add(item.barcode);
        }
      });
      setScannedBarcodes(newScannedBarcodes);
    }
  }, [processedItems]);
  
  // Process initialBarcode if provided
  useEffect(() => {
    if (initialBarcode && isEnabled && !isProcessing) {
      console.log('Processing initial barcode:', initialBarcode);
      setBarcode(initialBarcode);
    }
  }, [initialBarcode, isEnabled, isProcessing]);
  
  // Submit initial barcode after it's set
  useEffect(() => {
    if (initialBarcode && barcode === initialBarcode && isEnabled && !isProcessing) {
      // Automatically submit the barcode after a short delay
      const timer = setTimeout(() => {
        // We need to manually check the barcode here since we can't use handleSubmitBarcode in the dependency array
        if (barcode.trim() && isEnabled) {
          onBarcodeScanned(barcode);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [barcode, initialBarcode, isEnabled, isProcessing, onBarcodeScanned]);

  // Handle barcode input change
  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(e.target.value);
  };

  // Handle barcode submission
  const handleSubmitBarcode = async () => {
    if (!barcode.trim() || !isEnabled) return;
    
    try {
      // Check if barcode has already been scanned
      if (scannedBarcodes.has(barcode)) {
        toast({
          title: 'Duplicate Barcode',
          description: 'This barcode has already been scanned.',
          variant: 'destructive'
        });
        return;
      }
      
      setIsLoadingItems(true);
      setLoadingProgress(25);
      
      // Notify parent component
      onBarcodeScanned(barcode);
      
      // Simulate progress
      setTimeout(() => setLoadingProgress(50), 300);
      
      // Fetch batch item details
      await fetchBarcodeDetails(barcode);
    } catch (error) {
      console.error('Error submitting barcode:', error);
      toast({
        title: 'Error',
        description: 'Failed to process barcode. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingItems(false);
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 500);
      setBarcode('');
    }
  };

  // Handle barcode scan from camera
  const handleBarcodeScan = async (scannedBarcode: string) => {
    if (!isEnabled) return;
    
    setBarcode(scannedBarcode);
    setIsCameraOpen(false);
    
    try {
      // Check if barcode has already been scanned
      if (scannedBarcodes.has(scannedBarcode)) {
        toast({
          title: 'Duplicate Barcode',
          description: 'This barcode has already been scanned.',
          variant: 'destructive'
        });
        return;
      }
      
      setIsLoadingItems(true);
      setLoadingProgress(25);
      
      // Notify parent component
      onBarcodeScanned(scannedBarcode);
      
      // Simulate progress
      setTimeout(() => setLoadingProgress(50), 300);
      
      // Fetch batch item details
      await fetchBarcodeDetails(scannedBarcode);
    } catch (error) {
      console.error('Error processing scanned barcode:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process barcode. Please try again.',
      });
    } finally {
      setIsLoadingItems(false);
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 500);
    }
  };

  // Fetch batch item details for a barcode
  const fetchBarcodeDetails = async (barcodeValue: string) => {
    try {
      setIsLoadingItems(true);
      console.log('Scanning barcode:', barcodeValue);
      
      // First, log all tables that contain this barcode for debugging
      const debugTables = async (supabase: any, barcode: string) => {
        console.log('DEBUG: Checking barcode existence in different tables...');
        
        // Check barcodes table
        const { data: barcodeTableData } = await supabase
          .from('barcodes')
          .select('id, barcode, box_id, product_id')
          .eq('barcode', barcode)
          .maybeSingle();
        console.log('DEBUG: Barcodes table result:', barcodeTableData);
        
        // Check batch_items table
        const { data: batchItemData } = await supabase
          .from('batch_items')
          .select('id, barcode, product_id')
          .eq('barcode', barcode)
          .maybeSingle();
        console.log('DEBUG: Batch items table result:', batchItemData);
        
        // Check barcode_batch_view
        const { data: viewData } = await supabase
          .from('barcode_batch_view')
          .select('barcode_id, barcode, product_id, batch_item_id')
          .eq('barcode', barcode)
          .maybeSingle();
        console.log('DEBUG: barcode_batch_view result:', viewData);
      };
      
      const { data, error } = await executeQuery('barcode_batch_view', async (supabase) => {
        // Run debug checks first
        await debugTables(supabase, barcodeValue);
        
        // Use the barcode_batch_view to get all information in a single query
        console.log('Querying barcode_batch_view for barcode:', barcodeValue);
        const { data: barcodeData, error: barcodeError } = await supabase
          .from('barcode_batch_view')
          .select('*')
          .eq('barcode', barcodeValue)
          .maybeSingle(); // Changed from single() to maybeSingle() to avoid errors

        if (barcodeError) {
          console.error('Error fetching barcode data:', barcodeError);
          throw barcodeError;
        }
        
        if (!barcodeData) {
          console.error('No data found in barcode_batch_view for barcode:', barcodeValue);
          throw new Error(`No barcode data found for ${barcodeValue}`);
        }
        
        console.log('Found barcode data:', barcodeData);
        
        // Get location name if needed
        let locationName = 'Unknown Location';
        if (barcodeData.location_id) {
          const { data: locationData, error: locationError } = await supabase
            .from('warehouse_locations')
            .select('name')
            .eq('id', barcodeData.location_id)
            .maybeSingle();

          if (!locationError && locationData && locationData.name) {
            locationName = locationData.name;
          } else {
            console.log('Location not found or error:', locationError);
          }
        }
        
        // Return the formatted data
        const formattedData = {
          id: barcodeData.batch_item_id,
          barcode: barcodeData.barcode,
          batch_id: barcodeData.batch_id,
          product_id: barcodeData.product_id,
          warehouse_id: barcodeData.warehouse_id,
          location_id: barcodeData.location_id,
          color: barcodeData.color,
          size: barcodeData.size,
          quantity: barcodeData.quantity,
          status: barcodeData.status,
          created_at: barcodeData.created_at,
          updated_at: barcodeData.updated_at,
          // Additional fields for UI display
          batch_item_id: barcodeData.batch_item_id,
          batch_number: barcodeData.batch_number || barcodeData.barcode.split('-')[1] || 'Unknown',
          product_name: barcodeData.product_name || 'Unknown Product',
          product_sku: barcodeData.product_sku || null,
          product_description: barcodeData.product_description || null,
          product_category: barcodeData.product_category || null,
          location_name: locationName,
          box_id: barcodeData.box_id
        };
        
        console.log('Formatted batch item data:', formattedData);
        return formattedData;
      });
      
      if (error) {
        console.error('Error in barcode query:', error);
        toast({
          variant: 'destructive',
          title: 'Not Found',
          description: 'No batch item found with this barcode.'
        });
        return;
      }
      
      // The data should be available now since we're throwing errors in the query function
      // This is just a safeguard
      if (!data) {
        console.error('No data returned from query for barcode:', barcodeValue);
        toast({
          variant: 'destructive',
          title: 'Not Found',
          description: 'No batch item found with this barcode.'
        });
        return;
      }
      
      // Log successful data retrieval
      console.log('Successfully retrieved batch data for barcode:', barcodeValue);
      
      // If we have a stock out request, validate that the scanned product matches
      if (stockOutRequest && stockOutRequest.product_id) {
        if (data.product_id !== stockOutRequest.product_id) {
          // Product mismatch - show error
          setShowProductMismatch(true);
          toast({
            title: 'Product Mismatch',
            description: `Scanned ${data.product_name} but requested ${stockOutRequest.product_name}`,
            variant: 'destructive'
          });
          return;
        }
      }
      
      console.log('Found batch item:', data);
      
      // Add to scanned barcodes set
      setScannedBarcodes(prev => new Set(prev).add(data.barcode));
      
      // Set the current batch item
      setCurrentBatchItem(data);
      
      // Call the onBatchItemFound callback
      onBatchItemFound(data);
      
      // Reset product mismatch flag
      setShowProductMismatch(false);
    } catch (error) {
      console.error('Error in fetchBarcodeDetails:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process barcode. Please try again.'
      });
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Handle Enter key press in the barcode input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitBarcode();
    }
  };

  // Focus the barcode input when the component is enabled
  useEffect(() => {
    if (isEnabled) {
      const barcodeInput = document.getElementById('barcode-input');
      if (barcodeInput) {
        barcodeInput.focus();
      }
    }
  }, [isEnabled]);

  // Handle quantity change from the BatchDetails component
  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    
    if (onQuantityChange) {
      onQuantityChange(newQuantity);
    }
    
    if (currentBatchItem) {
      setCurrentBatchItem({
        ...currentBatchItem,
        deduct_quantity: newQuantity
      });
    }
  };
  
  // Handle processing the current batch item
  const handleProcessBatchItem = () => {
    if (!currentBatchItem) return;
    
    try {
      // Add the current batch item to processed items
      const updatedProcessedItems = [...processedItemsState, {
        ...currentBatchItem,
        deduct_quantity: quantity
      }];
      
      setProcessedItemsState(updatedProcessedItems);
      
      // Notify parent component with the updated batch item
      onBatchItemFound({
        ...currentBatchItem,
        deduct_quantity: quantity
      });
      
      // Clear current batch item
      setCurrentBatchItem(null);
      
      // Reset quantity
      setQuantity(1);
      
      // Show success toast
      toast({
        title: 'Item Processed',
        description: `Added ${quantity} of ${currentBatchItem.product_name} to the stockout list.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error processing batch item:', error);
      toast({
        title: 'Error',
        description: 'Failed to process batch item. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stock Out Request Progress - Only show if we have a stock out request */}
      {stockOutRequest && (
        <StockOutProgress stockOutRequest={stockOutRequest} />
      )}
      
      {/* Processed Items Table - Only show if we have processed items */}
      {stockOutRequest && processedItemsState.length > 0 && (
        <StockOutItemsTable 
          stockOutRequest={stockOutRequest}
          isLoading={isLoadingItems}
          processedItems={processedItemsState}
        />
      )}

      {/* Barcode Scanner Card */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {!isEnabled && (
              <Alert variant="default" className="mb-4 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Scanner Disabled</AlertTitle>
                <AlertDescription>
                  Please complete the current item or click "Scan Next Box" to continue scanning.
                </AlertDescription>
              </Alert>
            )}
            
            {showProductMismatch && (
              <Alert variant="destructive" className="mb-4">
                <X className="h-4 w-4" />
                <AlertTitle>Product Mismatch</AlertTitle>
                <AlertDescription>
                  The scanned product does not match the requested product.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center gap-2">
              <Input
                type="text"
                id="barcode-input"
                placeholder="Enter barcode"
                value={barcode}
                onChange={handleBarcodeChange}
                onKeyDown={handleKeyDown}
                disabled={!isEnabled || isProcessing}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCameraOpen(true)}
                disabled={!isEnabled || isProcessing}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={handleSubmitBarcode}
                disabled={!barcode.trim() || !isEnabled || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
            
            {/* Loading Progress Bar */}
            {loadingProgress > 0 && (
              <div className="space-y-1">
                <Progress value={loadingProgress} className="h-1" />
              </div>
            )}

            {isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Barcode processed successfully</span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center gap-2 justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Batch Item Details - Only show if we have a current batch item */}
      {currentBatchItem && (
        <Card>
          <CardContent className="pt-4">
            <BatchDetails 
              batchItem={currentBatchItem}
              onQuantityChange={handleQuantityChange}
              onProcess={handleProcessBatchItem}
              isProcessing={isProcessing}
              maxQuantity={currentBatchItem.quantity}
              stockOutRequest={stockOutRequest}
            />
          </CardContent>
        </Card>
      )}

      {/* Mobile Barcode Scanner Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Position the barcode in the center of the camera view for scanning
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-muted relative overflow-hidden rounded-md">
            <MobileBarcodeScanner
              onBarcodeScanned={handleBarcodeScan}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BarcodeScanner;
