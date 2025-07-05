/**
 * Custom hook for managing stock out operations
 */
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  BatchItem,
  StockOutRequest,
  ProcessedItem,
  StockOutState
} from '@/services/stockout/types';
import {
  fetchBatchItemByBarcode,
  validateBarcodeForStockOut,
  processBatchItem,
  calculateStockOutProgress,
  calculateInitialProgress,
  completeStockOut
} from '@/services/stockout/stockoutService';

interface UseStockOutOptions {
  userId: string;
  initialBarcode?: string;
  initialStockOutRequest?: StockOutRequest;
}

export const useStockOut = ({ userId, initialBarcode, initialStockOutRequest }: UseStockOutOptions) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize state
  const [state, setState] = useState<StockOutState>({
    isLoading: false,
    isProcessing: false,
    isSuccess: false,
    currentBatchItem: null,
    stockOutRequest: initialStockOutRequest || null,
    processedItems: [],
    quantity: 1,
    scannerEnabled: true,
    scannedBarcodes: new Set<string>(), // We keep this for backward compatibility but won't use it
    processedQuantityMap: new Map<string, number>(),
    progress: initialStockOutRequest ? 
      calculateInitialProgress(initialStockOutRequest) : 0
  });

  // Helper function to update state partially
  const updateState = useCallback((newState: Partial<StockOutState>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  }, []);

  /**
   * Helper function to calculate how much quantity has been processed for a specific batch item
   * This ensures we always get the most accurate count directly from processed items
   */
  const getProcessedQuantityForBatchItem = useCallback((batchItemId: string) => {
    // Calculate directly from processed items to ensure accuracy after deletions
    let processedQuantity = 0;
    state.processedItems.forEach(item => {
      if (item.batch_item_id === batchItemId) {
        processedQuantity += item.quantity;
      }
    });
    return processedQuantity;
  }, [state.processedItems]);

  /**
   * Handle barcode scanned event
   */
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    try {
      // Validate input
      if (!barcode || !state.stockOutRequest) {
        console.error('Invalid barcode or stock out request');
        toast({
          title: 'Error',
          description: 'No stock out request available',
          variant: 'destructive'
        });
        return;
      }
      
      console.log(`Barcode scanned: ${barcode}`);
      
      // Set loading state
      updateState({ isLoading: true });
      
      // Fetch the batch item for this barcode
      const batchItem = await fetchBatchItemByBarcode(barcode);
      
      if (!batchItem) {
        toast({
          title: 'Invalid Barcode',
          description: 'Barcode not found in any batch items',
          variant: 'destructive'
        });
        updateState({ isLoading: false });
        return;
      }
      
      // Check if the product matches
      if (batchItem.product_id !== state.stockOutRequest.product_id) {
        toast({
          title: 'Invalid Product',
          description: 'Product does not match the stock out request',
          variant: 'destructive'
        });
        updateState({ isLoading: false });
        return;
      }
      
      // Calculate how much has been processed for this batch item in the current session
      // Use our helper function to ensure accuracy after deletions
      const processedQuantityForBatch = getProcessedQuantityForBatchItem(batchItem.id);
      
      // Calculate how much can still be processed from this batch item
      const availableQuantityInBatch = Math.max(0, batchItem.quantity - processedQuantityForBatch);
      
      // Calculate how much is still needed for the stock out request
      const originalQuantity = state.stockOutRequest.quantity;
      
      // Calculate total processed quantity by summing all processed items
      // This ensures we're using the same calculation method as our display code
      const totalProcessedQuantity = state.processedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      
      // Calculate remaining needed based on original quantity and what's already processed
      // This matches the calculation used in the UI for displaying remaining quantity
      const remainingNeeded = Math.max(0, originalQuantity - totalProcessedQuantity);
      
      // The max deductible is the minimum of the batch item available quantity and remaining needed
      const maxDeductible = Math.min(availableQuantityInBatch, remainingNeeded);
      
      console.log('Batch item:', batchItem);
      console.log('Processed quantity for batch:', processedQuantityForBatch);
      console.log('Available quantity in batch:', availableQuantityInBatch);
      console.log('Original quantity:', originalQuantity);
      console.log('Total processed quantity:', totalProcessedQuantity);
      console.log('Remaining needed:', remainingNeeded);
      console.log('Max deductible:', maxDeductible);
      
      if (maxDeductible <= 0) {
        toast({
          title: 'Cannot Process',
          description: availableQuantityInBatch <= 0 ? 
            'This batch item has no more available quantity' : 
            'No more quantity needed for this stock out',
          variant: 'destructive'
        });
        updateState({ isLoading: false });
        return;
      }
      
      // Set the default quantity to process to 1, but limit it to the max deductible
      const defaultQuantity = Math.min(1, maxDeductible);
      
      // Update state with batch item and set quantity to process
      updateState({
        currentBatchItem: batchItem,
        quantity: defaultQuantity,
        isLoading: false
      });
      
      console.log('Batch item set for processing:', {
        batchItem,
        maxDeductible,
        defaultQuantity
      });
      
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scan barcode',
        variant: 'destructive'
      });
      updateState({ isLoading: false });
    }
  }, [state.stockOutRequest, state.processedItems, toast, updateState, getProcessedQuantityForBatchItem]);

  /**
   * Handle quantity change
   */
  const handleQuantityChange = useCallback((quantity: number) => {
    // Ensure quantity is positive
    if (quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Quantity must be greater than zero',
        variant: 'destructive'
      });
      return;
    }
    
    if (!state.currentBatchItem || !state.stockOutRequest) {
      console.error('Missing batch item or stock out request');
      return;
    }
    
    // Calculate how much has been processed for this batch item in the current session
    // We need to recalculate this from the current processed items to ensure it's accurate after deletions
    let processedQuantityForBatch = 0;
    
    // Sum up quantities from all processed items with this batch item ID
    state.processedItems.forEach(item => {
      if (item.batch_item_id === state.currentBatchItem!.id) {
        processedQuantityForBatch += item.quantity;
      }
    });
    
    // Calculate how much can still be processed from this batch item
    const availableQuantityInBatch = Math.max(0, state.currentBatchItem.quantity - processedQuantityForBatch);
    
    // Calculate how much is still needed for the stock out request
    const originalQuantity = state.stockOutRequest.quantity;
    
    // Calculate total processed quantity by summing all processed items
    // This ensures we're using the same calculation method as our display code
    const totalProcessedQuantity = state.processedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    
    // Calculate remaining needed based on original quantity and what's already processed
    const remainingNeeded = Math.max(0, originalQuantity - totalProcessedQuantity);
    
    // The max deductible is the minimum of the batch item available quantity and remaining needed
    const maxDeductible = Math.min(availableQuantityInBatch, remainingNeeded);
    
    console.log('Handling quantity change:', { 
      newQuantity: quantity, 
      currentBatchItemQuantity: state.currentBatchItem.quantity,
      processedQuantityForBatch,
      availableQuantityInBatch,
      originalQuantity,
      totalProcessedQuantity,
      remainingNeeded,
      maxDeductible
    });
    
    // Ensure quantity doesn't exceed available batch quantity
    if (quantity > availableQuantityInBatch) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum available quantity is ${availableQuantityInBatch}`,
        variant: 'destructive'
      });
      return;
    }
    
    // Ensure quantity doesn't exceed remaining quantity in stock out request
    if (quantity > remainingNeeded) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum remaining quantity is ${remainingNeeded}`,
        variant: 'destructive'
      });
      return;
    }
    
    updateState({ quantity });
  }, [state.currentBatchItem, state.stockOutRequest, state.processedItems, toast, updateState]);

  /**
   * Process batch item
   */
  const processBatchItem = useCallback(async () => {
    if (!state.currentBatchItem || !state.stockOutRequest) {
      console.log('Cannot process: missing batch item or stock out request');
      return;
    }
    
    try {
      updateState({ isProcessing: true });
      
      const batchItem = state.currentBatchItem;
      const stockOutRequest = state.stockOutRequest;
      const quantityToDeduct = state.quantity;
      
      if (!batchItem || !stockOutRequest) {
        throw new Error('Missing batch item or stock out request');
      }

      // Calculate how much has been processed for this batch item in the current session
      // Use our helper function to ensure accuracy after deletions
      const processedQuantityForBatch = getProcessedQuantityForBatchItem(batchItem.id);
      
      // Calculate how much can still be processed from this batch item
      const availableQuantityInBatch = Math.max(0, batchItem.quantity - processedQuantityForBatch);
      
      // Calculate how much is still needed for the stock out request
      const originalQuantity = stockOutRequest.quantity;
      
      // Calculate total processed quantity by summing all processed items
      // This ensures we're using the same calculation method as our display code
      const totalProcessedQuantity = state.processedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      
      // Calculate remaining needed based on original quantity and what's already processed
      // This matches the calculation used in the UI for displaying remaining quantity
      const remainingNeeded = Math.max(0, originalQuantity - totalProcessedQuantity);
      
      // The max deductible is the minimum of the batch item available quantity, remaining needed, and requested quantity
      const actualQuantityToDeduct = Math.min(
        quantityToDeduct,
        availableQuantityInBatch,
        remainingNeeded
      );
      
      console.log('Processing batch item:', {
        batchItem,
        quantityToDeduct,
        processedQuantityForBatch,
        availableQuantityInBatch,
        originalQuantity,
        totalProcessedQuantity,
        remainingNeeded,
        actualQuantityToDeduct
      });
      
      if (actualQuantityToDeduct <= 0) {
        throw new Error('Cannot process zero or negative quantity');
      }
      
      // Get the stock out detail ID from the stock out request if available
      let stockOutDetailId = null;
      if (stockOutRequest.details && stockOutRequest.details.length > 0) {
        stockOutDetailId = stockOutRequest.details[0]?.id;
      } else if (stockOutRequest.items && stockOutRequest.items.length > 0) {
        stockOutDetailId = stockOutRequest.items[0]?.detail_id;
      }
      
      console.log('Stock out detail ID for processed item:', stockOutDetailId);
      
      // Create location information object to track where the item is from
      const locationInfo = {
        warehouse_id: batchItem.warehouse_id || null,
        warehouse_name: batchItem.warehouse_name || null,
        location_id: batchItem.location_id || null,
        location_name: batchItem.location_name || null,
        floor: batchItem.floor || null,
        zone: batchItem.zone || null
      };
      
      console.log('Location info for processed item:', locationInfo);
      
      // Create the processed item with a proper UUID
      const processedItem: ProcessedItem = {
        id: uuidv4(), // Generate a proper UUID
        stock_out_id: stockOutRequest.id,
        stock_out_detail_id: stockOutDetailId, // Use the detail ID if available, otherwise null
        batch_item_id: batchItem.id,
        product_id: batchItem.product_id,
        barcode: batchItem.barcode,
        batch_number: batchItem.batch_number,
        product_name: batchItem.product_name,
        warehouse_id: batchItem.warehouse_id || null,
        location_id: batchItem.location_id || null,
        location_info: locationInfo, // Store detailed location information
        quantity: actualQuantityToDeduct,
        processed_by: userId,
        processed_at: new Date().toISOString(),
        notes: JSON.stringify({
          batch_number: batchItem.batch_number,
          product_name: batchItem.product_name,
          location_info: locationInfo
        })
      };
      
      // Update the stock out request with the new remaining quantity
      const newRemainingQuantity = Math.max(0, stockOutRequest.remaining_quantity - actualQuantityToDeduct);
      const updatedStockOutRequest = {
        ...stockOutRequest,
        remaining_quantity: newRemainingQuantity
      };
      
      // Calculate new progress synchronously
      const progress = calculateInitialProgress(updatedStockOutRequest);
      
      // Update the processed quantity map to track how much has been processed from each batch item
      const currentProcessedQuantity = state.processedQuantityMap.get(batchItem.id) || 0;
      const updatedProcessedQuantityMap = new Map(state.processedQuantityMap);
      updatedProcessedQuantityMap.set(batchItem.id, currentProcessedQuantity + actualQuantityToDeduct);
      
      console.log('Updated processed quantity map:', Object.fromEntries(updatedProcessedQuantityMap));
      
      // Update state with new processed item, updated stock out request, and processed quantity map
      updateState({
        processedItems: [...state.processedItems, processedItem],
        stockOutRequest: updatedStockOutRequest,
        currentBatchItem: null, // Clear current batch item to prepare for next scan
        isProcessing: false,
        processedQuantityMap: updatedProcessedQuantityMap,
        progress
      });
      
      
      
      // Show success toast
      toast({
        title: 'Item Processed',
        description: `Successfully deducted ${quantityToDeduct} units.`
      });
      
      // If the remaining quantity is now zero, enable completion
      if (updatedStockOutRequest.remaining_quantity <= 0) {
        console.log('Stock out request fulfilled, ready for approval');
      }
    } catch (error) {
      console.error('Error processing batch item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process batch item',
        variant: 'destructive'
      });
      updateState({ isProcessing: false });
    }
  }, [state.currentBatchItem, state.stockOutRequest, state.quantity, state.processedItems, userId, toast, updateState, getProcessedQuantityForBatchItem]);

  /**
   * Complete the stock out process
   */
  const handleCompleteStockOut = useCallback(async () => {
    if (!state.stockOutRequest) {
      console.error('Cannot complete stock out: missing stock out request');
      return;
    }

    if (state.processedItems.length === 0) {
      toast({
        title: 'No Items Processed',
        description: 'Please process at least one batch item before completing the stock out.',
        variant: 'destructive'
      });
      return;
    }

    // Calculate the total processed quantity
    const totalProcessedQuantity = state.processedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    
    // Calculate the remaining quantity
    const remainingQuantity = state.stockOutRequest.quantity - totalProcessedQuantity;
    
    // Check if all items have been processed
    if (remainingQuantity > 0) {
      toast({
        title: 'Incomplete Stock Out',
        description: `Please scan all required items (${remainingQuantity} remaining) before completing the stock out.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Show loading state
      updateState({ isLoading: true });
      
      // Show processing toast
      toast({
        title: 'Processing Stock Out',
        description: 'Please wait while we complete the stock out process...',
        duration: 5000,
      });
      
      // Complete the stock out
      await completeStockOut(
        state.stockOutRequest.id,
        state.processedItems,
        userId
      );
      
      // Update state
      updateState({
        isLoading: false,
        isSuccess: true,
        scannerEnabled: false
      });
      
      // Invalidate all relevant queries to refresh data across the application
      queryClient.invalidateQueries({ queryKey: ['stock-out'] });
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['batch-items'] });
      queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] });
      
      // Show success toast
      toast({
        title: 'Stock Out Completed',
        description: 'The stock out has been successfully processed.'
      });
      
    } catch (error) {
      console.error('Error completing stock out:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete stock out',
        variant: 'destructive'
      });
      updateState({ isLoading: false });
    }
  }, [state.stockOutRequest, state.processedItems, userId, queryClient, toast, updateState]);

  /**
   * Reset the form
   */
  const resetForm = useCallback(() => {
    setState({
      isLoading: false,
      isProcessing: false,
      isSuccess: false,
      currentBatchItem: null,
      stockOutRequest: initialStockOutRequest || null,
      processedItems: [],
      quantity: 1,
      scannerEnabled: true,
      scannedBarcodes: new Set<string>(), // We keep this for backward compatibility but won't use it
      processedQuantityMap: new Map<string, number>(), // Reset processed quantity map
      progress: initialStockOutRequest ? 
        calculateInitialProgress(initialStockOutRequest) : 0
    });
  }, [initialStockOutRequest]);

  /**
   * Check if the stock out is ready to be approved
   */
  const isReadyForApproval = useCallback((): boolean => {
    if (!state.stockOutRequest) {
      return false;
    }
    
    // Calculate the total processed quantity
    const totalProcessedQuantity = state.processedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    
    // Calculate the remaining quantity
    const remainingQuantity = state.stockOutRequest.quantity - totalProcessedQuantity;
    
    return (
      state.processedItems.length > 0 &&
      remainingQuantity <= 0
    );
  }, [state.stockOutRequest, state.processedItems]);

  /**
   * Delete a processed item
   */
  const deleteProcessedItem = useCallback(async (itemId: string) => {
    try {
      console.log(`Deleting processed item ${itemId}`);
      
      // Find the item to be deleted to get its quantity
      const itemToDelete = state.processedItems.find(item => item.id === itemId);
      if (!itemToDelete) {
        console.error(`Item with ID ${itemId} not found`);
        return;
      }
      
      console.log('Item to delete:', itemToDelete);
      
      // Filter out the item to be deleted
      const updatedProcessedItems = state.processedItems.filter(item => item.id !== itemId);
      
      // We no longer need to manually rebuild the processedQuantityMap
      // Our getProcessedQuantityForBatchItem helper function will calculate quantities directly from processedItems
      // This ensures we always have accurate quantities even after deletions
      console.log('Deleted item - will recalculate quantities from processed items directly');
      
      // Calculate the total processed quantity after deletion
      const totalProcessedQuantity = updatedProcessedItems.reduce(
        (sum, item) => sum + item.quantity, 
        0
      );
      
      // Reset the remaining quantity based on the original quantity and what's still processed
      const originalQuantity = state.stockOutRequest?.quantity || 0;
      const newRemainingQuantity = originalQuantity - totalProcessedQuantity;
      
      console.log('Original quantity:', originalQuantity);
      console.log('Total processed after deletion:', totalProcessedQuantity);
      console.log('New remaining quantity:', newRemainingQuantity);
      
      // First update the processed items to ensure UI reflects changes immediately
      // We no longer need to update processedQuantityMap as we calculate directly from processedItems
      updateState({
        processedItems: updatedProcessedItems,
      });
      
      // Create a new stock out request object with updated remaining quantity
      const updatedStockOutRequest = state.stockOutRequest ? {
        ...state.stockOutRequest,
        remaining_quantity: newRemainingQuantity
      } : null;
      
      // Calculate new progress using the same function as when processing items
      const progress = await calculateStockOutProgress(updatedStockOutRequest);
      
      console.log('Calculated progress after deletion:', progress);
      console.log('Updated stock out request:', updatedStockOutRequest);
      
      // Check if the deleted item was from the same batch as the current batch item
      // If so, we need to reset the current batch item to ensure proper validation
      let refreshedBatchItem = state.currentBatchItem;
      const wasCurrentBatchItemProcessed = itemToDelete.batch_item_id === state.currentBatchItem?.id;
      
      if (wasCurrentBatchItemProcessed) {
        console.log('The deleted item was from the current batch - refreshing batch item state');
        
        // If we have the same batch item currently selected, we need to refresh it
        // by fetching it again to get the latest quantity
        if (state.currentBatchItem) {
          try {
            // Re-fetch the batch item to get fresh data
            const refreshedItem = await fetchBatchItemByBarcode(state.currentBatchItem.barcode);
            if (refreshedItem) {
              refreshedBatchItem = refreshedItem;
              console.log('Re-fetched current batch item with fresh data:', refreshedItem);
            }
          } catch (error) {
            console.error('Error refreshing batch item:', error);
            // If we can't refresh, at least create a new reference
            refreshedBatchItem = { ...state.currentBatchItem };
          }
        }
      } else if (state.currentBatchItem) {
        // For other batch items, just create a new reference to force a re-render
        refreshedBatchItem = { ...state.currentBatchItem };
        console.log('Created new reference for current batch item to force UI update');
      }
      
      // Update the remaining state with the stock out request and other changes
      updateState({
        stockOutRequest: updatedStockOutRequest,
        progress,
        currentBatchItem: refreshedBatchItem,
        // Reset quantity to 1 for the next scan to ensure a clean state
        quantity: 1
      });
      
      // Force a re-render by updating the state again with the same values
      // This ensures React notices the changes to deeply nested objects
      setTimeout(() => {
        if (updatedStockOutRequest) {
          updateState({
            stockOutRequest: { ...updatedStockOutRequest }
          });
        }
      }, 50);
      
      // Log the state after update to verify changes
      setTimeout(() => {
        console.log('State after deletion update:', {
          processedItems: state.processedItems.length,
          remainingQuantity: state.stockOutRequest?.remaining_quantity,
          progress: state.progress,
          processedQuantityMap: Object.fromEntries(state.processedQuantityMap),
          currentBatchItem: state.currentBatchItem ? 'Present' : 'None'
        });
      }, 200);
      
      toast({
        title: 'Item Removed',
        description: 'The processed item has been removed successfully.'
      });
    } catch (error) {
      console.error('Error deleting processed item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the processed item.',
        variant: 'destructive'
      });
    }
  }, [state, toast, updateState, calculateStockOutProgress, fetchBatchItemByBarcode, getProcessedQuantityForBatchItem]);

  return {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    handleCompleteStockOut,
    resetForm,
    isReadyForApproval,
    updateState,
    deleteProcessedItem
  };
};

export default useStockOut;
