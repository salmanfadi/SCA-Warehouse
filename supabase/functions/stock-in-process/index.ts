// @ts-nocheck
// Edge Function for processing stock-in requests
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.2.3';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Define valid status values
type StockInStatus = 'pending' | 'processing' | 'completed' | 'approved' | 'rejected' | 'failed';

interface Batch {
  warehouse_id: string;
  location_id: string;
  base_barcode?: string;
  box_count?: number;
  quantity_per_box?: number;
  boxCount?: number;
  quantityPerBox?: number;
  color?: string;
  size?: string;
}

interface StockInPayload {
  run_id: string;
  stock_in_id: string;
  user_id: string;
  product_id: string;
  batches: Batch[];
}

// Generate sequential barcodes based on base barcode and box number
function generateBarcode(baseBarcode: string | undefined, boxNumber: number): string {
  // If baseBarcode is not provided, generate a random one
  const base = baseBarcode || `BC${Math.floor(10000000 + Math.random() * 90000000)}`;
  const numericPart = base.replace(/\D/g, '');
  const boxSuffix = String(boxNumber).padStart(3, '0');
  return `${numericPart}${boxSuffix}`;
}

// Helper function to safely update stock_in status
async function safeUpdateStockIn(supabase: any, stockInId: string, updates: any) {
  try {
    // Create update data with only the fields that exist in the stock_in table
    const updateData = {
      status: updates.status,
      updated_at: new Date().toISOString()
    };

    // Add additional fields if they exist in the updates object
    if (updates.rejection_reason !== undefined) {
      updateData.rejection_reason = updates.rejection_reason;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    if (updates.number_of_boxes !== undefined) {
      updateData.number_of_boxes = updates.number_of_boxes;
    }

    const { data, error } = await supabase
      .from('stock_in')
      .update(updateData)
      .eq('id', stockInId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error in safeUpdateStockIn:', error);
    return { data: null, error };
  }
}

// Cleanup function to remove any partial data in case of failure
async function cleanupPartialData(
  supabase: any,
  stockInId: string,
  batchIds: string[],
  barcodes: string[]
) {
  console.log('Starting cleanup of partial data...');
  
  // Delete any created barcodes
  if (barcodes.length > 0) {
    console.log(`Deleting ${barcodes.length} barcodes...`);
    const { error: barcodeError } = await supabase
      .from('barcodes')
      .delete()
      .in('barcode', barcodes);
    
    if (barcodeError) {
      console.error('Error cleaning up barcodes:', barcodeError);
    }
  }

  // Delete batch_items directly using the batch operation IDs
  if (batchIds.length > 0) {
    console.log('Deleting batch items...');
    
    try {
      // Delete batch_items
      const { error: batchItemsError } = await supabase
        .from('batch_items')
        .delete()
        .in('batch_id', batchIds);
      
      if (batchItemsError) {
        console.error('Error cleaning up batch_items:', batchItemsError);
      }
    } catch (err) {
      console.error('Exception during batch_items cleanup:', err);
    }
  }
  
  // Delete processed_batches using stock_in_id
  try {
    console.log('Deleting processed batches for stock_in_id:', stockInId);
    const { error: processedBatchesError } = await supabase
      .from('processed_batches')
      .delete()
      .eq('stock_in_id', stockInId);
    
    if (processedBatchesError) {
      console.error('Error cleaning up processed_batches:', processedBatchesError);
    }
  } catch (err) {
    console.error('Exception during processed_batches cleanup:', err);
  }

  // Delete any inventory items
  if (batchIds.length > 0) {
    console.log(`Deleting inventory items for ${batchIds.length} batches...`);
    const { error: inventoryError } = await supabase
      .from('inventory')
      .delete()
      .in('batch_id', batchIds);
    
    if (inventoryError) {
      console.error('Error cleaning up inventory items:', inventoryError);
    }
  }

  // Delete batch_operations
  if (batchIds.length > 0) {
    console.log(`Deleting ${batchIds.length} batch operations...`);
    const { error: batchOpsError } = await supabase
      .from('batch_operations')
      .delete()
      .in('id', batchIds);
    
    if (batchOpsError) {
      console.error('Error cleaning up batch operations:', batchOpsError);
    }
  }

  // Reset stock_in status to pending so it can be processed again
  console.log('Setting stock_in status back to pending...');
  const { error: updateError } = await safeUpdateStockIn(supabase, stockInId, {
    status: 'pending',
    rejection_reason: 'Processing failed. Please try again.'
  });

  if (updateError) {
    console.error('Error resetting stock_in status:', updateError);
  }

  console.log('Cleanup completed.');
}

// Helper function to safely parse JSON
async function safeJsonParse(jsonString: string): Promise<any> {
  try {
    // First try direct parsing
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    try {
      // Some clients might double-encode the JSON
      return JSON.parse(JSON.parse(jsonString));
    } catch (nestedError) {
      console.error('Error with nested JSON parsing attempt:', nestedError);
      return null;
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Received request`);
  
  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      const error = 'Missing Supabase configuration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set';
      console.error(`[${requestId}] ${error}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error,
          requestId
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] Creating Supabase client`);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse the request body
    const requestBody = await req.text();
    const payload = await safeJsonParse(requestBody);
    
    if (!payload) {
      throw new Error('Invalid JSON payload');
    }

    const { stock_in_id, user_id, product_id, batches } = payload as StockInPayload;

    // Validate required fields
    if (!stock_in_id || !user_id || !product_id || !batches?.length) {
      throw new Error('Missing required fields in payload');
    }

    // Update stock_in status to processing
    await safeUpdateStockIn(supabase, stock_in_id, {
      status: 'processing'
    });

    const batchIds: string[] = [];
    const barcodes: string[] = [];
    const now = new Date().toISOString();

    try {
      // Process each batch
      for (const batch of batches) {
        // Calculate box count and quantity per box
        const boxCount = batch.boxCount || batch.box_count || 1;
        const quantityPerBox = batch.quantityPerBox || batch.quantity_per_box || 1;
        const baseBarcode = batch.base_barcode || `BC-${product_id.substring(0, 8)}-${Date.now()}`;
        
        // Create batch_operations record
        const { data: batchData, error: batchError } = await supabase
          .from('batch_operations')
          .insert({
            operation_type: 'stock_in',
            status: 'processing',
            created_by: user_id,
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single();

        if (batchError) throw batchError;
        if (!batchData?.id) throw new Error('Failed to create batch operations record');
        
        const batchId = batchData.id;
        batchIds.push(batchId);
        
        // Create processed_batches record with explicit ID
        const processedBatchData = {
          id: batchId,
          batch_number: String(baseBarcode || `BATCH-${Date.now()}`),
          product_id: product_id,
          quantity_processed: boxCount * quantityPerBox,
          processed_by: user_id,
          status: 'processing',
          total_boxes: boxCount,
          total_quantity: boxCount * quantityPerBox,
          warehouse_id: batch.warehouse_id,
          created_at: now,
          processed_at: now,
          location_id: batch.location_id || null,
          stock_in_id: stock_in_id,
          notes: `Processed ${boxCount} boxes with ${quantityPerBox} items each`,
          color: batch.color || null,
          size: batch.size || null,
          quantity_per_box: quantityPerBox
        };
        
        // Insert the processed_batches record
        const { error: processedBatchError } = await supabase
          .from('processed_batches')
          .insert(processedBatchData);
        
        if (processedBatchError) {
          console.error(`Error creating processed batch: ${processedBatchError.message}`);
          throw processedBatchError;
        }
        
        // Prepare arrays for batch inserts
        const batchItems = [];
        const inventoryItems = [];
        const barcodeItems = [];
        
        // Process each box in the batch
        for (let i = 0; i < boxCount; i++) {
          const barcode = generateBarcode(baseBarcode, i + 1);
          barcodes.push(barcode);
          const boxNumber = i + 1;
          const boxId = crypto.randomUUID();
          
          // Create barcode record
          barcodeItems.push({
            barcode,
            product_id,
            batch_id: batchId,
            box_id: boxId,
            status: 'in_stock',
            created_by: user_id,
            quantity: quantityPerBox,
            warehouse_id: batch.warehouse_id,
            location_id: batch.location_id,
            created_at: now,
            updated_at: now
          });
          
          // Create inventory record
          inventoryItems.push({
            product_id,
            batch_id: batchId,
            quantity: quantityPerBox,
            total_quantity: quantityPerBox,
            reserved_quantity: 0,
            warehouse_id: batch.warehouse_id,
            location_id: batch.location_id,
            barcode, // Use barcode string directly
            status: 'in_stock',
            color: batch.color,
            size: batch.size,
            stock_in_id: stock_in_id,
            created_at: now,
            updated_at: now
          });
          
          // Add to batch items
          batchItems.push({
            id: boxId,
            batch_id: batchId,
            barcode,
            quantity: quantityPerBox,
            status: 'processed',
            color: batch.color,
            size: batch.size,
            warehouse_id: batch.warehouse_id,
            location_id: batch.location_id,
            created_at: now,
            updated_at: now
          });
        }
        
        // Insert all barcodes
        if (barcodeItems.length > 0) {
          const { error: barcodeError } = await supabase
            .from('barcodes')
            .insert(barcodeItems);
          
          if (barcodeError) {
            console.error(`Error creating barcodes: ${barcodeError.message}`);
            throw barcodeError;
          }
        }
        
        // Insert all batch items
        if (batchItems.length > 0) {
          const { error: batchItemError } = await supabase
            .from('batch_items')
            .insert(batchItems);
          
          if (batchItemError) {
            console.error(`Error creating batch items: ${batchItemError.message}`);
            throw batchItemError;
          }
        }
        
        // Insert all inventory items
        if (inventoryItems.length > 0) {
          const { error: inventoryError } = await supabase
            .from('inventory')
            .insert(inventoryItems);
          
          if (inventoryError) {
            console.error(`Error creating inventory items: ${inventoryError.message}`);
            throw inventoryError;
          }
        }
        
        // Update processed_batches status to completed
        const { error: updateProcessedBatchError } = await supabase
          .from('processed_batches')
          .update({
            status: 'completed',
            processed_at: now
          })
          .eq('id', batchId);
        
        if (updateProcessedBatchError) {
          console.error(`Error updating processed batch: ${updateProcessedBatchError.message}`);
          throw updateProcessedBatchError;
        }

        // Update batch_operations status to completed
        const { error: updateBatchError } = await supabase
          .from('batch_operations')
          .update({ 
            status: 'completed',
            updated_at: now
          })
          .eq('id', batchId);

        if (updateBatchError) {
          console.error(`Error updating batch operation: ${updateBatchError.message}`);
          throw updateBatchError;
        }
      }
      
      // Update stock_in status to completed
      await safeUpdateStockIn(supabase, stock_in_id, {
        status: 'completed',
        number_of_boxes: batches.reduce((sum, batch) => 
          sum + (batch.box_count || batch.boxCount || 1), 0)
      });

      // Prepare response with batch IDs for toast notifications
      const batchCount = batchIds.length;
      const toastMessage = batchCount > 1 
        ? `${batchCount} batches processed successfully` 
        : 'Batch processed successfully';

      return new Response(
        JSON.stringify({
          success: true,
          message: toastMessage,
          batch_ids: batchIds, // Return batch IDs for the frontend
          batch_count: batchCount,
          requestId
        }),
        { status: 200, headers: corsHeaders }
      );

    } catch (error) {
      console.error(`[${requestId}] Error processing stock-in:`, error);
      
      // Cleanup any partial data and reset to pending status
      await cleanupPartialData(supabase, stock_in_id, batchIds, barcodes);

      // Ensure the stock_in status is set to pending even if cleanupPartialData fails
      // This is critical to make sure failed stock-ins remain visible in the warehouse UI
      // under the "Awaiting Processing" filter
      try {
        await safeUpdateStockIn(supabase, stock_in_id, {
          status: 'pending', // Set back to pending so it appears in the warehouse UI
          rejection_reason: `Processing error: ${error instanceof Error ? error.message : String(error)}. Please try again.`
        });
      } catch (updateError) {
        console.error(`[${requestId}] Failed to reset stock_in status:`, updateError);
        
        // Last resort attempt to ensure stock_in is visible
        try {
          // Direct update without helper function
          const { error: directUpdateError } = await supabase
            .from('stock_in')
            .update({
              status: 'pending',
              rejection_reason: 'Processing failed. Please try again.'
            })
            .eq('id', stock_in_id);
            
          if (directUpdateError) {
            console.error(`[${requestId}] Final attempt to reset status failed:`, directUpdateError);
          }
        } catch (finalError) {
          console.error(`[${requestId}] All status reset attempts failed:`, finalError);
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          requestId
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error(`[${requestId}] Unhandled error:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        requestId: requestId || 'unknown'
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
