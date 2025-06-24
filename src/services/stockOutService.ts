import { executeQuery } from '@/lib/supabase';
import { DeductedBatch } from '@/components/warehouse/barcode/BarcodeValidation';

/**
 * Process a stock out request by updating its status and processing all deducted batches
 * @param stockOutRequestId The ID of the stock out request
 * @param deductedBatches Array of deducted batches
 * @param userId The ID of the user processing the request
 * @returns Result of the operation
 */
export const approveStockOut = async (
  stockOutRequestId: string,
  deductedBatches: DeductedBatch[],
  userId: string
) => {
  return await executeQuery('approve-stock-out', async (supabase) => {
    // We'll implement application-level transaction handling
    // by validating everything first, then performing updates
    try {
      console.log('Starting stock out approval process');
      
      // Verify stock out request exists
      const { data: existingRequest, error: fetchError } = await supabase
        .from('stock_out')
        .select('id, status')
        .eq('id', stockOutRequestId)
        .single();
        
      // Get product information from stock_out_progress_view
      // Using .eq() without .single() since there might be multiple products in a request
      const { data: stockOutProducts, error: productError } = await supabase
        .from('stock_out_progress_view')
        .select('product_id, product_name, requested_quantity')
        .eq('stock_out_id', stockOutRequestId);
      
      if (productError || !stockOutProducts || stockOutProducts.length === 0) {
        throw new Error(productError?.message || 'Stock out product information not found');
      }
      
      // For now, we'll use the first product in the list
      // In a multi-product stock out, we would need to handle each product separately
      const stockOutProduct = stockOutProducts[0];
        
      if (fetchError || !existingRequest) {
        throw new Error(fetchError?.message || 'Stock out request not found');
      }
      
      // Process each deducted batch first to validate all operations will succeed
      const batchUpdates = [];
      const detailRecords = [];
      const processedItemsRecords = [];  // Records for the stock_out_processed_items table
      
      // Validate total deducted quantity against requested quantity
      const totalDeducted = deductedBatches.reduce(
        (sum, batch) => sum + (batch.quantity_deducted || 0), 
        0
      );
      
      if (totalDeducted < stockOutProduct.requested_quantity) {
        throw new Error(`Insufficient quantity: Deducted ${totalDeducted}, but stock out requires at least ${stockOutProduct.requested_quantity} units`);
      }
      
      // First pass: validate all batches and collect updates to be made
      for (const batch of deductedBatches) {
        // Skip batches with undefined/null barcode
        if (!batch.barcode) {
          console.warn('Skipping batch with undefined barcode:', batch);
          continue;
        }
        
        const barcode = batch.barcode;
        const quantityDeducted = batch.quantity_deducted || 0;
        
        // Get batch item details from the barcode_batch_view which has complete product information
        let batchItem;
        const { data: barcodeData, error: barcodeError } = await supabase
          .from('barcode_batch_view')
          .select('*')
          .eq('barcode', barcode)
          .single();
          
        if (barcodeError || !barcodeData) {
          console.error(`Error looking up barcode ${barcode} in barcode_batch_view:`, barcodeError);
          throw new Error(`Item with barcode ${barcode} not found: ${barcodeError?.message || 'No data'}`);
        }
        
        console.log(`Successfully found barcode ${barcode} in barcode_batch_view:`, barcodeData);
        
        // Use the barcode batch view data
        batchItem = {
          ...barcodeData,
          id: barcodeData.batch_item_id, // Map batch_item_id to id for consistency
          batch_item_id: barcodeData.batch_item_id, // Ensure we have batch_item_id for consistency
          product_id: barcodeData.product_id // Ensure we have product_id from the view
        };
        
        // Validate quantity
        if (quantityDeducted <= 0) {
          throw new Error(`Invalid quantity ${quantityDeducted} for barcode ${barcode}`);
        }
        
        const currentQuantity = batchItem.quantity || 0;
        
        // Check if we have enough quantity
        if (currentQuantity < quantityDeducted) {
          throw new Error(`Insufficient quantity for barcode ${barcode}. Available: ${currentQuantity}, Requested: ${quantityDeducted}`);
        }
        
        // Calculate new quantity
        const newQuantity = currentQuantity - quantityDeducted;
        
        console.log(`Will update batch item ${batchItem.batch_item_id} quantity from ${currentQuantity} to ${newQuantity}`);
        
        // Store the update to be performed
        batchUpdates.push({
          id: batchItem.batch_item_id, // Use the batch_item_id from the view
          batchId: batchItem.batch_item_id, // Keep for backward compatibility
          currentQuantity,
          newQuantity,
          quantityDeducted: quantityDeducted
        });
        
        // Always validate product matches any product in the request
        // We trust the product_id from barcode_batch_view even if batch_items has null product_id
        const isValidProduct = stockOutProducts.some(product => 
          product.product_id === batchItem.product_id
        );
        
        if (!isValidProduct) {
          throw new Error(`Product mismatch: Barcode ${barcode} contains product ${batchItem.product_id || 'unknown'}, but this product is not part of the stock out request`);
        }
        
        // Find the matching product from the stockOutProducts array
        const matchingProduct = stockOutProducts.find(product => product.product_id === batchItem.product_id);
        
        if (!matchingProduct) {
          throw new Error(`Could not find matching product in stock out request for product ID ${batchItem.product_id}`);
        }
        
        // Prepare stock out detail record
        detailRecords.push({
          stock_out_id: stockOutRequestId,
          stock_out_request_id: stockOutRequestId,
          product_id: matchingProduct.product_id,  // Use the matched product_id
          quantity: quantityDeducted,
          processed_quantity: quantityDeducted,
          barcode: batch.barcode,
          processed_by: userId,
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Generate a detail ID for reference
        const detailId = crypto.randomUUID();
        
        // Update the detail record with the generated ID
        detailRecords[detailRecords.length - 1].id = detailId;
        
        // Track each box used in the stock_out_processed_items table
        // Only include fields that are actually in the table schema to avoid permission issues
        processedItemsRecords.push({
          id: crypto.randomUUID(),
          stock_out_id: stockOutRequestId,
          batch_item_id: batchItem.batch_item_id,
          product_id: matchingProduct.product_id,  // Use the matched product_id
          barcode: batch.barcode,
          quantity: quantityDeducted,
          processed_by: userId,
          processed_at: new Date().toISOString()
        });
      }
      
      // If we got here, all validations passed, now perform the actual updates
      
      // Update stock out request status
      const { error: updateError } = await supabase
        .from('stock_out')
        .update({
          status: 'completed',
          processed_by: userId,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', stockOutRequestId);
        
      if (updateError) {
        throw new Error(`Failed to update stock out request: ${updateError.message}`);
      }
      
      // Get the reference number from the stock out request
      const { data: stockOutData, error: stockOutError } = await supabase
        .from('stock_out')
        .select('reference_number')
        .eq('id', stockOutRequestId)
        .single();
        
      if (!stockOutError && stockOutData?.reference_number) {
        // Update any related customer inquiries to completed status
        const { error: inquiryError } = await supabase
          .from('customer_inquiries')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('reference_number', stockOutData.reference_number);
          
        if (inquiryError) {
          console.warn(`Failed to update customer inquiry status: ${inquiryError.message}`);
        } else {
          console.log(`Successfully updated customer inquiries with reference number ${stockOutData.reference_number} to completed status`);
        }
      }
      
      // Batch table updates
      for (const update of batchUpdates) {
        const { error: updateError } = await supabase
          .from('batch_items')
          .update({
            quantity: update.newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id); // Use the id field we set earlier
          
        if (updateError) {
          throw new Error(`Failed to update batch item ${update.id}: ${updateError.message}`);
        }
      }
      
      // Insert all stock out detail records
      if (detailRecords.length > 0) {
        const { error: detailError } = await supabase
          .from('stock_out_details')
          .insert(detailRecords);
          
        if (detailError) {
          console.error('Detail error:', detailError);
          throw new Error(`Failed to create stock out details: ${detailError.message}`);
        }
      }
      
      // Insert all stock out processed items records to track which boxes were used
      if (processedItemsRecords.length > 0) {
        console.log('Inserting stock out processed items records:', processedItemsRecords.length);
        const { error: processedItemsError } = await supabase
          .from('stock_out_processed_items')
          .insert(processedItemsRecords);
          
        if (processedItemsError) {
          console.error('Processed items error:', processedItemsError);
          throw new Error(`Failed to create stock out processed items: ${processedItemsError.message}`);
        }
      }
      
      // If we got here, everything succeeded
      console.log('Stock out process completed successfully');
      
      // Invalidate stock out cache if needed
      
      return { 
        success: true, 
        message: `Successfully processed ${batchUpdates.length} batches for product ${stockOutProduct.product_name}`,
        processedBatches: batchUpdates.map(update => update.batchId)
      };
    } catch (error) {
      // If any error occurred, no changes will be committed due to executeQuery's error handling
      console.error('Error in stock out process:', error);
      
      return { 
        error: { 
          message: error.message || 'Failed to process stock out request', 
        }
      };
    }
  });
};

/**
 * Process a stock out transaction for a single batch item
 * @param batchItemId The ID of the batch item
 * @param quantity The quantity to deduct
 * @param userId The ID of the user processing the stock out
 * @param requestProductId Optional product ID from the stock out request
 * @param productName Optional product name for display
 * @param batchNumber Optional batch number for display
 * @returns Result of the operation
 */
export const processStockOut = async (
  batchItemId: string,
  quantity: number,
  userId: string,
  requestProductId?: string,
  productName?: string,
  batchNumber?: string
) => {
  return await executeQuery('process-stock-out', async (supabase) => {
    console.log('Processing stock out for batch item:', batchItemId);
    
    try {
      // First, get the batch item details
      const { data: batchItemData, error: batchItemError } = await supabase
        .from('batch_items')
        .select('barcode, product_id, quantity')
        .eq('id', batchItemId)
        .single();
      
      if (batchItemError) {
        console.error('Error fetching batch item details:', batchItemError);
        return { error: batchItemError };
      }
      
      // Check available quantity
      const availableQuantity = batchItemData?.quantity || 0;
      if (availableQuantity < quantity) {
        const errorMsg = `Insufficient quantity. Available: ${availableQuantity}, Requested: ${quantity}`;
        console.error(errorMsg);
        return { error: new Error(errorMsg) };
      }
      
      // Check if product_id is null and handle it
      let productId = batchItemData?.product_id;
      
      // If batch item has no product_id but we have a product_id from the stock out request, use that
      if (!productId && requestProductId) {
        console.log('Using product_id from stock out request:', requestProductId);
        productId = requestProductId;
        
        // Update the batch item with the product_id from the request
        const { error: updateError } = await supabase
          .from('batch_items')
          .update({ 
            product_id: requestProductId,
            updated_at: new Date().toISOString()
          })
          .eq('id', batchItemId);
          
        if (updateError) {
          console.error('Error updating batch item with product_id:', updateError);
          return { error: updateError };
        }
      } else if (!productId) {
        console.error('Batch item has no product_id, which is required for stock_out_details');
        return { error: new Error('Batch item has no associated product. Cannot process stock out.') };
      }
      
      // Create a new stock_out record
      const { data: stockOutData, error: stockOutError } = await supabase
        .from('stock_out')
        .insert({
          requested_by: userId,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          processed_by: userId,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (stockOutError) {
        console.error('Error creating stock_out record:', stockOutError);
      }
      
      // Calculate new quantity
      const newQuantity = availableQuantity - quantity;
      
      // Update batch item quantity
      const { error: updateError } = await supabase
        .from('batch_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchItemId);
      
      if (updateError) {
        console.error('Error updating batch item quantity:', updateError);
        return { error: updateError };
      }
      
      console.log('Successfully processed stock out for batch item:', batchItemId);
      return { data: { batchItemId, newQuantity }, error: null };
    } catch (error) {
      console.error('Error in processStockOut:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error in processStockOut' 
        } 
      };
    }
  });
};
