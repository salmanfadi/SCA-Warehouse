import { executeQuery } from '@/lib/supabase';
import { BatchItem } from '@/components/warehouse/barcode/BarcodeValidation';
import { toast } from '@/components/ui/use-toast';

/**
 * Fetches barcode data from the barcode_batch_view
 * @param barcode The barcode to look up
 * @returns The barcode data or null if not found
 */
export async function fetchBarcodeData(barcode: string): Promise<any> {
  try {
    // First try exact match
    const { data: exactData, error: exactError } = await executeQuery('barcode_batch_view', async (supabase) => {
      return await supabase
        .from('barcode_batch_view')
        .select('*')
        .eq('barcode', barcode.trim())
        .limit(1);
    });

    if (exactError) {
      console.error('Error executing query on barcode_batch_view:', exactError);
      throw exactError;
    }

    if (exactData && exactData.length > 0) {
      console.log('Found exact match for barcode:', barcode);
      return exactData[0];
    }

    // If no exact match, try case-insensitive match
    console.log('No exact match found, trying case-insensitive match');
    const { data: likeData, error: likeError } = await executeQuery('barcode_batch_view', async (supabase) => {
      return await supabase
        .from('barcode_batch_view')
        .select('*')
        .ilike('barcode', barcode.trim())
        .limit(1);
    });

    if (likeError) {
      console.error('Error executing case-insensitive query on barcode_batch_view:', likeError);
      throw likeError;
    }

    if (likeData && likeData.length > 0) {
      console.log('Found case-insensitive match for barcode:', barcode);
      return likeData[0];
    }

    console.log('No data returned from any query for barcode:', barcode);
    return null;
  } catch (error) {
    console.error('Failed to execute query on barcode_batch_view:', error);
    throw error;
  }
}

/**
 * Fetches barcode data from the barcodes table
 * @param barcode The barcode to look up
 * @returns The barcode data or null if not found
 */
export async function fetchBarcodeFromBarcodesTable(barcode: string): Promise<any> {
  try {
    const { data, error } = await executeQuery('barcodes', async (supabase) => {
      return await supabase
        .from('barcodes')
        .select('*')
        .eq('barcode', barcode.trim())
        .limit(1);
    });

    if (error) {
      console.error('Error executing query on barcodes table:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No data returned from barcodes table for barcode:', barcode);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to execute query on barcodes table:', error);
    throw error;
  }
}

/**
 * Fetches batch item data using the barcode_batch_view as primary source of truth
 * @param boxId The box ID to look up
 * @returns The batch item data or null if not found
 */
export async function fetchBatchItemData(boxId: string): Promise<any> {
  try {
    // First try to get data from the barcode_batch_view
    const { data: viewData, error: viewError } = await executeQuery('barcode_batch_view', async (supabase) => {
      return await supabase
        .from('barcode_batch_view')
        .select('*')
        .eq('batch_item_id', boxId)
        .limit(1);
    });

    if (viewError) {
      console.error('Error executing query on barcode_batch_view:', viewError);
      // Don't throw here, try the fallback method
    }

    if (viewData && viewData.length > 0) {
      console.log('Found batch item in barcode_batch_view:', boxId);
      return viewData[0];
    }

    // Fallback to batch_items table if not found in the view
    console.log('Batch item not found in barcode_batch_view, trying batch_items table');
    const { data, error } = await executeQuery('batch_items', async (supabase) => {
      return await supabase
        .from('batch_items')
        .select('*, warehouses(id, name)')
        .eq('id', boxId)
        .limit(1);
    });

    if (error) {
      console.error('Error executing query on batch_items table:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No data returned from batch_items table for box ID:', boxId);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to execute query on batch_items:', error);
    throw error;
  }
}

/**
 * Fetches product data from the products table
 * @param productId The product ID to look up
 * @returns The product data or null if not found
 */
export async function fetchProductData(productId: string): Promise<any> {
  try {
    const { data, error } = await executeQuery('products', async (supabase) => {
      return await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .limit(1);
    });

    if (error) {
      console.error('Error executing query on products table:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No data returned from products table for product ID:', productId);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to execute query on products table:', error);
    throw error;
  }
}

/**
 * Creates a BatchItem object from barcode_batch_view data
 * @param viewItem The data from barcode_batch_view
 * @param barcode The original barcode
 * @returns A BatchItem object
 */
export function createBatchItemFromViewData(viewItem: any, barcode: string): BatchItem {
  return {
    id: viewItem.batch_item_id || viewItem.box_id,
    batch_id: viewItem.batch_id,
    barcode_id: viewItem.barcode_id,
    product_id: viewItem.product_id,
    product_name: viewItem.product_name || 'Unknown Product',
    product_sku: viewItem.product_sku || '',
    product_description: viewItem.product_description,
    product_category: viewItem.product_category,
    quantity: Math.max(1, Number(viewItem.quantity) || 1),
    warehouse_id: viewItem.warehouse_id || null,
    location_id: viewItem.location_id || null,
    barcode: barcode.trim(),
    size: viewItem.size || null,
    color: viewItem.color || null,
    status: viewItem.status || 'available',
    batch_number: viewItem.batch_number,
    warehouse_name: viewItem.warehouse_name,
    location_name: viewItem.location_name
  };
}

/**
 * Creates a synthetic BatchItem for special barcode patterns
 * @param barcode The barcode
 * @param productData The product data
 * @returns A synthetic BatchItem
 */
export function createSyntheticBatchItem(barcode: string, productData: any): BatchItem {
  const uniqueId = `synthetic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    id: uniqueId,
    product_id: productData.id,
    product_name: productData.name || 'Unknown Product',
    product_sku: productData.sku || '',
    quantity: 1,
    barcode: barcode,
    status: 'available'
  };
}

/**
 * Decreases the quantity of a batch item in the database
 * @param batchItemId The batch item ID
 * @param quantityToDeduct The quantity to deduct
 */
export async function decreaseBatchItemQuantity(batchItemId: string, quantityToDeduct: number): Promise<void> {
  try {
    const { error } = await executeQuery('update_batch_item', async (supabase) => {
      return await supabase.rpc('decrease_batch_item_quantity', {
        p_batch_item_id: batchItemId,
        p_quantity: quantityToDeduct
      });
    });

    if (error) {
      console.error('Error decreasing batch item quantity:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update inventory: ${error.message}`
      });
      throw error;
    }
  } catch (error) {
    console.error('Failed to decrease batch item quantity:', error);
    throw error;
  }
}
