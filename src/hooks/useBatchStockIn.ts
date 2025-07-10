import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { BatchData, StockInBatchSubmission } from '@/types/batchStockIn';
import { v4 as uuidv4 } from 'uuid';
import { createInventoryMovement } from './useInventoryMovements';

// Define the BoxData interface used for processing
export interface BoxData {
  id: string;
  product_id: string;
  quantity: number;
  warehouse_id: string;
  location_id: string;
  color: string;
  size: string;
  barcode: string;
}

// Define the BatchType interface that is exported for components to use
export interface BatchType {
  id?: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  boxes_count: number;
  quantity_per_box: number; // Required
  color?: string;
  size?: string;
  created_by: string; // Required
  barcodes?: string[];
}

export const useBatchStockIn = (userId: string = '') => {
  const [batches, setBatches] = useState<BatchType[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [barcodeErrors, setBarcodeErrors] = useState<any[]>([]);

  // Add a batch to the state
  const addBatch = (batchData: any) => {
    const newBatch: BatchType = {
      id: uuidv4(),
      product_id: batchData.product?.id || '',
      warehouse_id: batchData.warehouse?.id || '',
      location_id: batchData.location?.id || '',
      boxes_count: batchData.boxes_count,
      quantity_per_box: batchData.quantity_per_box || 1,
      color: batchData.color,
      size: batchData.size,
      created_by: userId, 
    };

    if (editingIndex !== null) {
      // Update existing batch
      const updatedBatches = [...batches];
      updatedBatches[editingIndex] = newBatch;
      setBatches(updatedBatches);
      setEditingIndex(null);
    } else {
      // Add new batch
      setBatches([...batches, newBatch]);
    }
  };

  // Edit an existing batch
  const editBatch = (index: number) => {
    setEditingIndex(index);
  };

  // Delete a batch
  const deleteBatch = (index: number) => {
    if (index < 0 || index >= batches.length) {
      console.error('Invalid batch index for deletion:', index);
      return;
    }
    
    try {
      const updatedBatches = batches.filter((_, i) => i !== index);
      setBatches(updatedBatches);
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Error', {
        description: 'Failed to delete batch. Please try again.'
      });
    }
  };

  // Reset batches state
  const resetBatches = () => {
    setBatches([]);
    setEditingIndex(null);
    setIsProcessing(false);
    setIsSubmitting(false);
    setIsSuccess(false);
    setBarcodeErrors([]);
  };

  // Process batches into boxes
  const processBatch = async (stockInId: string, boxes: BoxData[], userId?: string) => {
    setIsProcessing(true);
    try {
      // Before creating any records, verify that none of the barcodes exist already
      const barcodes = boxes.map(box => box.barcode);
      
      // Check for existing barcodes in inventory
      const { data: existingBarcodes, error: barcodeCheckError } = await supabase
        .from('inventory')
        .select('barcode')
        .in('barcode', barcodes);
        
      if (barcodeCheckError) {
        throw new Error(`Error checking existing barcodes: ${barcodeCheckError.message}`);
      }
      
      if (existingBarcodes && existingBarcodes.length > 0) {
        const duplicates = existingBarcodes.map(item => item.barcode).join(', ');
        throw new Error(`These barcodes already exist in inventory: ${duplicates}`);
      }
      
      // Create processed batch record
      const { data: batchData, error: batchError } = await supabase
        .from('processed_batches')
        .insert({
          stock_in_id: stockInId,
          processed_by: userId || '',
          status: 'completed',
          source: 'batch processing',
          total_boxes: boxes.length,
          total_quantity: boxes.reduce((sum, box) => sum + box.quantity, 0),
          processed_at: new Date().toISOString(),
          product_id: boxes[0].product_id,
          warehouse_id: boxes[0].warehouse_id // Add warehouse_id to processed_batches for filtering
        })
        .select()
        .single();

      if (batchError) throw batchError;
      
      const processed_batch_id = batchData.id;
      const barcodeErrors: any[] = [];
      
      // Process each box in sequence to maintain referential integrity
      for (const box of boxes) {
        try {
          // Check if this specific barcode already exists in stock_in_details
          const { data: existingDetail, error: detailCheckError } = await supabase
            .from('stock_in_details')
            .select('id')
            .eq('barcode', box.barcode)
            .maybeSingle();
            
          if (detailCheckError) {
            console.error(`Error checking if barcode ${box.barcode} exists:`, detailCheckError);
            barcodeErrors.push({
              barcode: box.barcode,
              error: `Failed to check barcode existence: ${detailCheckError.message}`
            });
            continue;
          }
          
          if (existingDetail) {
            console.warn(`Barcode ${box.barcode} already exists in stock_in_details, skipping`);
            barcodeErrors.push({
              barcode: box.barcode,
              error: `Barcode ${box.barcode} already exists in the system`
            });
            continue;
          }
          
          // IMPORTANT: Create stock_in_detail first
          const { data: detailData, error: detailError } = await supabase
            .from('stock_in_details')
            .insert({
              stock_in_id: stockInId,
              warehouse_id: box.warehouse_id,
              location_id: box.location_id,
              barcode: box.barcode,
              quantity: box.quantity,
              color: box.color,
              size: box.size,
              product_id: box.product_id,
              batch_number: processed_batch_id, // Use the processed_batch_id as batch_number
              status: 'completed' // Mark as completed immediately
            })
            .select()
            .single();
            
          if (detailError) {
            console.error('Error creating stock_in_details:', detailError);
            barcodeErrors.push({
              barcode: box.barcode,
              error: detailError.message
            });
            continue; // Skip inventory creation if detail creation fails
          }
          
          // 2. Now create batch_item record
          const { error: itemError } = await supabase
            .from('batch_items')
            .insert({
              batch_id: processed_batch_id,
              barcode: box.barcode,
              quantity: box.quantity,
              color: box.color,
              size: box.size,
              warehouse_id: box.warehouse_id,
              location_id: box.location_id,
              status: 'available'
            });
            
          if (itemError) {
            console.error('Error creating batch item:', itemError);
            barcodeErrors.push({
              barcode: box.barcode,
              error: itemError.message
            });
          }
          
          // 3. Create inventory entry with reference to the stock_in_detail - updated to use correct columns
          const { error: inventoryError, data: inventoryData } = await supabase
            .from('inventory')
            .insert({
              product_id: box.product_id,
              warehouse_id: box.warehouse_id,
              location_id: box.location_id,
              quantity: box.quantity,
              barcode: box.barcode,
              color: box.color,
              size: box.size,
              batch_id: processed_batch_id, // Use processed_batch_id for batch_id
              stock_in_id: stockInId,
              stock_in_detail_id: detailData.id // Important: Reference the detail ID
            })
            .select()
            .single();
            
          if (inventoryError) {
            console.error('Error creating inventory entry:', inventoryError);
            barcodeErrors.push({
              barcode: box.barcode,
              error: inventoryError.message
            });
          } else if (inventoryData) {
            // 4. Create inventory movement record
            await createInventoryMovement(
              box.product_id,
              box.warehouse_id,
              box.location_id,
              box.quantity,
              'in',
              'approved',
              'stock_in',
              stockInId,
              userId || '',
              { 
                barcode: box.barcode, 
                batch_id: processed_batch_id,
                stock_in_detail_id: detailData.id 
              }
            );
          }
        } catch (boxError) {
          console.error(`Error processing box with barcode ${box.barcode}:`, boxError);
          barcodeErrors.push({
            barcode: box.barcode,
            error: boxError instanceof Error ? boxError.message : 'Unknown error'
          });
        }
      }
      
      // ALWAYS update stock_in status to completed when all batches are processed
      try {
        const { error: updateError } = await supabase
          .from('stock_in')
          .update({ 
            status: 'completed',
            processed_by: userId,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', stockInId);
          
        if (updateError) {
          console.error('Error updating stock_in status:', updateError);
          // Continue execution even if this fails
        }
      } catch (updateError) {
        console.error('Exception updating stock_in status:', updateError);
        // Continue execution even if this fails
      }
      
      if (barcodeErrors.length > 0) {
        toast({
          title: 'Batch processed with some errors',
          description: `${barcodeErrors.length} barcodes had errors during processing.`,
          variant: 'default',
        });
        setBarcodeErrors(barcodeErrors);
        return { success: true, processed_batch_id, barcodeErrors };
      }
      
      toast.success("Batch processed successfully");
      
      return { success: true, processed_batch_id };
    } catch (error) {
      console.error('Error processing batch:', error);
      
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      
      return { success: false, processed_batch_id: '', barcodeErrors: [] };
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit all batches as a stock in submission
  const submitStockIn = async (submission: StockInBatchSubmission) => {
    setIsSubmitting(true);
    
    try {
      // Convert batches to box format for processing
      const boxes: BoxData[] = [];
      
      for (const batch of submission.batches) {
        for (let i = 0; i < batch.boxes_count; i++) {
          // Generate a unique barcode for each box
          const barcode = `BOX-${batch.product_id.slice(0, 6)}-${Date.now()}-${i}`;
          
          boxes.push({
            id: uuidv4(),
            product_id: batch.product_id,
            quantity: batch.quantity_per_box,
            warehouse_id: batch.warehouse_id,
            location_id: batch.location_id,
            color: batch.color || '',
            size: batch.size || '',
            barcode
          });
        }
      }
      
      // Create stock_in record if not provided
      let processingStockInId = submission.stockInId;
      if (!processingStockInId) {
        const { data: stockInData, error: stockInError } = await supabase
          .from('stock_in')
          .insert({
            product_id: submission.productId,
            source: submission.source || 'batch',
            notes: submission.notes,
            status: 'processing',
            submitted_by: submission.submittedBy,
            boxes: boxes.length
          })
          .select()
          .single();
          
        if (stockInError) throw stockInError;
        processingStockInId = stockInData.id;
      } else {
        // Update existing stock in to processing status
        const { error: updateError } = await supabase
          .from('stock_in')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString() 
          })
          .eq('id', processingStockInId);
          
        if (updateError) {
          console.error('Error updating stock_in status to processing:', updateError);
        }
      }
      
      const result = await processBatch(processingStockInId, boxes, submission.submittedBy);
      
      if (result.success) {
        setIsSuccess(true);
        setBarcodeErrors(result.barcodeErrors || []);
      }
      
      return result;
    } catch (error) {
      console.error('Error submitting stock in:', error);
      
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
    resetBatches,
    processBatch,
  };
};
