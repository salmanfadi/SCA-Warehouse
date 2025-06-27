/**
 * Supabase RPC function for handling stock out transactions atomically
 * 
 * This file contains the SQL function definition that should be added to the Supabase database
 * via the SQL editor in the Supabase dashboard.
 * 
 * Copy this function and execute it in the SQL editor to create the transaction support.
 */

/*
-- Function to complete a stock out transaction atomically
-- This ensures that all batch item updates and stock out status changes happen in a single transaction
CREATE OR REPLACE FUNCTION complete_stock_out_transaction(
  p_stock_out_id UUID,
  p_processed_by UUID,
  p_batch_updates JSONB
) RETURNS VOID AS $$
DECLARE
  batch_update JSONB;
  batch_item_id UUID;
  quantity_deducted INT;
  current_quantity INT;
  remaining_quantity INT;
BEGIN
  -- Start transaction
  BEGIN
    -- Process each batch update
    FOR batch_update IN SELECT * FROM jsonb_array_elements(p_batch_updates)
    LOOP
      -- Extract values from the batch update
      batch_item_id := (batch_update->>'batch_item_id')::UUID;
      quantity_deducted := (batch_update->>'quantity_deducted')::INT;
      
      -- Get current quantity
      SELECT quantity INTO current_quantity
      FROM batch_items
      WHERE id = batch_item_id;
      
      -- Calculate remaining quantity
      remaining_quantity := GREATEST(0, current_quantity - quantity_deducted);
      
      -- Update batch item quantity
      UPDATE batch_items
      SET quantity = remaining_quantity
      WHERE id = batch_item_id;
    END LOOP;
    
    -- Update stock out request status
    UPDATE stock_out
    SET 
      status = 'completed',
      processed_by = p_processed_by,
      processed_at = NOW(),
      remaining_quantity = 0
    WHERE id = p_stock_out_id;
    
    -- Insert into stock out history
    INSERT INTO stock_out_history (
      stock_out_id,
      processed_by,
      processed_at,
      details
    ) VALUES (
      p_stock_out_id,
      p_processed_by,
      NOW(),
      p_batch_updates
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back transaction on any error
      RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;
*/

import { executeQuery } from '@/lib/supabase';
import { DeductedBatch } from '@/components/warehouse/barcode/BarcodeValidation';

/**
 * Interface for batch update parameters in transaction
 */
export interface BatchUpdate {
  batch_item_id: string;
  quantity_deducted: number;
}

/**
 * Complete a stock out transaction using the Supabase RPC function
 * This ensures all updates happen atomically in a single transaction
 * 
 * @param stockOutId - ID of the stock out request
 * @param processedBy - ID of the user processing the stock out
 * @param deductedBatches - Array of batches that were deducted
 * @returns Result of the transaction
 */
export const completeStockOutTransaction = async (
  stockOutId: string,
  processedBy: string,
  deductedBatches: DeductedBatch[]
) => {
  // Convert deducted batches to the format expected by the RPC function
  const batchUpdates: BatchUpdate[] = deductedBatches.map(batch => ({
    batch_item_id: batch.batch_item_id,
    quantity_deducted: batch.quantity_deducted
  }));

  try {
    console.log('Starting stock out transaction', {
      stockOutId,
      processedBy,
      batchUpdatesCount: batchUpdates.length
    });

    // Call the RPC function to execute the transaction
    const { data, error } = await executeQuery('stock_out_transaction', async (supabase) => {
      return await supabase.rpc('complete_stock_out_transaction', {
        p_stock_out_id: stockOutId,
        p_processed_by: processedBy,
        p_batch_updates: batchUpdates
      });
    });

    if (error) {
      console.error('Transaction error:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }

    console.log('Stock out transaction completed successfully');
    return { success: true, data };
  } catch (error) {
    console.error('Error in stock out transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error in transaction'
    };
  }
};

/**
 * Fallback implementation for when the RPC function is not available
 * Processes each batch item update individually
 * 
 * @param stockOutId - ID of the stock out request
 * @param processedBy - ID of the user processing the stock out
 * @param deductedBatches - Array of batches that were deducted
 * @returns Result of the operation
 */
export const processStockOutFallback = async (
  stockOutId: string,
  processedBy: string,
  deductedBatches: DeductedBatch[]
) => {
  try {
    console.log('Starting fallback stock out processing', {
      stockOutId,
      processedBy,
      batchesCount: deductedBatches.length
    });

    // Process all deducted batches
    for (const batch of deductedBatches) {
      console.log(`Processing batch item: ${batch.batch_item_id}`, {
        batchNumber: batch.batch_number,
        quantityDeducted: batch.quantity_deducted
      });
      
      // Fetch current batch item quantity
      const { data: batchItem, error: fetchError } = await executeQuery('batch_items', async (supabase) => {
        return await supabase
          .from('batch_items')
          .select('quantity')
          .eq('id', batch.batch_item_id)
          .single();
      });
      
      if (fetchError) {
        console.error(`Failed to fetch batch item ${batch.batch_item_id}:`, fetchError);
        throw new Error(`Failed to fetch batch item: ${fetchError.message}`);
      }
      
      // Calculate remaining quantity
      const remainingQuantity = Math.max(0, (batchItem?.quantity || 0) - batch.quantity_deducted);
      console.log(`Updating batch item ${batch.batch_item_id} quantity: ${batchItem?.quantity} -> ${remainingQuantity}`);
      
      // Update batch item quantity
      const { error: batchError } = await executeQuery('batch_items', async (supabase) => {
        return await supabase
          .from('batch_items')
          .update({ quantity: remainingQuantity })
          .eq('id', batch.batch_item_id);
      });

      if (batchError) {
        console.error(`Failed to update batch item ${batch.batch_item_id}:`, batchError);
        throw new Error(`Failed to update batch item: ${batchError.message}`);
      }
    }

    // Update stock out request status
    console.log(`Updating stock out request ${stockOutId} status to completed`);
    const { error: stockOutError } = await executeQuery('stock_out', async (supabase) => {
      return await supabase
        .from('stock_out')
        .update({ 
          status: 'completed', 
          processed_by: processedBy,
          processed_at: new Date().toISOString(),
          remaining_quantity: 0
        })
        .eq('id', stockOutId);
    });

    if (stockOutError) {
      console.error(`Failed to update stock out request ${stockOutId}:`, stockOutError);
      throw new Error(`Failed to update stock out request: ${stockOutError.message}`);
    }

    // Record stock out history
    const { error: historyError } = await executeQuery('stock_out_history', async (supabase) => {
      return await supabase
        .from('stock_out_history')
        .insert({
          stock_out_id: stockOutId,
          processed_by: processedBy,
          processed_at: new Date().toISOString(),
          details: JSON.stringify(deductedBatches)
        });
    });

    if (historyError) {
      console.warn('Failed to record stock out history:', historyError);
      // Non-critical error, don't throw
    }

    console.log('Fallback stock out processing completed successfully');
    return { success: true, data: { message: 'Stock out processed successfully via fallback method' } };
  } catch (error) {
    console.error('Error in fallback stock out processing:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error in processing'
    };
  }
};
