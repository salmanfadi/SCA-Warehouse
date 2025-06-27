/**
 * Stock Out Completion Test Script
 * 
 * This script tests the stock out completion process with the new location tracking structure
 * and validates that the foreign key constraints are properly handled.
 */
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define types
interface LocationInfo {
  warehouse_id: string | null;
  warehouse_name: string | null;
  location_id: string | null;
  location_name: string | null;
  floor: string | null;
  zone: string | null;
}

interface ProcessedItem {
  id: string;
  stock_out_id: string;
  stock_out_detail_id: string | null;
  batch_item_id: string;
  product_id: string;
  barcode: string;
  batch_number: string;
  product_name: string;
  location_info: LocationInfo;
  quantity: number;
  processed_by: string;
  processed_at: string;
}

/**
 * Main test function
 */
async function runTest() {
  console.log('Starting stock out completion test...');
  
  try {
    // 1. Get a valid stock_out record for testing
    const { data: stockOutData, error: stockOutError } = await supabase
      .from('stock_out')
      .select('id, status')
      .eq('status', 'pending')
      .limit(1)
      .single();
    
    if (stockOutError || !stockOutData) {
      console.error('Error fetching stock out record:', stockOutError?.message || 'No pending stock out found');
      return;
    }
    
    console.log('Found stock out record:', stockOutData);
    
    // 2. Get valid batch items to process
    const { data: batchItems, error: batchItemsError } = await supabase
      .from('batch_items')
      .select(`
        id, 
        product_id, 
        barcode, 
        batch_number, 
        quantity,
        products (name),
        locations (id, name),
        warehouses (id, name)
      `)
      .gt('quantity', 0)
      .limit(3);
    
    if (batchItemsError || !batchItems || batchItems.length === 0) {
      console.error('Error fetching batch items:', batchItemsError?.message || 'No batch items found');
      return;
    }
    
    console.log(`Found ${batchItems.length} batch items to process`);
    
    // 3. Create processed items with location info
    const userId = 'test-user';
    const processedItems: ProcessedItem[] = batchItems.map(item => {
      // Create location info object
      const locationInfo: LocationInfo = {
        warehouse_id: item.warehouses?.id || null,
        warehouse_name: item.warehouses?.name || null,
        location_id: item.locations?.id || null,
        location_name: item.locations?.name || null,
        floor: null,
        zone: null
      };
      
      return {
        id: uuidv4(),
        stock_out_id: stockOutData.id,
        stock_out_detail_id: null,
        batch_item_id: item.id,
        product_id: item.product_id,
        barcode: item.barcode,
        batch_number: item.batch_number,
        product_name: item.products?.name || 'Unknown Product',
        location_info: locationInfo,
        quantity: 1,
        processed_by: userId,
        processed_at: new Date().toISOString()
      };
    });
    
    console.log('Created processed items:', processedItems);
    
    // 4. Start a transaction
    const { error: startTxError } = await supabase.rpc('begin_transaction');
    if (startTxError) {
      console.error('Error starting transaction:', startTxError.message);
      return;
    }
    
    try {
      // 5. Validate warehouse and location IDs
      const warehouseIds = processedItems
        .map(item => item.location_info.warehouse_id)
        .filter(Boolean) as string[];
        
      const locationIds = processedItems
        .map(item => item.location_info.location_id)
        .filter(Boolean) as string[];
      
      const { data: validWarehouses } = await supabase
        .from('warehouses')
        .select('id')
        .in('id', warehouseIds);
        
      const { data: validLocations } = await supabase
        .from('locations')
        .select('id')
        .in('id', locationIds);
      
      // Create sets of valid IDs for quick lookup
      const validWarehouseIds = new Set(validWarehouses?.map(w => w.id) || []);
      const validLocationIds = new Set(validLocations?.map(l => l.id) || []);
      
      console.log('Valid warehouse IDs:', Array.from(validWarehouseIds));
      console.log('Valid location IDs:', Array.from(validLocationIds));
      
      // 6. Insert processed items with validated location IDs
      const { error: insertError } = await supabase
        .from('stock_out_processed_items')
        .insert(
          processedItems.map(item => {
            // Extract location info from the location_info object
            const locationInfo = item.location_info;
            
            // Check if warehouse_id and location_id are valid
            const warehouseId = locationInfo.warehouse_id && validWarehouseIds.has(locationInfo.warehouse_id) 
              ? locationInfo.warehouse_id 
              : null;
              
            const locationId = locationInfo.location_id && validLocationIds.has(locationInfo.location_id) 
              ? locationInfo.location_id 
              : null;
            
            return {
              id: item.id,
              stock_out_id: item.stock_out_id,
              stock_out_detail_id: item.stock_out_detail_id,
              batch_item_id: item.batch_item_id,
              product_id: item.product_id,
              barcode: item.barcode,
              warehouse_id: warehouseId,
              location_id: locationId,
              notes: JSON.stringify(locationInfo),
              quantity: item.quantity,
              processed_by: userId,
              processed_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            };
          })
        );
      
      if (insertError) {
        throw new Error(`Failed to insert processed items: ${insertError.message}`);
      }
      
      // 7. Update stock out status
      const { error: updateError } = await supabase
        .from('stock_out')
        .update({
          status: 'completed',
          processed_by: userId,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', stockOutData.id);
      
      if (updateError) {
        throw new Error(`Failed to update stock out status: ${updateError.message}`);
      }
      
      // 8. Update batch item quantities
      for (const item of processedItems) {
        const { error: batchUpdateError } = await supabase.rpc('update_batch_item_quantity', {
          p_batch_item_id: item.batch_item_id,
          p_quantity_change: -item.quantity // Negative to reduce quantity
        });
        
        if (batchUpdateError) {
          throw new Error(`Failed to update batch item quantity: ${batchUpdateError.message}`);
        }
      }
      
      // 9. Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }
      
      console.log('Stock out completion test successful!');
      console.log('Stock out ID:', stockOutData.id);
      console.log('Processed items:', processedItems.length);
      
      // 10. Verify the stock out status was updated
      const { data: verifyData } = await supabase
        .from('stock_out')
        .select('status, processed_at')
        .eq('id', stockOutData.id)
        .single();
        
      console.log('Verified stock out status:', verifyData);
      
    } catch (error) {
      // Rollback the transaction on error
      const { error: rollbackError } = await supabase.rpc('rollback_transaction');
      if (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError.message);
      }
      
      console.error('Test failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    
  } catch (error) {
    console.error('Test error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the test
runTest().catch(console.error);
