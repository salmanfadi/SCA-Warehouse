// Test script for stock out process
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testStockOutProcess() {
  console.log('Testing stock out process...');
  
  try {
    // 1. Test barcode lookup
    console.log('\n1. Testing barcode lookup...');
    const { data: barcodeData, error: barcodeError } = await supabase
      .from('barcode_batch_view')
      .select('*')
      .limit(1);
      
    if (barcodeError) {
      console.error('Error fetching barcode data:', barcodeError);
    } else {
      console.log('Barcode lookup successful:', barcodeData[0]);
      
      // 2. Test stock out progress calculation
      if (barcodeData[0]) {
        console.log('\n2. Testing stock out progress calculation...');
        
        // Get a stock out request
        const { data: stockOutData, error: stockOutError } = await supabase
          .from('stock_out_requests')
          .select('*, processed_items:stock_out_processed_items(quantity)')
          .limit(1);
          
        if (stockOutError) {
          console.error('Error fetching stock out request:', stockOutError);
        } else if (stockOutData[0]) {
          console.log('Stock out request:', stockOutData[0]);
          
          // Calculate progress
          const stockOutRequest = stockOutData[0];
          const requestedQuantity = stockOutRequest.quantity || 0;
          
          if (requestedQuantity <= 0) {
            console.log('Progress: 100% (no quantity requested)');
          } else {
            // Calculate from processed items
            const processedItems = stockOutRequest.processed_items || [];
            const totalProcessedQuantity = processedItems.reduce(
              (sum, item) => sum + (item.quantity || 0),
              0
            );
            
            const progress = Math.min(100, Math.round((totalProcessedQuantity / requestedQuantity) * 100));
            console.log(`Progress: ${progress}% (${totalProcessedQuantity}/${requestedQuantity})`);
          }
        }
      }
      
      // 3. Test batch item inventory update
      console.log('\n3. Testing batch item inventory update...');
      const { data: batchItems, error: batchError } = await supabase
        .from('batch_items')
        .select('*')
        .eq('product_id', barcodeData[0].product_id)
        .gt('quantity', 0)
        .limit(5);
        
      if (batchError) {
        console.error('Error fetching batch items:', batchError);
      } else {
        console.log(`Found ${batchItems.length} batch items for product ${barcodeData[0].product_id}`);
        console.log('First batch item:', batchItems[0]);
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testStockOutProcess().catch(console.error);
