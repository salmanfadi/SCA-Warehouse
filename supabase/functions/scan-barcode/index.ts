import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get request body
    const requestData = await req.json();
    const { barcode, user_id, role } = requestData;
    
    if (!barcode) {
      return new Response(
        JSON.stringify({ 
          status: 'error', 
          error: 'Barcode is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing barcode scan: ${barcode} by user ${user_id} with role ${role}`);

    // Try to find the inventory using our new database function
    const { data: inventoryItems, error: inventoryError } = await supabaseClient.rpc(
      'find_inventory_by_barcode',
      { search_barcode: barcode }
    );

    if (inventoryError) {
      console.error('Error finding inventory by barcode:', inventoryError);
      throw new Error(`Database error: ${inventoryError.message}`);
    }

    // If we found the item directly, format and return it
    if (inventoryItems && inventoryItems.length > 0) {
      const item = inventoryItems[0];
      
      // Log the scan for tracking
      await supabaseClient.from('barcode_logs').insert({
        barcode: barcode,
        user_id: user_id || 'anonymous',
        action: 'edge-function-lookup',
        event_type: 'scan',
        details: { 
          inventory_id: item.inventory_id,
          product_name: item.product_name,
          location: `${item.warehouse_name} - Floor ${item.floor} - Zone ${item.zone}`
        }
      });
      
      // Return formatted response
      return new Response(
        JSON.stringify({
          status: 'success',
          data: {
            box_id: item.barcode,
            product: {
              id: item.inventory_id,
              name: item.product_name,
              sku: item.product_sku || '',
              description: item.product_sku ? `Product SKU: ${item.product_sku}` : undefined
            },
            box_quantity: item.quantity,
            total_product_quantity: item.quantity,
            location: {
              warehouse: item.warehouse_name,
              zone: item.zone,
              position: `Floor ${item.floor}`
            },
            status: item.status || 'available',
            attributes: {
              color: item.color,
              size: item.size,
              batch_id: item.batch_id
            },
            history: [
              {
                action: 'Scan',
                timestamp: new Date().toLocaleString()
              }
            ]
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // If not in inventory, look for it in stock_in_details
    const { data: stockInData, error: stockInError } = await supabaseClient
      .from('stock_in_details')
      .select(`
        id, 
        barcode,
        quantity,
        color,
        size,
        warehouse_id,
        location_id,
        stock_in_id,
        stock_in:stock_in_id(
          id,
          product_id, 
          products:product_id(id, name, sku, description)
        ),
        warehouses:warehouse_id(id, name, location),
        warehouse_locations:location_id(id, floor, zone)
      `)
      .eq('barcode', barcode)
      .limit(1);

    if (stockInError) {
      console.error('Error finding barcode in stock_in_details:', stockInError);
      throw new Error(`Database error: ${stockInError.message}`);
    }

    if (stockInData && stockInData.length > 0) {
      const item = stockInData[0];
      
      // Log the scan
      await supabaseClient.from('barcode_logs').insert({
        barcode: barcode,
        user_id: user_id || 'anonymous',
        action: 'stock-in-details-lookup',
        event_type: 'scan',
        batch_id: item.id,
        details: {
          stock_in_id: item.stock_in_id,
          product_name: item.stock_in?.product?.name || 'Unknown Product',
          location: `${item.warehouse?.name || 'Unknown'} - Floor ${item.location?.floor || '?'} - Zone ${item.location?.zone || '?'}`
        }
      });

      return new Response(
        JSON.stringify({
          status: 'success',
          data: {
            box_id: item.barcode,
            product: {
              id: item.stock_in?.product_id || '',
              name: item.stock_in?.product?.name || 'Unknown Product',
              sku: item.stock_in?.product?.sku || '',
              description: item.stock_in?.product?.description || undefined
            },
            box_quantity: item.quantity,
            location: {
              warehouse: item.warehouse?.name || 'Unknown Warehouse',
              zone: item.location?.zone || 'Unknown Zone',
              position: `Floor ${item.location?.floor || '?'}`
            },
            status: 'in-transit', // It's in stock_in_details but not in inventory yet
            attributes: {
              color: item.color,
              size: item.size,
              batch_id: item.id
            },
            history: [
              {
                action: 'Stock In Processing',
                timestamp: new Date().toLocaleString()
              }
            ]
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // If we get here, the barcode was not found
    // We'll return a "not found" response but still log the attempted scan
    await supabaseClient.from('barcode_logs').insert({
      barcode: barcode,
      user_id: user_id || 'anonymous',
      action: 'not-found',
      event_type: 'scan',
      details: { error: 'Barcode not found in any table' }
    });

    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'Barcode not found in inventory or processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );

  } catch (error) {
    console.error('Error processing barcode:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message || 'An unexpected error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
