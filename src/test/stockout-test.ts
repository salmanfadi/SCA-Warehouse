/**
 * Stock Out Completion Test Script
 * 
 * This script tests the stock out completion process with the new location tracking structure.
 * It simulates the creation of processed items and their insertion into the database.
 */
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { ProcessedItem, LocationInfo } from '../services/stockout/types';

/**
 * Test the stock out completion process
 */
async function testStockOutCompletion() {
  console.log('Starting stock out completion test...');

  // Create a sample location info object
  const locationInfo: LocationInfo = {
    warehouse_id: '123e4567-e89b-12d3-a456-426614174000',
    warehouse_name: 'Main Warehouse',
    location_id: '123e4567-e89b-12d3-a456-426614174001',
    location_name: 'Shelf A1',
    floor: '1',
    zone: 'A'
  };

  // Create a sample processed item
  const processedItem: ProcessedItem = {
    id: uuidv4(),
    stock_out_id: '123e4567-e89b-12d3-a456-426614174002',
    stock_out_detail_id: '123e4567-e89b-12d3-a456-426614174003',
    batch_item_id: '123e4567-e89b-12d3-a456-426614174004',
    product_id: '123e4567-e89b-12d3-a456-426614174005',
    barcode: 'TEST-BARCODE-001',
    batch_number: 'BATCH-001',
    product_name: 'Test Product',
    location_info: locationInfo,
    quantity: 5,
    processed_by: '123e4567-e89b-12d3-a456-426614174006',
    processed_at: new Date().toISOString()
  };

  console.log('Sample processed item:', processedItem);

  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction' as any);
    if (transactionError) {
      throw new Error(`Failed to start transaction: ${transactionError.message}`);
    }

    console.log('Transaction started successfully');

    // Insert the processed item
    const { error: insertError } = await (supabase
      .from('stock_out_processed_items' as any)
      .insert([{
        id: processedItem.id,
        stock_out_id: processedItem.stock_out_id,
        stock_out_detail_id: processedItem.stock_out_detail_id || null,
        batch_item_id: processedItem.batch_item_id,
        product_id: processedItem.product_id,
        barcode: processedItem.barcode,
        warehouse_id: processedItem.location_info.warehouse_id || null,
        location_id: processedItem.location_info.location_id || null,
        // Store the full location info as a JSON object in the notes field
        notes: JSON.stringify(processedItem.location_info),
        quantity: processedItem.quantity,
        processed_by: processedItem.processed_by,
        processed_at: processedItem.processed_at,
        created_at: new Date().toISOString()
      }]) as any);

    if (insertError) {
      // Rollback the transaction
      await supabase.rpc('rollback_transaction' as any);
      throw new Error(`Failed to insert processed item: ${insertError.message}`);
    }

    console.log('Processed item inserted successfully');

    // Commit the transaction
    const { error: commitError } = await supabase.rpc('commit_transaction' as any);
    if (commitError) {
      throw new Error(`Failed to commit transaction: ${commitError.message}`);
    }

    console.log('Transaction committed successfully');
    console.log('Stock out completion test passed!');
  } catch (error) {
    console.error('Error in stock out completion test:', error);
    // Ensure transaction is rolled back
    await supabase.rpc('rollback_transaction' as any).catch(console.error);
  }
}

// Run the test
testStockOutCompletion().catch(console.error);
