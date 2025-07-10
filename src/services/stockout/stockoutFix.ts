/**
 * This file contains fixes for the stock out process to ensure proper deduction from batch_items
 * and visibility in the barcode_batch_view.
 */

import { supabase } from '../../lib/supabase';

/**
 * Fixes the batch item deduction issue by directly using barcode to fetch batch_item_id
 * from barcode_batch_view and deduct from batch_items, processed_batches, and inventory tables
 * @param barcodeId - The barcode ID to use for deduction (can be string or object with barcode property)
 * @param quantityToDeduct - The quantity to deduct
 * @param productId - Optional product ID for validation
 * @returns A promise that resolves with true if deduction was successful, false otherwise
 */
export async function fixBatchItemDeduction(
  barcodeId: string | { barcode: string; quantity?: number },
  quantityToDeduct: number,
  productId?: string
): Promise<boolean> {
  try {
    // Extract the actual barcode string and quantity if an object was passed
    const actualBarcodeId = typeof barcodeId === 'string' ? barcodeId : barcodeId.barcode;
    const specificQuantity = typeof barcodeId === 'string' ? quantityToDeduct : (barcodeId.quantity || quantityToDeduct);
    
    console.log(`Looking for batch item with barcode ID ${actualBarcodeId} to deduct ${specificQuantity}`);
    
    // Find the batch item through barcode_batch_view to get the batch_item_id
    const barcodeViewResult = await supabase
      .from('barcode_batch_view' as any)
      .select('*')
      .eq('barcode', actualBarcodeId); // Using barcode column, not barcode_id
    
    const barcodeItems = barcodeViewResult.data as any[] || [];
    const barcodeError = barcodeViewResult.error;
    
    if (barcodeError) {
      console.error(`Error finding batch item for barcode ${actualBarcodeId}:`, barcodeError);
      return false;
    }
    
    if (barcodeItems.length === 0) {
      console.error(`No batch items found for barcode ${actualBarcodeId}`);
      return false;
    }
    
    console.log(`Found ${barcodeItems.length} batch items for barcode ${actualBarcodeId}`);
    
    // Get the first matching batch item
    const barcodeItem = barcodeItems[0];
    const batchItemId = barcodeItem.batch_item_id;
    const batchId = barcodeItem.batch_id; // Get batch_id for processed_batches update
    
    // Validate product ID if provided
    if (productId && barcodeItem.product_id !== productId) {
      console.error(`Product ID mismatch: expected ${productId}, found ${barcodeItem.product_id} for barcode ${actualBarcodeId}`);
      return false;
    }
    
    if (!batchItemId) {
      console.error(`No batch_item_id found for barcode ${actualBarcodeId}`);
      return false;
    }
    
    // Now get the actual batch item to check its quantity
    const batchItemResult = await supabase
      .from('batch_items' as any)
      .select('*')
      .eq('id', batchItemId)
      .single();
    
    const batchItem = batchItemResult.data as any;
    const batchItemError = batchItemResult.error;
    
    if (batchItemError || !batchItem) {
      console.error(`Error fetching batch item ${batchItemId}:`, batchItemError);
      return false;
    }
    
    const currentQuantity = batchItem.quantity || 0;
    
    if (currentQuantity < specificQuantity) {
      console.error(`Insufficient quantity in batch item ${batchItemId}. Available: ${currentQuantity}, Requested: ${specificQuantity}`);
      return false;
    }
    
    const newQuantity = currentQuantity - specificQuantity;
    
    console.log(`Updating batch item ${batchItemId} quantity from ${currentQuantity} to ${newQuantity} (deducting ${specificQuantity})`);
    
    // Update the batch item quantity directly
    const updateResult = await supabase
      .from('batch_items' as any)
      .update({ 
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchItemId);
    
    const updateError = updateResult.error;
    
    if (updateError) {
      console.error(`Error updating batch item ${batchItemId}:`, updateError);
      return false;
    }
    
    // Also update processed_batches if batch_id is available
    if (batchId) {
      console.log(`Updating processed_batches for batch ${batchId}`);
      
      // Note: In processed_batches table, the batch ID is stored in the 'id' column, not 'batch_id'
      const processedBatchResult = await supabase
        .from('processed_batches' as any)
        .select('*')
        .eq('id', batchId)
        .single();
      
      const processedBatch = processedBatchResult.data as any;
      const processedBatchError = processedBatchResult.error;
      
      if (!processedBatchError && processedBatch) {
        // Update existing processed batch - DEDUCT quantity instead of adding
        const currentProcessedQuantity = processedBatch.quantity_processed || 0;
        // Ensure we don't go below zero
        const newProcessedQuantity = Math.max(0, currentProcessedQuantity - specificQuantity);
        
        const updateProcessedResult = await supabase
          .from('processed_batches' as any)
          .update({ 
            quantity_processed: newProcessedQuantity,
            processed_at: new Date().toISOString()
          })
          .eq('id', batchId);
        
        if (updateProcessedResult.error) {
          console.error(`Error updating processed batch ${batchId}:`, updateProcessedResult.error);
          // Continue anyway since the batch_items update was successful
        } else {
          console.log(`✅ Deducted ${specificQuantity} from processed batch ${batchId}, new quantity: ${newProcessedQuantity}`);
        }
      } else {
        // If the processed batch doesn't exist, we don't need to create a new one
        // This is a stock-out operation, so we're only deducting from existing batches
        console.log(`No processed batch found with ID ${batchId}, skipping processed_batches update`);
      }
    }
    // Update inventory table directly using the barcode
    try {
      console.log(`Updating inventory table for barcode ${actualBarcodeId}`);
      
      // First check if there's an existing inventory record for this barcode
      const inventoryResult = await supabase
        .from('inventory' as any)
        .select('*')
        .eq('barcode', actualBarcodeId) // Using barcode column, not barcode_id
        .single();
      
      const inventoryItem = inventoryResult.data as any;
      const inventoryError = inventoryResult.error;
      
      if (!inventoryError && inventoryItem) {
        // Update existing inventory record by barcode
        const currentInventoryQuantity = inventoryItem.quantity || 0;
        const newInventoryQuantity = Math.max(0, currentInventoryQuantity - specificQuantity);
        
        const updateInventoryResult = await supabase
          .from('inventory' as any)
          .update({ 
            quantity: newInventoryQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryItem.id);
        
        if (updateInventoryResult.error) {
          console.error(`Error updating inventory for barcode ${actualBarcodeId}:`, updateInventoryResult.error);
          // Continue anyway since the batch_items update was successful
        } else {
          console.log(`✅ Updated inventory for barcode ${actualBarcodeId} from ${currentInventoryQuantity} to ${newInventoryQuantity}`);
        }
      } else {
        // If no direct inventory record exists for this barcode, create one
        console.log(`No inventory record found for barcode ${actualBarcodeId}, creating one`);
        
        // We need the product_id from the barcode item
        if (barcodeItem.product_id) {
          const insertInventoryResult = await supabase
            .from('inventory' as any)
            .insert({
              barcode: actualBarcodeId, // Using barcode column, not barcode_id
              product_id: barcodeItem.product_id,
              quantity: 0, // Set to 0 since we're deducting
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertInventoryResult.error) {
            console.error(`Error creating inventory record for barcode ${actualBarcodeId}:`, insertInventoryResult.error);
          } else {
            console.log(`✅ Created new inventory record for barcode ${actualBarcodeId} with quantity 0`);
          }
        } else {
          console.error(`Cannot create inventory record: No product_id available for barcode ${actualBarcodeId}`);
        }
      }
    } catch (inventoryError) {
      console.error(`Error updating inventory for barcode ${actualBarcodeId}:`, inventoryError);
      // Continue anyway since the batch_items update was successful
    }
    
    console.log(`✅ Successfully deducted ${specificQuantity} from batch item ${batchItemId} for barcode ${actualBarcodeId}`);
    return true;
  } catch (error) {
    console.error(`Error in fixBatchItemDeduction for barcode ${typeof barcodeId === 'string' ? barcodeId : barcodeId.barcode}:`, error);
    return false;
  }
}

/**
 * Updates the stock out process to ensure proper batch item deduction
 * This function should be called after processing a stock out
 * @param stockOutId - The ID of the stock out
 * @returns A promise that resolves when the update is complete
 */
export async function updateStockOutWithProperDeduction(stockOutId: string): Promise<void> {
  try {
    console.log(`Updating stock out ${stockOutId} with proper batch item deduction`);
    
    // 1. Get the stock out details
    const { data: stockOutDetails, error: detailsError } = await supabase
      .from('stock_out_details')
      .select('*')
      .eq('stock_out_id', stockOutId);
    
    if (detailsError) {
      console.error(`Error fetching stock out details for ${stockOutId}:`, detailsError);
      return;
    }
    
    if (!stockOutDetails || stockOutDetails.length === 0) {
      console.warn(`No details found for stock out ${stockOutId}`);
      return;
    }
    
    // 2. Process each product in the stock out
    for (const detail of stockOutDetails) {
      const { product_id, quantity } = detail;
      
      if (!product_id || !quantity) {
        console.warn(`Invalid detail in stock out ${stockOutId}:`, detail);
        continue;
      }
      
      // 3. Fix the batch item deduction for this product
      const success = await fixBatchItemDeduction(product_id, quantity);
      
      if (success) {
        console.log(`Successfully fixed batch item deduction for product ${product_id} in stock out ${stockOutId}`);
      } else {
        console.error(`Failed to fix batch item deduction for product ${product_id} in stock out ${stockOutId}`);
      }
    }
    
    console.log(`Completed batch item deduction fixes for stock out ${stockOutId}`);
  } catch (error) {
    console.error(`Error in updateStockOutWithProperDeduction for ${stockOutId}:`, error);
  }
}
