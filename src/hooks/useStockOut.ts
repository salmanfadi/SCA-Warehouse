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
    progress: initialStockOutRequest ? 
      calculateInitialProgress(initialStockOutRequest) : 0
  });

  // Helper function to update state partially
  const updateState = useCallback((newState: Partial<StockOutState>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  }, []);

  /**
   * Handle barcode scanning
   */
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    
    if (!state.stockOutRequest) {
      console.error('No stock out request available');
      toast({
        title: 'Error',
        description: 'No stock out request available',
        variant: 'destructive'
      });
      return;
    }
    
    // We no longer check if barcode has been scanned before
    // This allows scanning the same barcode multiple times
    
    try {
      // Show loading state
      updateState({ isProcessing: true });
      
      // Validate the barcode without passing scannedBarcodes
      // This allows the same barcode to be scanned multiple times
      const validationResult = await validateBarcodeForStockOut(
        barcode,
        state.stockOutRequest
        // Removed scannedBarcodes parameter to allow rescanning
      );
      
      if (!validationResult.isValid || !validationResult.batchItem) {
        console.error('Invalid barcode:', validationResult.errorMessage);
        toast({
          title: 'Invalid Barcode',
          description: validationResult.errorMessage || 'This barcode is not valid for this stock out',
          variant: 'destructive'
        });
        updateState({ isProcessing: false });
        return;
      }
      
      // We no longer add barcode to scanned set
      // This allows the same barcode to be scanned multiple times
      
      // Update state with batch item and reset quantity to 1
      updateState({
        currentBatchItem: validationResult.batchItem,
        quantity: 1,
        isProcessing: false
        // Removed scannedBarcodes update
      });
      
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scan barcode',
        variant: 'destructive'
      });
      updateState({ isProcessing: false });
    }
  }, [state.stockOutRequest, state.currentBatchItem, toast, updateState]);

  /**
   * Handle quantity change
   */
  const handleQuantityChange = useCallback((quantity: number) => {
    console.log('Handling quantity change:', { 
      newQuantity: quantity, 
      currentBatchItemQuantity: state.currentBatchItem?.quantity,
      remainingQuantity: state.stockOutRequest?.remaining_quantity
    });
    
    // Ensure quantity is positive
    if (quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Quantity must be greater than zero',
        variant: 'destructive'
      });
      return;
    }
    
    // Ensure quantity doesn't exceed available batch quantity
    if (state.currentBatchItem && quantity > state.currentBatchItem.quantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum available quantity is ${state.currentBatchItem.quantity}`,
        variant: 'destructive'
      });
      return;
    }
    
    // Ensure quantity doesn't exceed remaining quantity in stock out request
    if (state.stockOutRequest && quantity > state.stockOutRequest.remaining_quantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum remaining quantity is ${state.stockOutRequest.remaining_quantity}`,
        variant: 'destructive'
      });
      return;
    }
    
    updateState({ quantity });
  }, [state.currentBatchItem, state.stockOutRequest, toast, updateState]);

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

      // Calculate the actual quantity to deduct (reimplementing the logic from processBatchItem)
      const actualQuantityToDeduct = Math.min(
        quantityToDeduct,
        batchItem.quantity,
        stockOutRequest.remaining_quantity
      );
      
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
        location_info: locationInfo, // Store detailed location information
        quantity: actualQuantityToDeduct,
        processed_by: userId,
        processed_at: new Date().toISOString()
      };
      
      // Update the stock out request with the new remaining quantity
      const newRemainingQuantity = Math.max(0, stockOutRequest.remaining_quantity - actualQuantityToDeduct);
      const updatedStockOutRequest = {
        ...stockOutRequest,
        remaining_quantity: newRemainingQuantity
      };
      
      // Calculate new progress synchronously
      const progress = calculateInitialProgress(updatedStockOutRequest);
      
      // Update state with new processed item and updated stock out request
      updateState({
        processedItems: [...state.processedItems, processedItem],
        stockOutRequest: updatedStockOutRequest,
        currentBatchItem: null, // Clear current batch item to prepare for next scan
        isProcessing: false,
        progress
      });
      
      // Also update progress asynchronously for more accuracy
      calculateStockOutProgress(updatedStockOutRequest).then(asyncProgress => {
        if (asyncProgress !== progress) {
          updateState({ progress: asyncProgress });
        }
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
  }, [state.currentBatchItem, state.stockOutRequest, state.quantity, state.processedItems, userId, toast, updateState]);

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

    // Check if all items have been processed
    if (state.stockOutRequest.remaining_quantity > 0) {
      toast({
        title: 'Incomplete Stock Out',
        description: 'Please scan all required items before completing the stock out.',
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
      progress: initialStockOutRequest ? 
        calculateInitialProgress(initialStockOutRequest) : 0
    });
  }, [initialStockOutRequest]);

  /**
   * Check if the stock out is ready to be approved
   */
  const isReadyForApproval = useCallback((): boolean => {
    return (
      !!state.stockOutRequest &&
      state.processedItems.length > 0 &&
      state.stockOutRequest.remaining_quantity <= 0
    );
  }, [state.stockOutRequest, state.processedItems]);

  /**
   * Delete a processed item
   */
  const deleteProcessedItem = useCallback((itemId: string) => {
    try {
      // Find the item to delete
      const itemToDelete = state.processedItems.find(item => item.id === itemId);
      
      if (!itemToDelete) {
        console.error('Item not found for deletion:', itemId);
        return;
      }
      
      console.log('Deleting processed item:', itemToDelete);
      
      // Remove the item from processed items
      const updatedProcessedItems = state.processedItems.filter(item => item.id !== itemId);
      
      // Calculate the total processed quantity after deletion
      const totalProcessedQuantity = updatedProcessedItems.reduce(
        (sum, item) => sum + item.quantity, 
        0
      );
      
      // Reset the remaining quantity based on the original quantity and what's still processed
      // This ensures we can always add up to the original quantity regardless of deletions
      const originalQuantity = state.stockOutRequest?.quantity || 0;
      const newRemainingQuantity = originalQuantity - totalProcessedQuantity;
      
      console.log('Original quantity:', originalQuantity);
      console.log('Total processed after deletion:', totalProcessedQuantity);
      console.log('New remaining quantity:', newRemainingQuantity);
      
      // Update the stock out request with the new remaining quantity
      const updatedStockOutRequest = state.stockOutRequest ? {
        ...state.stockOutRequest,
        remaining_quantity: newRemainingQuantity
      } : null;
      
      // Calculate new progress
      const progress = updatedStockOutRequest ? 
        calculateInitialProgress(updatedStockOutRequest) : 0;
      
      // Update state
      updateState({
        processedItems: updatedProcessedItems,
        stockOutRequest: updatedStockOutRequest,
        progress
      });
      
      // Show success toast
      toast({
        title: 'Item Removed',
        description: `Successfully removed item with quantity ${itemToDelete.quantity}.`
      });
      
    } catch (error) {
      console.error('Error deleting processed item:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete processed item',
        variant: 'destructive'
      });
    }
  }, [state.processedItems, state.stockOutRequest, toast, updateState]);

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
