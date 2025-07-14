import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  Package, 
  Scan, 
  Trash2, 
  CheckCircle 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useStockOut } from '@/hooks/useStockOut';
import BarcodeScanner from '@/components/warehouse/stockout/BarcodeScanner';
import BatchItemDetails from '@/components/warehouse/stockout/BatchItemDetails';
import StockOutProgress from '@/components/warehouse/stockout/StockOutProgress';
import { executeQuery } from '@/lib/supabase';
import { StockOutRequest, ProcessedItem, BatchItem } from '@/services/stockout/types';
import { Box } from '@/types/stockout';
import { v4 as uuidv4 } from 'uuid';

/**
 * BarcodeScannerPage Component
 * 
 * This page is used for processing stock out requests by scanning barcodes of boxes.
 * It is accessed via the route: /barcode-scanner/:stockOutId
 * 
 * This component handles:
 * - Displaying product information
 * - Scanning barcodes
 * - Processing batch items
 * - Approving stock out requests
 * 
 * It uses the useStockOut hook for all stockout-related functionality.
 */
interface BarcodeScannerPageProps {
  isAdminView?: boolean;
}

const BarcodeScannerPage: React.FC<BarcodeScannerPageProps> = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ stockOutId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if stockOutRequestId is in URL params or location state
  const stockOutRequestId = params.stockOutId || (location.state as { stockOutRequestId?: string })?.stockOutRequestId;

  // Fetch stock out request data
  const { data: stockOutRequestData, isLoading, error } = useQuery({
    queryKey: ['stockOutRequest', stockOutRequestId],
    queryFn: async () => {
      if (!stockOutRequestId) {
        throw new Error('Stock out request ID is required');
      }
      const { data, error } = await executeQuery('stock_out_requests', async (supabase) => {
        return await supabase
          .rpc('get_stock_out_request_details', {
            request_id: stockOutRequestId
          });
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as StockOutRequest;
    },
    enabled: !!stockOutRequestId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Use the stock out hook
  const {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    handleCompleteStockOut,
    resetForm,
    isReadyForApproval,
    updateState
  } = useStockOut({
    initialStockOutRequest: stockOutRequestData,
    userId: user?.id || '',
    initialBarcode: undefined
  });
  
  // Update stock out request in state when data is loaded
  useEffect(() => {
    if (stockOutRequestData) {
      console.log('Stock out request data received:', stockOutRequestData);
      console.log('Current state.stockOutRequest:', state.stockOutRequest);
      console.log('Location state:', location.state);
      
      // Extract product information from items array if available
      let productId = '';
      let productName = 'Unknown Product';
      let quantity = 0;
      let detailId = '';
      
      // IMPORTANT: First check if we have a specific productId in the location state
      // This ensures we use the product the user clicked on, not just the first one
      if (location.state?.productId) {
        console.log('🔍 [PRODUCT] Using productId from location state:', location.state.productId);
        productId = location.state.productId;
        detailId = location.state.detailId || '';
        
        // Find the matching product in the items array to get its name and quantity
        if (stockOutRequestData.items && stockOutRequestData.items.length > 0) {
          const matchingItem = stockOutRequestData.items.find(item => 
            item.product_id === location.state.productId || 
            String(item.product_id) === location.state.productId
          );
          
          if (matchingItem) {
            console.log('🔍 [PRODUCT] Found matching item in stockOutRequestData:', matchingItem);
            productName = matchingItem.product_name || 'Unknown Product';
            quantity = matchingItem.quantity || 0;
          } else {
            console.warn('⚠️ [PRODUCT] Could not find matching item for productId:', location.state.productId);
          }
        }
      }
      // Only fall back to the first item if we didn't get a productId from location state
      else if (stockOutRequestData.items && stockOutRequestData.items.length > 0) {
        console.log('⚠️ [PRODUCT] No productId in location state, falling back to first item');
        const firstItem = stockOutRequestData.items[0];
        
        // Extract product information from the first item
        if (firstItem.product_id) {
          productId = String(firstItem.product_id);
          console.log('Found product ID in items array:', productId);
        }
        
        if (firstItem.product_name) {
          productName = firstItem.product_name;
          console.log('Found product name in items array:', productName);
        }
        
        if (firstItem.quantity) {
          quantity = firstItem.quantity;
          console.log('Found quantity in items array:', quantity);
        }
      } else {
        // Fallback to direct properties if items array is not available
        console.log('⚠️ [PRODUCT] No items array, falling back to direct properties');
        productId = stockOutRequestData.product_id ? String(stockOutRequestData.product_id) : '';
        productName = stockOutRequestData.product_name || 'Unknown Product';
        quantity = stockOutRequestData.quantity || 0;
      }
      
      if (!productId) {
        console.warn('Warning: product_id is missing in stock out request data', stockOutRequestData);
      }
      
      const normalizedStockOutRequest = {
        id: stockOutRequestData.id,
        product_id: productId,
        product_name: productName,
        quantity: quantity,
        remaining_quantity: stockOutRequestData.remaining_quantity || quantity,
        status: stockOutRequestData.status,
        requested_by: stockOutRequestData.requested_by || stockOutRequestData.requester_id,
        requested_at: stockOutRequestData.created_at,
        processed_by: stockOutRequestData.processed_by,
        processed_at: stockOutRequestData.processed_at
      };
      
      console.log('Normalized stock out request:', normalizedStockOutRequest);
      console.log('Product ID in normalized request:', normalizedStockOutRequest.product_id);
      console.log('Product name in normalized request:', normalizedStockOutRequest.product_name);
      
      // Always update the state to ensure the latest data is used
      updateState({ stockOutRequest: normalizedStockOutRequest });
    }
  }, [stockOutRequestData, updateState]);

  // We'll only save batch item to session storage when the user clicks "Proceed to Stockout"
  // This prevents automatic processing in the stockout form
  const saveCurrentBatchItemToSession = useCallback((): void => {
    if (state.currentBatchItem && location.state?.stockOutId) {
      const storageKey = `barcode-scanner-batch-item-${location.state.stockOutId}`;
      console.log('💾 [STORAGE] Saving currentBatchItem to sessionStorage', {
        key: storageKey,
        data: state.currentBatchItem
      });
      
      // Include both stockOutId and productId in the saved data
      const enhancedData = {
        ...state.currentBatchItem,
        stockOutId: location.state.stockOutId,
        productId: state.stockOutRequest?.product_id || ''
      };
      
      sessionStorage.setItem(storageKey, JSON.stringify(enhancedData));
    }
  }, [state.currentBatchItem, location.state?.stockOutId, state.stockOutRequest?.product_id]);

  // Handle navigation back to stock out list
  const handleBackToList = () => {
    if (location.state?.returnPath) {
      navigate(location.state.returnPath);
    } else {
      navigate(isAdminView ? '/admin/stock-out' : '/manager/stock-out');
    }
  };

  // Define status constants to avoid hardcoded strings
  const BATCH_STATUS = {
    ACTIVE: 'active',
    OUT: 'out',
    PARTIAL: 'partial',
    RESERVED: 'reserved'
  } as const;

  // Validate inventory quantity before processing barcode scan
  const validateAndHandleBarcodeScanned = async (barcode: string) => {
    try {
      console.log('Barcode scanned in BarcodeScannerPage, forwarding to useStockOut hook:', barcode);
      console.log('Current stock out request state:', {
        stockOutRequestId,
        stockOutRequest: state.stockOutRequest,
        productId: state.stockOutRequest?.product_id,
        productName: state.stockOutRequest?.product_name
      });
      
      if (!barcode || !stockOutRequestId || !state.stockOutRequest?.product_id) {
        toast.error('Invalid barcode or stock out request');
        return;
      }
      
      console.log('🔍 [BARCODE] Processing barcode:', barcode);
      
      // Step 1: Try to find the product info from barcode_batch_view
      const { data: barcodeData, error: barcodeError } = await executeQuery('barcode_batch_view', async (supabase) => {
        try {
          console.log('🔍 [BARCODE] Querying barcode_batch_view for barcode:', barcode);
          return await supabase
            .from('barcode_batch_view')
            .select(`
              barcode_id,
              barcode,
              product_id,
              product_name,
              batch_item_id,
              quantity,
              status,
              warehouse_id,
              batch_id
            `)
            .eq('barcode', barcode)
            .single(); // We expect exactly one result for a specific barcode
        } catch (error) {
          console.error('Error in barcode_batch_view query:', error);
          throw error;
        }
      });
      
      // If we can't find the barcode in the view
      if (barcodeError || !barcodeData) {
        console.warn('🚨 [BARCODE] Could not find product info for barcode:', barcode);
        console.log('💡 [BARCODE] Creating manual batch item for product:', state.stockOutRequest.product_name);
        
        // Generate a unique ID for this batch item
        const timestamp = Date.now();
        const manualId = `manual-${timestamp}`;
        
        // Create box data for the handler
        const boxData = {
          id: manualId,
          barcode: barcode,
          quantity: state.stockOutRequest.remaining_quantity || 1,
          warehouse: location.state?.warehouseName || 'Unknown',
          floor: location.state?.floor || '',
          zone: location.state?.zone || ''
        };
        
        // Create a manual batch item
        const manualBatchItem = {
          id: manualId,
          batch_item_id: manualId,
          barcode: barcode,
          quantity: boxData.quantity,
          product_id: state.stockOutRequest.product_id,
          product_name: state.stockOutRequest.product_name || 'Unknown Product',
          batch_number: barcode,
          status: 'active',
          batch_id: manualId,
          warehouse_name: boxData.warehouse,
          warehouse_id: location.state?.warehouseId || '',
          floor: boxData.floor,
          zone: boxData.zone
        };
        
        // Step 2: Check inventory for this product
        const { data: inventoryDataArray, error: inventoryError } = await executeQuery('inventory', async (supabase) => {
          try {
            console.log('🔍 [INVENTORY] Querying inventory for product ID:', state.stockOutRequest.product_id);
            return await supabase
              .from('inventory')
              .select('*')
              .eq('product_id', state.stockOutRequest.product_id);
          } catch (error) {
            console.error('Error in inventory query:', error);
            throw error;
          }
        });
        
        // Check if inventory is available
        if (!inventoryError && inventoryDataArray && inventoryDataArray.length > 0) {
          // Use the first inventory record
          const inventoryData = inventoryDataArray[0];
          console.log('🔍 [INVENTORY] Using first inventory record from', inventoryDataArray.length, 'records:', inventoryData);
          console.log('🔍 [INVENTORY] Found inventory data:', inventoryData);
          
          // Calculate available quantity (total minus reserved)
          const totalQuantity = inventoryData.total_quantity || 0;
          const reservedQuantity = inventoryData.reserved_quantity || 0;
          const availableQuantity = totalQuantity - reservedQuantity;
          
          console.log('📊 [INVENTORY] Available quantity:', availableQuantity, 'Total:', totalQuantity, 'Reserved:', reservedQuantity);
          
          // If no available quantity but items are reserved
          if (availableQuantity <= 0 && reservedQuantity > 0) {
            toast.error('Items are reserved', {
              description: 'No available quantity. All items are reserved.',
              duration: 5000
            });
            return;
          }
          
          // If no quantity at all
          if (totalQuantity <= 0) {
            toast.error('No inventory', {
              description: 'This product has no inventory.',
              duration: 5000
            });
            return;
          }
          
          // Adjust quantity to available
          if (availableQuantity < boxData.quantity) {
            boxData.quantity = availableQuantity;
            manualBatchItem.quantity = availableQuantity;
            console.log('📊 [INVENTORY] Adjusted quantity to available:', availableQuantity);
          }
        }
        
        // Set the current batch item in state
        console.log('🔄 [BARCODE] Setting manual batch item', manualBatchItem);
        updateState({ currentBatchItem: manualBatchItem });
        
        // Save to session storage
        console.log('💾 [STORAGE] Saving manual batch item to sessionStorage', manualBatchItem);
        saveBatchItemToSession(manualBatchItem);
        
        // Pass to the handler
        handleBarcodeScanned(barcode, boxData);
        
        toast.success('Product processed', {
          description: `Added ${boxData.quantity} units of ${state.stockOutRequest.product_name}`,
          duration: 3000
        });
        
        return;
      }
      
      // Get the expected product ID from location state (passed from ProcessStockOutForm)
      // IMPORTANT: Always prioritize the productId from location.state as it represents the specific
      // product the user clicked on in the stock-out form
      const expectedProductId = location.state?.productId || state.stockOutRequest?.product_id;
      
      // Get the expected product name - try to find it from the stockOutRequestData if possible
      let expectedProductName = 'expected product';
      if (location.state?.productId && stockOutRequestData?.items) {
        const matchingItem = stockOutRequestData.items.find(item => 
          item.product_id === location.state.productId || 
          String(item.product_id) === location.state.productId
        );
        if (matchingItem?.product_name) {
          expectedProductName = matchingItem.product_name;
        }
      } else {
        expectedProductName = state.stockOutRequest?.product_name || 'expected product';
      }
      
      console.log('🔍 [BARCODE] Validating product match:', {
        scannedProductId: barcodeData.product_id,
        scannedProductName: barcodeData.product_name,
        expectedProductId: expectedProductId,
        expectedProductName: expectedProductName,
        fromLocationState: !!location.state?.productId,
        locationState: {
          productId: location.state?.productId,
          detailId: location.state?.detailId,
          stockOutId: location.state?.stockOutId
        },
        stockOutRequest: {
          productId: state.stockOutRequest?.product_id,
          productName: state.stockOutRequest?.product_name
        }
      });
      
      // Verify that the scanned barcode matches the product we're processing
      if (barcodeData.product_id !== expectedProductId) {
        console.error('🚨 [BARCODE] Product mismatch:', {
          scannedProductId: barcodeData.product_id,
          scannedProductName: barcodeData.product_name,
          expectedProductId: expectedProductId,
          expectedProductName: expectedProductName
        });
        
        toast.error('Product mismatch', {
          description: `Scanned ${barcodeData.product_name || 'unknown product'} but expected ${expectedProductName}`,
          duration: 5000
        });
        
        return;
      }
      
      console.log('🔍 [BARCODE] Found product from barcode:', barcodeData);
      
      // Step 3: Check inventory for this specific barcode
      const { data: inventoryDataArray, error: inventoryError } = await executeQuery('inventory', async (supabase) => {
        try {
          console.log('🔍 [INVENTORY] Querying inventory for barcode:', barcodeData.barcode);
          return await supabase
            .from('inventory')
            .select('*')
            .eq('barcode', barcodeData.barcode);
        } catch (error) {
          console.error('Error in inventory query:', error);
          throw error;
        }
      });
      
      // Process inventory data
      let availableQuantity = barcodeData.quantity || 0;
      
      if (!inventoryError && inventoryDataArray && inventoryDataArray.length > 0) {
        // Use the inventory record for this specific barcode
        const inventoryData = inventoryDataArray[0];
        console.log('🔍 [INVENTORY] Found inventory data for barcode:', inventoryData);
        
        // Calculate available quantity (total minus reserved)
        const totalQuantity = inventoryData.total_quantity || 0;
        const reservedQuantity = inventoryData.reserved_quantity || 0;
        availableQuantity = Math.max(0, totalQuantity - reservedQuantity);
        
        console.log('📊 [INVENTORY] Available quantity:', availableQuantity, 'Total:', totalQuantity, 'Reserved:', reservedQuantity);
        
        // Check if there's no available quantity but there are reserved items
        if (availableQuantity === 0 && totalQuantity > 0) {
          console.log('🚨 [INVENTORY] No available quantity, but items are reserved');
          toast.error('No available products', {
            description: 'All items for this barcode are currently reserved.',
          });
          return false;
        }
        
        // Check if there's no inventory at all
        if (totalQuantity === 0) {
          console.log('🚨 [INVENTORY] No inventory found for this barcode');
          toast.error('No inventory', {
            description: 'There is no inventory for this barcode.',
          });
          return false;
        }
      } else {
        console.log('🚨 [INVENTORY] No inventory records found for barcode:', barcodeData.barcode);
        toast.error('Barcode not found in inventory', {
          description: 'This barcode does not exist in inventory.',
        });
        return false;
      }
      
      // Calculate the maximum quantity that can be processed
      const remainingNeeded = state.stockOutRequest.remaining_quantity || 0;
      const maxQuantity = Math.min(availableQuantity, remainingNeeded);
      
      if (maxQuantity <= 0) {
        toast.error('No quantity needed', {
          description: 'This product has already been fully processed or has no available quantity.',
          duration: 5000
        });
        return;
      }
      
      // Create an enhanced batch item with additional data
      const enhancedBatchItem = {
        id: barcodeData.batch_item_id || barcodeData.barcode_id,
        batch_item_id: barcodeData.batch_item_id,
        barcode: barcode,
        product_id: barcodeData.product_id,
        product_name: barcodeData.product_name || state.stockOutRequest.product_name || 'Unknown Product',
        quantity: maxQuantity,
        status: barcodeData.status || 'active',
        batch_id: barcodeData.batch_id,
        batch_number: barcodeData.batch_number || '', // Add missing batch_number property
        warehouse_id: barcodeData.warehouse_id,
        warehouse_name: location.state?.warehouseName || 'Unknown',
        floor: location.state?.floor || '',
        zone: location.state?.zone || ''
      };
      
      // Create box data from the batch item
      const boxData = {
        id: enhancedBatchItem.id,
        barcode: barcode,
        quantity: maxQuantity,
        warehouse: enhancedBatchItem.warehouse_name,
        floor: enhancedBatchItem.floor,
        zone: enhancedBatchItem.zone
      };
      
      // Set the current batch item in state
      console.log('🔄 [BARCODE] Setting batch item', enhancedBatchItem);
      updateState({ currentBatchItem: enhancedBatchItem });
      
      // Save to session storage
      console.log('💾 [STORAGE] Saving batch item to sessionStorage', enhancedBatchItem);
      saveBatchItemToSession(enhancedBatchItem);
      
      // Pass to the handler
      handleBarcodeScanned(barcode, boxData);
      
      toast.success('Product processed', {
        description: `Added ${maxQuantity} units of ${enhancedBatchItem.product_name}`,
        duration: 3000
      });
      
      return;
    } catch (error) {
      console.error('Error validating barcode:', error);
      toast.error('Failed to validate barcode', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Handle success state after completing stock out
  const handleSuccess = async () => {
    setIsSuccess(true);
    // Invalidate queries
    queryClient.invalidateQueries({
      queryKey: ['stockOutRequest', stockOutRequestId]
    });
    queryClient.invalidateQueries({
      queryKey: ['stockOutRequests']
    });
  };

  // Store the last processed batch item to use for navigation
  // This is needed because currentBatchItem gets cleared after processing
  const [lastProcessedItem, setLastProcessedItem] = useState<BatchItem | null>(null);
  
  // Update lastProcessedItem whenever currentBatchItem changes
  useEffect(() => {
    if (state.currentBatchItem) {
      console.log('💾 [STORAGE] Saving currentBatchItem to lastProcessedItem state');
      setLastProcessedItem(state.currentBatchItem);
    }
  }, [state.currentBatchItem]);
  
  // Handle proceeding back to stock-out form
  const handleProceedToStockOut = () => {
    try {
      // Get the return path from location state or default to stock-out page
      const returnPath = location.state?.returnPath || '/stock-out';
      
      // Use either currentBatchItem or lastProcessedItem
      const boxData = state.currentBatchItem || lastProcessedItem;
      
      // Validate that we have the necessary data before navigating back
      if (!boxData) {
        console.error('🚨 [NAVIGATION] Cannot navigate back without boxData');
        toast.error('Missing box data', {
          description: 'Please scan a barcode and process a box before proceeding.',
        });
        return;
      }
      
      // Now is when we actually save the data to session storage
      // This prevents automatic processing in the stock-out form
      saveCurrentBatchItemToSession();
      
      // Save additional data to ensure the dialog stays open
      if (location.state?.stockOutId) {
        // Save the stockOutId to ensure dialog opens
        console.log('🔄 [NAVIGATION] Storing dialog open state in sessionStorage', location.state.stockOutId);
        sessionStorage.setItem('stockout-dialog-open', location.state.stockOutId);
        
        // Store the product ID to ensure correct product is selected
        if (state.stockOutRequest?.product_id) {
          console.log('🔄 [NAVIGATION] Storing product ID in sessionStorage', state.stockOutRequest.product_id);
          sessionStorage.setItem(`stockout-product-${location.state.stockOutId}`, state.stockOutRequest.product_id);
        }
        
        // Store form state to ensure it's restored
        const formStateKey = `stockout-form-state-${location.state.stockOutId}`;
        const existingFormState = sessionStorage.getItem(formStateKey);
        let formState = existingFormState ? JSON.parse(existingFormState) : {};
        
        // Update form state with current product data
        if (state.stockOutRequest?.product_id) {
          formState[state.stockOutRequest.product_id] = {
            isExpanded: true, // Auto-expand this product
            isProcessed: false, // Will be processed in the form
            notes: formState[state.stockOutRequest.product_id]?.notes || '',
            boxes: [...(formState[state.stockOutRequest.product_id]?.boxes || [])]
          };
          
          // Save updated form state
          sessionStorage.setItem(formStateKey, JSON.stringify(formState));
        }
        
        // Also store the detail ID if available
        if (location.state?.detailId) {
          sessionStorage.setItem(`stockout-detail-${location.state.stockOutId}`, location.state.detailId);
        }
      }
      
      // Create a deep copy of the boxData to avoid any reference issues
      const boxDataCopy = JSON.parse(JSON.stringify(boxData));
      
      // Add product ID and stock out ID to the box data
      // Use the productId from location.state if available, otherwise fallback to state.stockOutRequest
      boxDataCopy.productId = location.state?.productId || state.stockOutRequest?.product_id || '';
      boxDataCopy.stockOutId = location.state?.stockOutId || '';
      
      console.log('💾 [STORAGE] Adding productId and stockOutId to boxData', {
        productId: boxDataCopy.productId,
        stockOutId: boxDataCopy.stockOutId,
        fromLocationState: !!location.state?.productId,
        fromStockOutRequest: !!state.stockOutRequest?.product_id
      });
      
      // Log the data being passed back to ensure it's complete
      console.log('✅ [NAVIGATION] Proceeding to stock-out with box data:', {
        detailId: location.state?.detailId,
        boxData: {
          id: boxDataCopy.id,
          barcode: boxDataCopy.barcode,
          quantity: boxDataCopy.quantity,
          productId: boxDataCopy.productId,
          stockOutId: boxDataCopy.stockOutId,
          warehouse: boxDataCopy.warehouse_name || boxDataCopy.warehouse
        },
        stockOutId: location.state?.stockOutId,
        productId: boxDataCopy.productId,
        locationState: {
          productId: location.state?.productId,
          detailId: location.state?.detailId,
          stockOutId: location.state?.stockOutId
        }
      });
      
      // Navigate back to the stock-out form with the detailId and boxData if available
      navigate(returnPath, {
        state: {
          detailId: location.state?.detailId,
          boxData: boxDataCopy,
          fromBarcodeScanner: true,
          keepDialogOpen: true,
          stockOutId: location.state?.stockOutId,
          productId: state.stockOutRequest?.product_id,
          timestamp: new Date().getTime() // Add timestamp to ensure state is unique
        },
        replace: true // Replace the current history entry to avoid navigation issues
      });
      
      toast.success('Box data processed', {
        description: `Box ${boxData.barcode} with quantity ${boxData.quantity} will be added to the stock-out.`,
      });
    } catch (error) {
      console.error('❌ [NAVIGATION] Error navigating back:', error);
      toast.error('Error navigating back', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  // Handle removing a processed item
  const handleRemoveProcessedItem = (itemId: string) => {
    const updatedItems = state.processedItems.filter(item => item.id !== itemId);
    const updatedProgress = state.stockOutRequest ? 
      (updatedItems.reduce((sum, item) => sum + item.quantity, 0) / state.stockOutRequest.quantity) * 100 : 0;
    
    updateState({
      processedItems: updatedItems,
      progress: updatedProgress
    });
  };

  // Save batch item to session storage as a backup mechanism
  const saveBatchItemToSession = (batchItem: BatchItem | null = null) => {
    // Use provided batch item, or try currentBatchItem, or lastProcessedItem
    const itemToSave = batchItem || state.currentBatchItem || lastProcessedItem;
    
    if (itemToSave && location.state?.stockOutId) {
      const storageKey = `barcode-scanner-batch-item-${location.state.stockOutId}`;
      console.log('💾 [STORAGE] Saving batch item to sessionStorage', {
        key: storageKey,
        data: itemToSave,
        source: batchItem ? 'provided' : (state.currentBatchItem ? 'currentBatchItem' : 'lastProcessedItem')
      });
      sessionStorage.setItem(storageKey, JSON.stringify(itemToSave));
      
      // Also save detail ID if available
      if (location.state?.detailId) {
        sessionStorage.setItem(`stockout-detail-${location.state.stockOutId}`, location.state.detailId);
      }
      
      return true;
    }
    return false;
  };
  
  // Update scanner enabled state
  const updateScannerEnabled = (enabled: boolean) => {
    updateState({
      scannerEnabled: enabled
    });
  };
  
  // Add debug logging for barcode scanning
  useEffect(() => {
    console.log('Barcode scanner component is using handleBarcodeScanned from useStockOut hook');
  }, []);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Stock Out Request</CardTitle>
            <CardDescription>Please wait while we load the stock out request data...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Stock Out Request</CardTitle>
            <CardDescription>There was an error loading the stock out request data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If no stock out request ID, show error
  if (!stockOutRequestId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Out Request Not Found</CardTitle>
            <CardDescription>No stock out request ID was provided.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Stock out request ID is required to process a stock out.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If success, show success state
  if (isSuccess) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Out Complete</CardTitle>
            <CardDescription>The stock out request has been successfully processed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Success!</h3>
            <p className="text-gray-500 text-center mb-6">
              All items have been successfully processed and the stock out request is complete.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main component render
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="outline" onClick={handleBackToList} className="mr-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Process Stock Out Request</h1>
        </div>
        {state.stockOutRequest && (
          <div className="flex items-center bg-muted/30 px-3 py-1 rounded-md text-sm">
            <span className="font-medium mr-2">Status:</span>
            <span className="capitalize">{state.stockOutRequest.status}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Product Info and Stock Out Progress */}
        <div className="lg:col-span-4 space-y-6">
          {/* Product Information Card */}
          {state.stockOutRequest && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                    <p className="font-medium">{state.stockOutRequest.product_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Quantity</p>
                    <p className="font-medium">{state.stockOutRequest.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining Quantity</p>
                    <p className="font-medium" data-testid="remaining-quantity">
                      {state.stockOutRequest ? 
                        // Calculate remaining quantity directly from the original quantity and processed items
                        // This ensures it's always up-to-date even if the state update is delayed
                        (state.stockOutRequest.quantity - state.processedItems.reduce((sum, item) => sum + item.quantity, 0)) : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                    <p className="font-medium">{state.stockOutRequest.requested_by}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Stock Out Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Stock Out Progress
                </CardTitle>
                {state.isLoading && (
                  <div className="flex items-center text-sm text-amber-500 animate-pulse">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {state.stockOutRequest && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(state.progress)}%</span>
                    </div>
                    <Progress value={state.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Processed: {state.processedItems.reduce((sum, item) => sum + item.quantity, 0)} / {state.stockOutRequest.quantity}
                      </span>
                      <span>
                        Remaining: {state.stockOutRequest ? 
                          // Calculate remaining quantity directly from the original quantity and processed items
                          (state.stockOutRequest.quantity - state.processedItems.reduce((sum, item) => sum + item.quantity, 0)) : 0}
                      </span>
                    </div>
                  </div>
                  
                  {/* Processed Items Summary */}
                  {state.processedItems.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Processed Items</h4>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Batch</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {state.processedItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.batch_number}</TableCell>
                                <TableCell>{item.location_info?.location_name || 'Unknown'}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRemoveProcessedItem(item.id)}
                                    className="h-8 w-8 p-0"
                                    title="Remove item"
                                    aria-label="Remove processed item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                onClick={handleProceedToStockOut} 
                disabled={state.processedItems.length === 0 || state.isProcessing} 
                className="w-full"
                variant="default"
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  '➡️ Proceed to Stockout'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right column: Barcode Scanner and Batch Item Details */}
        <div className="lg:col-span-8">
          <div className="space-y-6">
            {/* Barcode Scanner */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scan Barcode
                </CardTitle>
                <CardDescription>Scan or enter a barcode to process a batch item</CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner 
                  onBarcodeScanned={(barcode: string) => {
                    console.log('Barcode scanned in BarcodeScannerPage, forwarding to useStockOut hook:', barcode);
                    validateAndHandleBarcodeScanned(barcode);
                  }} 
                  isProcessing={state.isProcessing}
                  isEnabled={state.scannerEnabled}
                  currentBatchItem={state.currentBatchItem}
                />
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowRescan"
                    className="mr-2"
                    checked={state.scannerEnabled}
                    onChange={() => updateScannerEnabled(!state.scannerEnabled)}
                  />
                  <label htmlFor="allowRescan" className="text-sm">
                    {state.scannerEnabled ? 'Scanner Enabled (click to disable)' : 'Scanner Disabled (click to enable)'}
                  </label>
                </div>
              </CardFooter>
            </Card>

            {/* Batch Item Details */}
            {state.currentBatchItem && (
              <BatchItemDetails
                batchItem={state.currentBatchItem}
                quantity={state.quantity}
                onQuantityChange={handleQuantityChange}
                onProcess={processBatchItem}
                isProcessing={state.isProcessing}
                maxQuantity={
                  state.stockOutRequest ? 
                  // Calculate max quantity directly from original quantity and processed items
                  // This ensures it's always up-to-date even if the state update is delayed
                  (state.stockOutRequest.quantity - state.processedItems.reduce((sum, item) => sum + item.quantity, 0)) : 0
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerPage;
