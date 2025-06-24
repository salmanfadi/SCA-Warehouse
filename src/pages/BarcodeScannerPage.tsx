import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle2, ArrowLeft, Scan, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { executeQuery } from '@/lib/supabase';
import { fetchBarcodeData, fetchBarcodeFromBarcodesTable, fetchBatchItemData, fetchProductData, createBatchItemFromViewData, createSyntheticBatchItem, decreaseBatchItemQuantity } from '@/services/barcodeService';
import { validateBarcodeForStockOut as validateBarcode, calculateMaxDeductibleQuantity as calculateMaxQuantity } from '@/services/barcodeValidationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import our components
import BarcodeScanner from '@/components/warehouse/barcode/BarcodeScanner';
import BatchDetails from '@/components/warehouse/barcode/BatchDetails';
import DeductedBatchesTable from '@/components/warehouse/barcode/DeductedBatchesTable';
import StockOutProgress from '@/components/warehouse/barcode/StockOutProgress';
// Import types from BarcodeValidation
import { 
  BatchItem,
  DeductedBatch,
  StockOutRequest 
} from '@/components/warehouse/barcode/BarcodeValidation';
import { validateBarcodeForStockOut, calculateMaxDeductibleQuantity, createDeductedBatch } from '@/components/warehouse/barcode/BarcodeValidation';
import { approveStockOut, processStockOut } from '@/services/stockOutService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';

/**
 * BarcodeScannerPage Component
 * 
 * This page is used for processing stock out requests by scanning barcodes of boxes.
 * It is accessed in two ways:
 * 1. From StockOutApproval.tsx via the "Scan Barcode" button in the approval dialog
 *    - Uses route: /barcode-scanner/:stockOutId
 *    - Receives stockOutRequest data via location.state
 * 
 * 2. The BarcodeStockOutPage.tsx is a different component used for general barcode scanning
 *    - Uses route: /manager/stock-out/barcode-stock-out
 *    - It's a more generic barcode scanning page not tied to a specific stock out request
 * 
 * This component handles:
 * - Displaying product information
 * - Scanning barcodes
 * - Processing deducted batches
 * - Approving stock out requests
 */
