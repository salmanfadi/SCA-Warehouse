import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { executeQuery } from '@/lib/supabase';
import { StockOutRequest, BatchItem, DeductedBatch, createDeductedBatch } from '../barcode/BarcodeValidation';
import { StockOutFormState } from './types';
import { useQueryClient } from '@tanstack/react-query';

// Interface for the database response with joined tables
interface BatchItemWithJoins {
  id: string;
  batch_id: string;
  product_id: string;
  warehouse_id?: string;
  location_id?: string;
  barcode_id?: string;
  quantity: number;
  box_number?: string;
  barcode: string;
  color?: string;
  size?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  products: {
    id: string;
    name: string;
    sku: string;
  };
  batches: {
    id: string;
    batch_number: string;
    expiry_date: string;
  };
  locations?: {
    id: string;
    name: string;
  };
}

export const useStockOutForm = (userId: string, initialBarcode?: string, initialStockOutRequest?: any) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<StockOutFormState>({
    isLoading: false,
    isProcessing: false,
    isSuccess: false,
    currentBatchItem: null,
    stockOutRequest: null,
    processedItems: [],
    quantity: 1,
    scannerEnabled: true,
    scannedBarcodes: new Set<string>(),
    deductedBatches: []
  });

  // Helper function to update state partially
  const updateState = (newState: Partial<StockOutFormState>) => {
    setState(prevState => ({ ...prevState, ...newState }));
  };

  // Handle barcode scan
  const handleBarcodeScanned = async (barcode: string) => {
    if (!state.scannerEnabled || state.isProcessing) return;
    
    // Check if barcode has already been scanned
    if (state.scannedBarcodes.has(barcode)) {
      toast({
        title: 'Already Scanned',
        description: 'This barcode has already been scanned.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      updateState({ isProcessing: true });
      
      // Fetch batch item details by barcode
      const { data: batchItem, error } = await executeQuery('batch_items', async (supabase) => {
        return await supabase
          .from('batch_items')
          .select(`
            id, 
            batch_id, 
            product_id, 
            quantity, 
            box_number,
            barcode,
            products(id, name, sku),
            batches(id, batch_number, expiry_date)
          `)
          .eq('barcode', barcode)
          .single();
      }) as { data: BatchItemWithJoins | null, error: any };
      
      if (error) {
        throw new Error(`Barcode not found: ${error.message}`);
      }
      
      if (!batchItem) {
        throw new Error('No batch item found with this barcode');
      }
      
      // Check if product matches the requested product
      if (state.stockOutRequest && batchItem.product_id !== state.stockOutRequest.product_id) {
        // Access product name from the database response which has a products join
        const scannedProductName = batchItem.products?.name || 'Unknown';
        throw new Error(`Product mismatch: Scanned ${scannedProductName} but requested ${state.stockOutRequest.product_name || 'Unknown'}`);
      }
      
      // Check if there's enough quantity
      if (batchItem.quantity <= 0) {
        throw new Error('This batch item has no quantity available');
      }
      
      // Add barcode to scanned set
      const updatedScannedBarcodes = new Set(state.scannedBarcodes);
      updatedScannedBarcodes.add(barcode);
      
      // Convert database response to BatchItem format
      const simplifiedBatchItem: BatchItem = {
        id: batchItem.id,
        batch_id: batchItem.batch_id,
        product_id: batchItem.product_id,
        warehouse_id: batchItem.warehouse_id,
        location_id: batchItem.location_id,
        barcode_id: batchItem.barcode_id,
        barcode: batchItem.barcode,
        color: batchItem.color,
        size: batchItem.size,
        quantity: batchItem.quantity,
        status: batchItem.status,
        created_at: batchItem.created_at,
        updated_at: batchItem.updated_at,
        // Derived properties
        batch_number: batchItem.batches?.batch_number || null,
        product_name: batchItem.products?.name || 'Unknown',
        location_name: batchItem.locations?.name || ''
      };
      
      // Update state with batch item
      updateState({
        currentBatchItem: simplifiedBatchItem,
        isProcessing: false,
        scannedBarcodes: updatedScannedBarcodes,
        quantity: 1 // Reset quantity to 1 for new scan
      });
      
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process barcode',
        variant: 'destructive'
      });
      updateState({ isProcessing: false });
    }
  };

  // Handle quantity change
  const handleQuantityChange = (quantity: number) => {
    // Ensure quantity doesn't exceed available batch quantity
    if (state.currentBatchItem && quantity > state.currentBatchItem.quantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum available quantity is ${state.currentBatchItem.quantity}`,
        variant: 'destructive'
      });
      return;
    }
    
    // Ensure quantity doesn't exceed remaining request quantity
    if (state.stockOutRequest && quantity > state.stockOutRequest.remaining_quantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Maximum remaining quantity is ${state.stockOutRequest.remaining_quantity}`,
        variant: 'destructive'
      });
      return;
    }
    
    updateState({ quantity });
  };

  // Complete the stock out process
  const completeStockOut = useCallback(async () => {
    if (!state.stockOutRequest) return;

    try {
      updateState({ isProcessing: true });

      // Process all deducted batches
      for (const batch of state.deductedBatches) {
        // Fetch current batch item quantity
        const { data: batchItem, error: fetchError } = await executeQuery('batch_items', async (supabase) => {
          return await supabase
            .from('batch_items')
            .select('quantity')
            .eq('id', batch.batch_item_id)
            .single();
        });
        
        if (fetchError) {
          throw new Error(`Failed to fetch batch item: ${fetchError.message}`);
        }
        
        // Calculate remaining quantity
        const remainingQuantity = Math.max(0, (batchItem?.quantity || 0) - batch.quantity_deducted);
        
        // Update batch item quantity
        const { error: batchError } = await executeQuery('batch_items', async (supabase) => {
          return await supabase
            .from('batch_items')
            .update({ quantity: remainingQuantity })
            .eq('id', batch.batch_item_id);
        });

        if (batchError) {
          throw new Error(`Failed to update batch item: ${batchError.message}`);
        }
      }

      // Update stock out request status
      const { error: stockOutError } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .update({ 
            status: 'completed', 
            processed_by: userId,
            processed_at: new Date().toISOString()
          })
          .eq('id', state.stockOutRequest?.id);
      });

      if (stockOutError) {
        throw new Error(`Failed to update stock out request: ${stockOutError.message}`);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      queryClient.invalidateQueries({ queryKey: ['stock-out-request', state.stockOutRequest?.id] });

      // Success
      updateState({ 
        isProcessing: false,
        isSuccess: true
      });

      toast({
        title: 'Success',
        description: 'Stock out has been successfully processed.'
      });

    } catch (error) {
      console.error('Error completing stock out:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete stock out',
        variant: 'destructive'
      });
      updateState({ isProcessing: false });
    }
  }, [state.stockOutRequest, state.deductedBatches, userId, queryClient, toast]);

  // Process batch item
  const processBatchItem = async () => {
    if (!state.currentBatchItem || !state.stockOutRequest) return;
    
    try {
      updateState({ isProcessing: true });
      
      const batchItem = state.currentBatchItem as BatchItem;
      const stockOutRequest = state.stockOutRequest;
      
      // Ensure quantity doesn't exceed available or remaining
      const quantityToDeduct = Math.min(
        state.quantity,
        batchItem.quantity,
        stockOutRequest.remaining_quantity
      );
      
      if (quantityToDeduct <= 0) {
        throw new Error('Invalid quantity to deduct');
      }
      
      // Calculate new remaining quantities
      const newBatchQuantity = batchItem.quantity - quantityToDeduct;
      const newRemainingQuantity = stockOutRequest.remaining_quantity - quantityToDeduct;
      
      // Create deducted batch record
      // Since we're working with the simplified BatchItem from state
      // which already has all the properties we need, we can use it directly
      const batchItemForDeduction: BatchItem = {
        ...batchItem,
        // Ensure required properties are set
        id: batchItem.id,
        product_id: batchItem.product_id,
        barcode: batchItem.barcode,
        quantity: batchItem.quantity
      };
      
      const deductedBatch = createDeductedBatch(batchItemForDeduction, quantityToDeduct);
      
      // Update state with new deducted batch and updated remaining quantity
      const updatedDeductedBatches = [...state.deductedBatches, deductedBatch];
      const updatedStockOutRequest = {
        ...stockOutRequest,
        remaining_quantity: newRemainingQuantity
      };
      
      updateState({
        deductedBatches: updatedDeductedBatches,
        stockOutRequest: updatedStockOutRequest,
        currentBatchItem: null,
        isProcessing: false
      });
      
      // Check if stock out is complete
      if (newRemainingQuantity === 0) {
        await completeStockOut();
      } else {
        toast({
          title: 'Batch Processed',
          description: `${quantityToDeduct} units processed. ${newRemainingQuantity} units remaining.`,
        });
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
  };

  // Use initialStockOutRequest or fetch stock out request data when component mounts
  useEffect(() => {
    // If initialStockOutRequest is provided, use it
    if (initialStockOutRequest) {
      // Transform the stock out request to match the expected format if needed
      const formattedRequest = {
        ...initialStockOutRequest,
        // Add any required fields that might be missing
        remaining_quantity: initialStockOutRequest.stock_out_details?.[0]?.quantity || initialStockOutRequest.quantity || 0,
        product: initialStockOutRequest.stock_out_details?.[0]?.product || initialStockOutRequest.product,
        product_id: initialStockOutRequest.stock_out_details?.[0]?.product_id || initialStockOutRequest.product_id,
      };
      
      updateState({ 
        stockOutRequest: formattedRequest as StockOutRequest,
        isLoading: false
      });
      return;
    }
    
    // Otherwise fetch the most recent pending stock out request
    const fetchStockOutRequest = async () => {
      try {
        updateState({ isLoading: true });
        
        const { data, error } = await executeQuery('stock_out_requests', async (supabase) => {
          return await supabase.rpc('get_pending_stock_out_request');
        });

        if (error) throw error;
        
        if (data && data.length > 0) {
          updateState({ 
            stockOutRequest: data[0] as StockOutRequest,
            isLoading: false
          });
        } else {
          toast({
            title: 'No pending stock out requests',
            description: 'There are no pending stock out requests to process.',
            variant: 'destructive'
          });
          updateState({ isLoading: false });
        }
      } catch (error) {
        console.error('Error fetching stock out request:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch stock out request data.',
          variant: 'destructive'
        });
        updateState({ isLoading: false });
      }
    };

    fetchStockOutRequest();
  }, [initialStockOutRequest, toast]);

  // Handle initialBarcode if provided
  useEffect(() => {
    if (initialBarcode && state.scannerEnabled) {
      handleBarcodeScanned(initialBarcode);
    }
  }, [initialBarcode, state.scannerEnabled]);

  return {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    completeStockOut
  };
};