export default function BarcodeScannerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stockOutId } = useParams<{ stockOutId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for barcode scanning
  const [barcode, setBarcode] = useState<string>('');
  const [batchItem, setBatchItem] = useState<BatchItem | null>(null);
  const [processingItem, setProcessingItem] = useState<any | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [userInputQuantity, setUserInputQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [processingComplete, setProcessingComplete] = useState<boolean>(false);
  const [scanningEnabled, setScanningEnabled] = useState<boolean>(true);
  const [isStockOutComplete, setIsStockOutComplete] = useState<boolean>(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<boolean>(false);
  const [allowRescan, setAllowRescan] = useState<boolean>(true);
  
  // State for stock out request processing
  // Initialize from localStorage if available, or empty array
  const savedBatchesKey = stockOutId ? `deducted_batches_${stockOutId}` : null;
  const [deductedBatches, setDeductedBatches] = useState<DeductedBatch[]>(() => {
    if (savedBatchesKey) {
      const saved = localStorage.getItem(savedBatchesKey);
      if (saved) {
        try {
          // Parse saved batches and filter out any invalid entries
          const parsedBatches = JSON.parse(saved);
          console.log('Using existing deducted batches from localStorage:', parsedBatches);
          
          // Filter out any entries without proper identifiers
          return parsedBatches.filter(batch => {
            // Ensure batch has either a valid barcode or batch_item_id
            return batch && (batch.barcode || batch.batch_item_id);
          });
        } catch (e) {
          console.error('Error parsing saved batches:', e);
        }
      }
    }
    return [];
  });
  
  // Initialize scanned barcodes from deducted batches
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(() => {
    const set = new Set<string>();
    deductedBatches.forEach(batch => {
      if (batch.barcode) set.add(batch.barcode);
    });
    return set;
  });
  const [initialBarcode, setInitialBarcode] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  // State for stock out request
  const [stockOutRequest, setStockOutRequest] = useState(location.state?.stockOutRequest || null);
  console.log('Initial stock out request:', stockOutRequest);
  
  // Fetch stock out request details if ID is provided
  const { data: fetchedStockOutRequest, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['stock-out-request', stockOutId],
    queryFn: async () => {
      if (!stockOutId) {
        // If we have a stock out request in the location state, use it
        if (location.state?.stockOutRequest) {
          const request = location.state.stockOutRequest;
          console.log('Using stock out request from location state:', request);
          setStockOutRequest(request);
          return request;
        }
        console.log('No stock out ID or request in state');
        return null;
      }
      
      console.log('Fetching stock out request with ID:', stockOutId);
      
      try {
        const { data, error } = await executeQuery('stock_out', async (supabase) => {
          // First try to get data from stock_out_with_requester view
          const { data: stockOutData, error: stockOutError } = await supabase
            .from('stock_out_with_requester')
            .select('*')
            .eq('id', stockOutId)
            .single();
          
          if (stockOutError) {
            console.error('Error fetching from stock_out_requests:', stockOutError);
            // Try stock_out table as fallback
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('stock_out')
              .select(`
                *,
                profiles:requested_by(full_name)
              `)
              .eq('id', stockOutId)
              .single();
              
            if (fallbackError) {
              console.error('Error fetching from stock_out fallback:', fallbackError);
              throw fallbackError;
            }
            
            console.log('Successfully fetched from stock_out fallback:', fallbackData);
            return fallbackData;
          }
          
          console.log('Successfully fetched from stock_out_requests:', stockOutData);
          return stockOutData;
        });
        
        if (error) {
          console.error('Error in executeQuery:', error);
          throw error;
        }
        
        // If we got here, we have valid data
        if (!data) {
          throw new Error('No data returned from stock out request');
        }
        
        // Update the stock out request state
        setStockOutRequest(prev => ({
          ...prev,
          ...data,
          // Ensure we preserve any existing remaining_quantity if it exists
          remaining_quantity: prev?.remaining_quantity ?? data.remaining_quantity ?? data.quantity
        }));
        
        return data;
      } catch (error) {
        console.error('Error in queryFn:', error);
        // Return null to indicate no data
        return null;
      }
    },
    enabled: !!stockOutId || !!location.state?.stockOutRequest,
  });
  
  // Update stock out request when fetched data changes
  useEffect(() => {
    if (fetchedStockOutRequest && !stockOutRequest) {
      console.log('Initializing stock out request with fetched data');
      setStockOutRequest({
        ...fetchedStockOutRequest,
        remaining_quantity: fetchedStockOutRequest.remaining_quantity ?? fetchedStockOutRequest.quantity
      });
    } else if (fetchedStockOutRequest && stockOutRequest?.id === fetchedStockOutRequest.id) {
      // Only update if we have new data and the IDs match
      const hasChanges = Object.keys(fetchedStockOutRequest).some(
        key => JSON.stringify(fetchedStockOutRequest[key]) !== JSON.stringify(stockOutRequest[key])
      );
      
      if (hasChanges) {
        console.log('Updating stock out request with new data');
        setStockOutRequest(prev => ({
          ...prev,
          ...fetchedStockOutRequest,
          // Preserve remaining_quantity if it's already set
          remaining_quantity: prev.remaining_quantity ?? fetchedStockOutRequest.remaining_quantity ?? fetchedStockOutRequest.quantity
        }));
      }
    }
  }, [fetchedStockOutRequest, stockOutRequest]);
  
  // Calculate if stock out is complete based on deducted batches and stock out request
  useEffect(() => {
    if (stockOutRequest && deductedBatches.length > 0) {
      // Calculate total quantity deducted
      const totalDeducted = deductedBatches.reduce(
        (sum, batch) => sum + (batch.quantity_deducted || 0), 
        0
      );
      
      // Check if we've deducted the required quantity
      const requiredQuantity = stockOutRequest.quantity || 0;
      const isComplete = totalDeducted >= requiredQuantity;
      const remainingQuantity = Math.max(0, requiredQuantity - totalDeducted);
      
      // Only update state if values have actually changed
      if (isStockOutComplete !== isComplete || 
          (stockOutRequest.remaining_quantity !== remainingQuantity && 
           stockOutRequest.remaining_quantity !== undefined)) {
        console.log('Updating stock out completion status:', { 
          isComplete, 
          remainingQuantity, 
          wasComplete: isStockOutComplete 
        });
        
        setIsStockOutComplete(isComplete);
        
        // Only update remaining_quantity if it needs to change
        if (stockOutRequest.remaining_quantity !== remainingQuantity) {
          setStockOutRequest(prev => ({
            ...prev,
            remaining_quantity: remainingQuantity
          }));
        }
      }
    } else if (!isStockOutComplete && stockOutRequest) {
      // Only set to false if it's not already false and we have a request
      setIsStockOutComplete(false);
    }
  }, [deductedBatches, stockOutRequest?.id, stockOutRequest?.quantity, stockOutRequest?.remaining_quantity]);
  
  // Fetch deducted batches for the stock out request
  const fetchDeductedBatches = async (stockOutId: string) => {
    if (!stockOutId) {
      console.warn('Cannot fetch deducted batches: No stock out ID provided');
      return;
    }

    try {
      console.log('Fetching processed items for stock out ID:', stockOutId);

      // First try the new stock_out_processed_items table
      const { data: processedItems, error: processedError } = await executeQuery('stock-out-processed-items', async (supabase) => {
        return await supabase
          .rpc('get_stock_out_processed_items', { p_stock_out_id: stockOutId });
      });

      if (!processedError && processedItems && processedItems.length > 0) {
        console.log('Found processed items:', processedItems);
        
        // Convert processed items to DeductedBatch format
        const convertedBatches = processedItems.map((item: any) => ({
          id: item.id,
          batch_item_id: item.batch_item_id,
          barcode: item.barcode || '',
          product_name: item.product_name || '',
          batch_number: item.batch_id || '',
          location_name: `${item.warehouse_name || ''} - ${item.location_name || ''}`,
          quantity_deducted: item.quantity,
          timestamp: item.processed_at,
          stock_out_id: stockOutId
        }));
        
        setDeductedBatches(convertedBatches as DeductedBatch[]);
        
        // Add all barcodes to the scanned set
        const scannedSet = new Set<string>();
        convertedBatches.forEach((batch: DeductedBatch) => {
          if (batch.barcode) scannedSet.add(batch.barcode);
        });
        setScannedBarcodes(scannedSet);
        return;
      }
      
      // Fallback to stock_out_details table for backward compatibility
      const { data: stockOutDetails, error: detailsError } = await executeQuery('stock-out-details', async (supabase) => {
        return await supabase
          .from('stock_out_details')
          .select('*')
          .eq('stock_out_request_id', stockOutId);
      });

      if (!detailsError && stockOutDetails && stockOutDetails.length > 0) {
        console.log('Found existing stock out details (legacy):', stockOutDetails);
        
        // Convert stock_out_details to DeductedBatch format
        const convertedBatches = stockOutDetails.map((detail: any) => ({
          id: detail.id,
          batch_item_id: detail.batch_item_id,
          barcode: detail.barcode || '',
          product_name: detail.product_name || '',
          batch_number: detail.batch_number || '',
          quantity_deducted: detail.quantity,
          timestamp: detail.processed_at,
          stock_out_id: stockOutId
        }));
        
        setDeductedBatches(convertedBatches as DeductedBatch[]);
        
        // Add all barcodes to the scanned set
        const scannedSet = new Set<string>();
        convertedBatches.forEach((batch: DeductedBatch) => {
          if (batch.barcode) scannedSet.add(batch.barcode);
        });
        setScannedBarcodes(scannedSet);
      } else {
        console.log('No processed items found for stock out ID:', stockOutId);
      }
    } catch (error) {
      console.error('Error fetching deducted batches:', error);
      // Don't throw, just log the error
    }
  };
  
  // Function to handle when a batch item is found
  const handleBatchItemFound = (item: BatchItem) => {
    console.log('Batch item found, setting state:', item);
    
    // Set default quantity to 1 or the remaining required quantity, whichever is smaller
    const totalDeducted = deductedBatches.reduce(
      (sum, batch) => sum + (batch.quantity_deducted || 0), 
      0
    );
    const requiredQuantity = stockOutRequest?.quantity || 0;
    const remainingQuantity = Math.max(0, requiredQuantity - totalDeducted);
    const defaultQuantity = Math.min(1, remainingQuantity);
    
    // Set the batch item and related state
    setBatchItem(item);
    setProcessingItem(item);
    setUserInputQuantity(defaultQuantity); // Set default quantity
    setQuantity(defaultQuantity); // Set default quantity
    setIsProcessing(false);
    setScanningEnabled(false); // Disable scanning until this item is processed
    setAwaitingConfirmation(true); // Wait for user confirmation before processing
  };
  
  // Function to handle adding a batch item to the deducted batches list without actually deducting from inventory
  const handleProcessBatch = () => {
    if (!batchItem || !batchItem.id || !user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing batch item or user information',
      });
      return;
    }
    
    try {
      // Get the quantity from user input or default to 1
      const quantity = userInputQuantity || 1;
      
      // Check if adding this quantity would exceed the required quantity
      const totalDeducted = deductedBatches.reduce(
        (sum, batch) => sum + (batch.quantity_deducted || 0), 
        0
      );
      
      const requiredQuantity = stockOutRequest?.quantity || 0;
      
      if (totalDeducted + quantity > requiredQuantity) {
        toast({
          variant: 'destructive',
          title: 'Quantity Exceeded',
          description: `Cannot add ${quantity} units. Maximum allowed: ${requiredQuantity - totalDeducted}`,
        });
        return;
      }
      
      // Create a deducted batch object with guaranteed identifiers
      const deductedBatch: DeductedBatch = {
        id: uuidv4(),
        batch_item_id: batchItem.id, // Always include the batch item ID
        barcode: batchItem.barcode,
        product_id: batchItem.product_id,
        product_name: batchItem.product_name || 'Product',
        batch_number: batchItem.batch_number || `Batch-${Date.now().toString().slice(-6)}`,
        quantity_deducted: quantity,
        location_id: batchItem.location_id,
        location_name: batchItem.warehouse_name || batchItem.location_name || '',
        timestamp: new Date().toISOString(),
      };
      
      // Check if this barcode already exists in deducted batches
      const existingBatchIndex = deductedBatches.findIndex(b => b.barcode === batchItem.barcode);
      
      if (existingBatchIndex >= 0) {
        // Update the existing batch instead of adding a new one
        setDeductedBatches(prev => {
          const updatedBatches = [...prev];
          updatedBatches[existingBatchIndex] = {
            ...updatedBatches[existingBatchIndex],
            quantity_deducted: (updatedBatches[existingBatchIndex].quantity_deducted || 0) + quantity,
            timestamp: new Date().toISOString(), // Update timestamp
          };
          
          // Save to localStorage for persistence
          if (savedBatchesKey) {
            localStorage.setItem(savedBatchesKey, JSON.stringify(updatedBatches));
          }
          
          return updatedBatches;
        });
        
        toast({
          title: 'Quantity Updated',
          description: `Added ${quantity} more units to barcode ${batchItem.barcode.slice(-8)}`,
        });
      } else {
        // Add to deducted batches as new entry
        setDeductedBatches(prev => {
          const newBatches = [...prev, deductedBatch];
          // Save to localStorage for persistence
          if (savedBatchesKey) {
            localStorage.setItem(savedBatchesKey, JSON.stringify(newBatches));
          }
          return newBatches;
        });
      }
      
      // Add to scanned barcodes set
      setScannedBarcodes(prev => new Set(prev).add(batchItem.barcode));
      
      // Reset states
      setBatchItem(null);
      setProcessingItem(null);
      setScanningEnabled(true);
      setAwaitingConfirmation(false);
      
      toast({
        title: 'Item Added',
        description: `Added ${quantity} units from box ${batchItem.barcode}`,
      });
    } catch (error) {
      console.error('Error processing batch:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process batch',
      });
    }
  };
  
  // Handle quantity changes from the BatchDetails component
  const handleQuantityChange = (newQuantity: number) => {
    console.log('Quantity changed to:', newQuantity);
    setUserInputQuantity(newQuantity);
    
    // Also update the general quantity state for compatibility
    setQuantity(newQuantity);
  };

  // Track last processed barcode and timestamp
  const lastProcessedBarcode = useRef<{barcode: string | null; timestamp: number}>({barcode: null, timestamp: 0});
  const processingBarcode = useRef<boolean>(false);

  // Function to handle barcode detection with debouncing and duplicate prevention
  const handleBarcodeDetected = async (barcode: string) => {
    const now = Date.now();
    
    // Skip if:
    // 1. No barcode
    // 2. Already processing
    // 3. Scanning disabled
    // 4. Same barcode processed recently (within 3 seconds)
    // 5. Currently processing another barcode
    if (!barcode || 
        isProcessing || 
        !scanningEnabled || 
        (lastProcessedBarcode.current.barcode === barcode && 
         now - lastProcessedBarcode.current.timestamp < 3000) ||
        processingBarcode.current) {
      console.log('Skipping barcode:', barcode, {
        isProcessing,
        scanningEnabled,
        lastBarcode: lastProcessedBarcode.current.barcode,
        timeSinceLast: lastProcessedBarcode.current.barcode ? now - lastProcessedBarcode.current.timestamp : 'N/A',
      });
      return;
    }
    
    // Check if we've already reached the required quantity before processing
    const totalDeducted = deductedBatches.reduce(
      (sum, batch) => sum + (batch.quantity_deducted || 0), 
      0
    );
    
    const requiredQuantity = stockOutRequest?.quantity || 0;
    
    if (totalDeducted >= requiredQuantity) {
      toast({
        variant: 'destructive',
        title: 'Maximum Quantity Reached',
        description: `You have already scanned the required quantity (${requiredQuantity}). Please complete the stock out process.`,
      });
      return;
    }

    console.log('Processing new barcode:', barcode);
    lastProcessedBarcode.current = { barcode, timestamp: now };
    processingBarcode.current = true;
    setBarcode(barcode);
    setIsProcessing(true);
    
    try {
      // Check if this barcode has been scanned before - we'll track this for later
      const isRescan = scannedBarcodes.has(barcode);
      
      // Validate barcode format
      if (!barcode.trim()) {
        throw new Error('Invalid barcode: Empty barcode');
      }
      
      console.log('Looking up barcode details for:', barcode.trim());
      console.log('DEBUG: Checking barcode existence in different tables...');
      
      try {
        // First try to get data from the barcode_batch_view
        const viewItem = await fetchBarcodeData(barcode);
        
        if (viewItem) {
          console.log('DEBUG: Found data in barcode_batch_view:', viewItem);
          
          // Construct batch item from view data
          const batchItem = createBatchItemFromViewData(viewItem, barcode);
          
          console.log('Constructed batch item from view:', batchItem);
          
          // If this is a rescan and we're allowing rescanning the same box
          if (isRescan && allowRescan) {
            // Find the existing deducted batch for this barcode
            const existingBatchIndex = deductedBatches.findIndex(
              batch => batch.barcode === barcode
            );
            
            if (existingBatchIndex !== -1) {
              // Check if we've already reached the required quantity
              const totalDeducted = deductedBatches.reduce(
                (sum, batch) => sum + (batch.quantity_deducted || 0), 
                0
              );
              
              const requiredQuantity = stockOutRequest?.quantity || 0;
              
              if (totalDeducted >= requiredQuantity) {
                toast({
                  variant: 'destructive',
                  title: 'Maximum Quantity Reached',
                  description: `You have already scanned the required quantity (${requiredQuantity}). Please complete the stock out process.`,
                });
                
                setIsProcessing(false);
                processingBarcode.current = false;
                return;
              }
              
              // Show the batch item details for user confirmation instead of auto-incrementing
              handleBatchItemFound(batchItem);
              setIsProcessing(false);
              processingBarcode.current = false;
              return;
            }
          } else if (isRescan && !allowRescan) {
            toast({
              variant: 'destructive',
              title: 'Box Already Scanned',
              description: 'This box has already been scanned. Enable "Allow rescanning the same box" to scan it again.',
            });
            
            setIsProcessing(false);
            processingBarcode.current = false;
            return;
          }
          
          // Check if we've already reached the required quantity
          const totalDeducted = deductedBatches.reduce(
            (sum, batch) => sum + (batch.quantity_deducted || 0), 
            0
          );
          
          const requiredQuantity = stockOutRequest?.quantity || 0;
          
          if (totalDeducted >= requiredQuantity) {
            toast({
              variant: 'destructive',
              title: 'Maximum Quantity Reached',
              description: `You have already scanned the required quantity (${requiredQuantity}). Please complete the stock out process.`,
            });
            
            setIsProcessing(false);
            processingBarcode.current = false;
            return;
          }
          
          // Validate the batch item against the current stock out request
          const validationResult = validateBarcode(batchItem, stockOutRequest, new Set()); // Don't check scanned barcodes here
          if (!validationResult.isValid) {
            throw new Error(validationResult.errorMessage || 'Invalid barcode');
          }
          
          // If we got here, all validations passed
          handleBatchItemFound(batchItem);
          processingBarcode.current = false;
          return;
        }
      } catch (viewError) {
        console.error('Error with barcode_batch_view:', viewError);
        // Continue to fallback methods
      }
      
      console.log('DEBUG: No valid data from view, trying direct table queries');
      
      // Check directly in the barcodes table
      const barcodeData = await fetchBarcodeFromBarcodesTable(barcode);
      
      console.log('DEBUG: Barcodes table result:', barcodeData);
      
      if (!barcodeData) {
        console.error('Barcode not found in barcodes table');
        throw new Error('Barcode not found in inventory. Please check and try again.');
      }
      
      // Try to get batch item data from barcode_batch_view first
      // This is the preferred source of truth as it contains complete product information
      let batchItemData;
      try {
        const { data: viewData, error: viewError } = await executeQuery('barcode_batch_view', async (supabase) => {
          return await supabase
            .from('barcode_batch_view')
            .select('*')
            .eq('barcode', barcode)
            .limit(1);
        });
        
        if (!viewError && viewData && viewData.length > 0) {
          console.log('Found batch item in barcode_batch_view using barcode:', barcode);
          batchItemData = viewData[0];
        }
      } catch (viewError) {
        console.error('Error querying barcode_batch_view by barcode:', viewError);
      }
      
      // If not found in view by barcode, try by box_id
      if (!batchItemData) {
        batchItemData = await fetchBatchItemData(barcodeData.box_id);
        console.log('DEBUG: Batch items result from fetchBatchItemData:', batchItemData);
      }
      
      if (!batchItemData) {
        console.error('Batch item not found');
        
        // Special case: If the barcode starts with 'DEMO-', create a synthetic batch item
        if (barcode.startsWith('DEMO-')) {
          console.log('Creating synthetic batch item for demo barcode');
          
          // Get product data from the stock out request
          const productData = await fetchProductData(stockOutRequest?.product_id || '');
          
          if (!productData) {
            throw new Error('Product not found for synthetic batch item');
          }
          
          // Create a synthetic batch item
          const syntheticBatchItem = createSyntheticBatchItem(barcode, productData);
          
          // Validate the synthetic batch item
          const validationResult = validateBarcode(syntheticBatchItem, stockOutRequest, scannedBarcodes);
          if (!validationResult.isValid) {
            throw new Error(validationResult.errorMessage || 'This synthetic barcode cannot be used');
          }
          
          handleBatchItemFound(syntheticBatchItem);
          processingBarcode.current = false;
          return;
        }
        
        throw new Error('Batch item not found in inventory');
      }
      
      // Create a batch item from the data
      // If data is from barcode_batch_view, use its structure
      // Otherwise, use the structure from batch_items table
      const batchItem = {
        id: batchItemData.batch_item_id || batchItemData.id,
        batch_id: batchItemData.batch_id,
        barcode_id: batchItemData.barcode_id || barcodeData.id,
        // Always prefer product_id from barcode_batch_view if available
        // If not available from view, use from barcodes table as fallback
        product_id: batchItemData.product_id || barcodeData.product_id,
        product_name: batchItemData.product_name || 'Unknown Product',
        product_sku: batchItemData.product_sku || '',
        quantity: Math.max(1, Number(batchItemData.quantity) || 1),
        warehouse_id: batchItemData.warehouse_id,
        location_id: batchItemData.location_id,
        barcode: barcode.trim(),
        size: batchItemData.size,
        color: batchItemData.color,
        status: batchItemData.status || 'available',
        batch_number: batchItemData.batch_number,
        warehouse_name: batchItemData.warehouse_name || batchItemData.warehouses?.name
      };
      
      console.log('Created batch item from database:', batchItem);
      
      // Validate the batch item against the stock out request
      const validationResult = validateBarcode(batchItem, stockOutRequest, scannedBarcodes);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errorMessage || 'This barcode cannot be used for this stock out request');
      }
      
      // If we got here, all validations passed
      handleBatchItemFound(batchItem);
      processingBarcode.current = false;
      queryClient.invalidateQueries({ queryKey: ['stock-out-request', stockOutId] });
      
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process barcode',
      });
      setIsProcessing(false);
      processingBarcode.current = false;
    }
  };
  
  const handleApproveStockOut = async () => {
    if (!stockOutRequest || !stockOutId) {
      console.error('Missing stock out request or ID');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing stock out information. Please try again.',
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('Completing stock out request:', stockOutId);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Calculate total deducted quantity
      const totalDeducted = deductedBatches.reduce(
        (sum, batch) => sum + (batch.quantity_deducted || 0), 
        0
      );
      
      // Validate that we've deducted enough quantity
      const requiredQuantity = stockOutRequest.quantity || 0;
      if (totalDeducted < requiredQuantity) {
        throw new Error(`Insufficient quantity deducted. Required: ${requiredQuantity}, Deducted: ${totalDeducted}`);
      }
      
      // Validate that all batches have barcodes
      const invalidBatches = deductedBatches.filter(batch => !batch.barcode);
      if (invalidBatches.length > 0) {
        console.error('Found batches without barcodes:', invalidBatches);
        throw new Error(`${invalidBatches.length} batches are missing barcode information`);
      }
      
      // Now we'll actually deduct the quantities from inventory by calling approveStockOut
      console.log('Deducting quantities from inventory using barcodes...');
      const result = await approveStockOut(stockOutId, deductedBatches, user.id);
      
      if (result.error) {
        console.error('Error approving stock out:', result.error);
        throw new Error(result.error.message || 'Failed to complete stock out');
      }
      
      // Update the stock out request status locally
      setStockOutRequest(prev => ({
        ...prev,
        status: 'completed',
        remaining_quantity: 0
      }));
      
      toast({
        title: 'Stock Out Completed',
        description: `Successfully processed ${deductedBatches.length} boxes and deducted ${totalDeducted} units from inventory.`,
      });
      
      setProcessingComplete(true);
      
      // Clear the saved batches from localStorage after successful completion
      if (savedBatchesKey) {
        localStorage.removeItem(savedBatchesKey);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['stock-out-request', stockOutId],
        refetchType: 'active'
      });
      
    } catch (error) {
      console.error('Error completing stock out:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete stock out. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Load deducted batches when stock out request is loaded
  useEffect(() => {    
    // Check if we already have deducted batches (from localStorage)
    if (deductedBatches.length > 0) {
      console.log('Using existing deducted batches from localStorage:', deductedBatches);
      return;
    }
    
    // Check if stockOutRequest exists and has an id property
    if (stockOutRequest && stockOutRequest.id) {
      console.log('Loading deducted batches for stock out ID:', stockOutRequest.id);
      fetchDeductedBatches(stockOutRequest.id);
    } else if (stockOutId) {
      // If we have a stockOutId from URL params but no stockOutRequest object yet
      console.log('Loading deducted batches using URL param stockOutId:', stockOutId);
      fetchDeductedBatches(stockOutId);
    }
  }, [stockOutRequest, stockOutId]);
  
  // Ensure stockOutRequest has all required fields - using a ref to prevent infinite loop
  const hasEnhancedRequest = useRef(false);
  useEffect(() => {
    if (stockOutRequest && !hasEnhancedRequest.current) {
      // Check if stockOutRequest is an empty object (no properties)
      const hasProperties = Object.keys(stockOutRequest).length > 0;
      
      if (!hasProperties) {
        console.log('stockOutRequest is empty, not enhancing');
        return;
      }
      
      console.log('Enhancing stock out request with default values');
      const enhancedRequest = {
        ...stockOutRequest,
        id: stockOutRequest.id || stockOutId || '',
        quantity: stockOutRequest.quantity || 0,
        remaining_quantity: stockOutRequest.remaining_quantity !== undefined ? 
          stockOutRequest.remaining_quantity : (stockOutRequest.quantity || 0),
        product_id: stockOutRequest.product_id || '',
        profiles: stockOutRequest.profiles || { full_name: 'Unknown' },
        destination: stockOutRequest.destination || '',
        status: stockOutRequest.status || 'pending',
        product_name: stockOutRequest.product_name || 'Unknown Product'
      };
      
      // Set the local state directly instead of updating query cache
      hasEnhancedRequest.current = true;
      // We're not updating the query cache here to prevent infinite loop
    }
  }, [stockOutRequest, stockOutId]);

  // Calculate if stock out is complete whenever deducted batches change
  useEffect(() => {
    if (stockOutRequest && deductedBatches.length > 0) {
      const totalDeducted = deductedBatches.reduce((sum, batch) => sum + (batch.quantity_deducted || 0), 0);
      const requiredQuantity = stockOutRequest.quantity || 0;
      
      // Calculate remaining quantity but don't update the query cache
      const remainingQuantity = Math.max(0, requiredQuantity - totalDeducted);
      
      // Just update the UI state without modifying the query cache
      setIsStockOutComplete(totalDeducted >= requiredQuantity);
    } else {
      setIsStockOutComplete(false);
    }
  }, [deductedBatches, stockOutRequest]);
  
  // If processing is complete, show success screen
  if (processingComplete) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Stock Out Completed</h2>
          <p className="text-muted-foreground mb-6">
            All items have been successfully processed
          </p>
          <Button onClick={() => navigate('/manager/stock-out')}>
            Return to Stock Out List
          </Button>
        </Card>
      </div>
    );
  }
  
  // Loading state
  if (isLoadingRequest && stockOutId) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Loading stock out request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (requestError) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <Alert variant="destructive">
              <AlertDescription>
                Error loading stock out request. Please try again.
              </AlertDescription>
            </Alert>
            <Button 
              className="mt-4" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const handleScanNextBox = () => {
    console.log('Enabling scanner for next box');
    setBatchItem(null);
    setProcessingItem(null);
    setBarcode('');
    setQuantity(1);
    setIsSuccess(false);
    setScanningEnabled(true);
    setAwaitingConfirmation(false);
    // Reset any error states
    setError(null);
  };

  const handleRemoveBatch = (index: number) => {
    // Create a copy of the deducted batches array
    const updatedBatches = [...deductedBatches];
    
    // Get the batch to remove
    const batchToRemove = updatedBatches[index];
    
    // Remove the batch from scanned barcodes set if rescan is needed
    if (batchToRemove.barcode) {
      const updatedScannedBarcodes = new Set(scannedBarcodes);
      updatedScannedBarcodes.delete(batchToRemove.barcode);
      setScannedBarcodes(updatedScannedBarcodes);
    }
    
    // Remove the batch from the array
    updatedBatches.splice(index, 1);
    setDeductedBatches(updatedBatches);
    
    // Update localStorage to persist the deletion
    if (savedBatchesKey) {
      if (updatedBatches.length > 0) {
        localStorage.setItem(savedBatchesKey, JSON.stringify(updatedBatches));
      } else {
        // If no batches left, remove the item from localStorage
        localStorage.removeItem(savedBatchesKey);
      }
    }
    
    // Update the stockOutRequest's remaining_quantity
    if (stockOutRequest && batchToRemove.quantity_deducted) {
      // Add the removed quantity back to the remaining quantity
      const newRemainingQuantity = (stockOutRequest.remaining_quantity || stockOutRequest.quantity) + batchToRemove.quantity_deducted;
      
      // Update the stockOutRequest state
      setStockOutRequest(prev => {
        if (!prev) return null;
        return {
          ...prev,
          remaining_quantity: Math.min(newRemainingQuantity, prev.quantity) // Ensure we don't exceed the original quantity
        };
      });
      
      // Re-enable scanning if we removed an item
      setScanningEnabled(true);
    }
    
    toast({
      title: 'Item Removed',
      description: `Removed ${batchToRemove.quantity_deducted} units from the deduction table.`
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Stock Out Request Information and Progress - Always show if we have any data */}
      {stockOutRequest && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Stock Out Request Details</CardTitle>
            <CardDescription>
              {stockOutRequest.profiles?.full_name || 'Unknown'} requested {stockOutRequest.quantity} units
              {stockOutRequest.destination && ` for ${stockOutRequest.destination}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Complete Product Information */}
            <div className="mb-4 p-3 bg-muted rounded-md">
              <div className="grid md:grid-cols-2 gap-3">
                {/* Product Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">Product Information</h3>
                  <div>
                    <span className="font-medium block text-sm">Name:</span>
                    <span className="text-base">{stockOutRequest.product_name || 'Unknown Product'}</span>
                  </div>
                  
                  {stockOutRequest.product_sku && (
                    <div>
                      <span className="font-medium block text-sm">SKU:</span>
                      <span className="font-mono">{stockOutRequest.product_sku}</span>
                    </div>
                  )}
                  
                  {stockOutRequest.product_description && (
                    <div>
                      <span className="font-medium block text-sm">Description:</span>
                      <span className="text-sm">{stockOutRequest.product_description}</span>
                    </div>
                  )}
                  
                  {stockOutRequest.product_category && (
                    <div>
                      <span className="font-medium block text-sm">Category:</span>
                      <span className="text-sm">{stockOutRequest.product_category}</span>
                    </div>
                  )}
                </div>
                
                {/* Request Information */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">Request Information</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-medium block text-sm">Requested:</span>
                      <span className="text-base">{stockOutRequest.quantity || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium block text-sm">Remaining:</span>
                      <span className="text-base">{stockOutRequest.remaining_quantity || stockOutRequest.quantity || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium block text-sm">Status:</span>
                      <span className="text-base capitalize">{stockOutRequest.status || 'pending'}</span>
                    </div>
                    <div>
                      <span className="font-medium block text-sm">Request ID:</span>
                      <span className="text-xs font-mono">{stockOutRequest.id?.substring(0, 8) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <StockOutProgress stockOutRequest={stockOutRequest} />
          </CardContent>
        </Card>
      )}
      
      {/* Barcode Scanner */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Scan Barcode</CardTitle>
          <CardDescription>
            {stockOutRequest 
              ? `Scan the barcode of boxes containing ${stockOutRequest.product_name || 'the requested product'}` 
              : 'Scan any product barcode to process a stock out'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarcodeScanner
            onBarcodeScanned={handleBarcodeDetected}
            onBatchItemFound={handleBatchItemFound}
            isEnabled={scanningEnabled}
            isProcessing={isProcessing}
            isSuccess={isSuccess}
            initialBarcode={barcode}
          />
        </CardContent>
      </Card>
      
      {/* Batch Details (if a batch is found) */}
      {batchItem && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Box Details</CardTitle>
            <CardDescription>
              Adjust the quantity to deduct from this box
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchDetails
              batchItem={batchItem}
              onQuantityChange={handleQuantityChange}
              onProcess={handleProcessBatch}
              isProcessing={isProcessing}
              maxQuantity={stockOutRequest ? Math.min(batchItem.quantity, stockOutRequest.remaining_quantity || stockOutRequest.quantity) : undefined}
              stockOutRequest={stockOutRequest}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Deducted Batches Table - Always show when we have stockOutRequest */}
      {stockOutRequest ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Deducted Batches</CardTitle>
            <CardDescription>List of batches that have been deducted for this stock out</CardDescription>
          </CardHeader>
          <CardContent>
            {deductedBatches.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Quantity Deducted</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductedBatches
                      .filter(batch => batch.barcode) // Only show batches with barcodes
                      .map((batch, index) => (
                        <TableRow key={`${batch.batch_item_id || batch.barcode || index}-${index}`}>
                          <TableCell className="font-mono">
                            {batch.barcode}
                          </TableCell>
                          <TableCell className="font-semibold text-base">{batch.quantity_deducted}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveBatch(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No batches have been processed yet. Scan product barcodes to deduct from inventory.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}
      
      {/* Action Buttons */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {isSuccess && (
              <Button 
                onClick={handleScanNextBox}
                className="w-full"
                variant="secondary"
              >
                <Scan className="mr-2 h-4 w-4" />
                Scan Next Box
              </Button>
            )}
            
            {/* Rescan toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allow-rescan"
                  checked={allowRescan}
                  onChange={(e) => setAllowRescan(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="allow-rescan" className="text-sm font-medium">
                  Allow rescanning the same box
                </label>
              </div>
            </div>
            
            {/* Complete Stock Out Process Button - Always show when we have stockOutRequest */}
            {stockOutRequest ? (
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={handleApproveStockOut}
                  disabled={isProcessing || deductedBatches.length === 0}
                  className="w-full md:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Complete Stock Out Process'
                  )}
                </Button>
              </div>
            ) : null}
            
            {stockOutRequest && !isStockOutComplete && deductedBatches.length > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Complete the entire stock out request to approve
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};