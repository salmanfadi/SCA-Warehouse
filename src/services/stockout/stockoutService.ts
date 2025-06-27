/**
 * Stockout Service
 * Handles all stockout-related logic including barcode validation, quantity calculations,
 * and database interactions.
 */
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { 
  BatchItem, 
  StockOutRequest, 
  ProcessedItem, 
  BarcodeValidationResult,
  BarcodeInfo
} from './types';

/**
 * Helper function to get the current quantity for a specific location
 * @param productId - The product ID
 * @param warehouseId - The warehouse ID
 * @param locationId - The location ID
 * @returns The current quantity or 0 if not found
 */
const getLocationQuantity = async (
  productId: string,
  warehouseId: string,
  locationId: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('inventory_locations' as any)
      .select('quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .eq('location_id', locationId)
      .single() as { data: {quantity: number}, error: any };
      
    if (error || !data) {
      return 0;
    }
    
    return data.quantity || 0;
  } catch (err) {
    console.warn('Error getting location quantity:', err);
    return 0;
  }
};

/**
 * Validates a barcode for stock out processing
 * @param barcode - The scanned barcode or batch item object
 * @param stockOutId - The ID of the current stock out request or the stock out request object
 * @param scannedBarcodes - Optional set of already scanned barcodes
 * @returns A validation result object with status and batch item details
 */
export const validateBarcodeForStockOut = async (
  barcodeOrBatchItem: string | BatchItem | null,
  stockOutIdOrRequest: string | any,
  scannedBarcodes?: Set<string>
): Promise<BarcodeValidationResult> => {
  try {
    // Handle different parameter types
    let batchItem: BatchItem | null = null;
    let stockOutId: string = '';
    let barcode: string = '';
    
    // Determine if first parameter is a barcode string or a batch item
    if (typeof barcodeOrBatchItem === 'string') {
      barcode = barcodeOrBatchItem;
      console.log(`Validating barcode ${barcode} for stock out ${typeof stockOutIdOrRequest === 'string' ? stockOutIdOrRequest : 'object'}`);
      batchItem = await fetchBatchItemByBarcode(barcode);
    } else {
      batchItem = barcodeOrBatchItem;
      barcode = batchItem?.barcode || '';
      console.log(`Validating batch item with barcode ${barcode} for stock out`);
    }
    
    // Determine if second parameter is a stock out ID or a stock out request object
    if (typeof stockOutIdOrRequest === 'string') {
      stockOutId = stockOutIdOrRequest;
    } else {
      stockOutId = stockOutIdOrRequest?.id || '';
    }
    
    if (!batchItem) {
      return {
        isValid: false,
        errorMessage: 'Barcode not found in any batch items',
        batchItem: null
      };
    }
    
    // We no longer check if the barcode has already been scanned
    // This allows the same barcode to be scanned multiple times
    // as long as there is sufficient quantity available
    
    // Get stock out request data - either from the passed object or fetch from DB
    let stockOutRequest: any;
    
    if (typeof stockOutIdOrRequest === 'string') {
      // Fetch the stock out request to check product match
      const { data, error: stockOutError } = await supabase
        .from('stock_out' as any) // Correct table name from database schema
        .select(`
          id,
          product_id,
          quantity,
          remaining_quantity,
          stock_out_details:stock_out_details(*)
        `)
        .eq('id', stockOutId)
        .single() as { data: any, error: any };
        
      if (stockOutError || !data) {
        return {
          isValid: false,
          errorMessage: 'Stock out request not found',
          batchItem: null
        };
      }
      
      stockOutRequest = data;
    } else {
      // Use the provided stock out request object
      stockOutRequest = stockOutIdOrRequest;
      
      if (!stockOutRequest || !stockOutRequest.product_id) {
        return {
          isValid: false,
          errorMessage: 'Invalid stock out request data',
          batchItem: null
        };
      }
    }
    
    // Check if the product matches
    if (batchItem.product_id !== stockOutRequest.product_id) {
      console.warn(`Product mismatch: Batch item product ${batchItem.product_id} does not match stock out request product ${stockOutRequest.product_id}`);
      return {
        isValid: false,
        errorMessage: 'Product does not match the stock out request',
        batchItem: null
      };
    }
    
    // Check if the batch item has sufficient quantity
    if (batchItem.quantity <= 0) {
      return {
        isValid: false,
        errorMessage: 'Batch item has no available quantity',
        batchItem: null
      };
    }
    
    // Check if this batch item has already been processed for this stock out
    const { data: existingProcessed, error: existingError } = await supabase
      .from('stock_out_processed_items' as any)
      .select('quantity')
      .eq('stock_out_id', stockOutId)
      .eq('batch_item_id', batchItem.id) as { data: any[], error: any };
      
    if (existingError) {
      console.warn('Error checking existing processed items:', existingError);
    }
    
    const alreadyProcessedQuantity = existingProcessed?.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0), 
      0
    ) || 0;
    
    if (alreadyProcessedQuantity >= batchItem.quantity) {
      return {
        isValid: false,
        errorMessage: 'This batch item has already been fully processed for this stock out',
        batchItem: null
      };
    }
    
    // Calculate the maximum quantity that can be deducted
    const maxDeductible = await calculateMaxDeductibleQuantity(batchItem, stockOutRequest);
    
    if (maxDeductible <= 0) {
      return {
        isValid: false,
        errorMessage: 'No more quantity needed for this stock out',
        batchItem: null
      };
    }
    
    // All checks passed, return the valid result
    return {
      isValid: true,
      errorMessage: 'Barcode is valid for this stock out',
      batchItem,
      maxDeductibleQuantity: maxDeductible,
      alreadyProcessedQuantity
    };
  } catch (error) {
    console.error('Error validating barcode:', error);
    return {
      isValid: false,
      errorMessage: `Error validating barcode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      batchItem: null
    };
  }
  
  // Helper function to log validation details
  function logValidationDetails(batchItem: BatchItem | null, stockOutRequest: any) {
    if (!batchItem || !stockOutRequest) return;
    
    console.log('Validation details:');
    console.log(`- Batch item ID: ${batchItem.id}`);
    console.log(`- Batch item product: ${batchItem.product_id} (${batchItem.product_name})`);
    console.log(`- Batch item quantity: ${batchItem.quantity}`);
    console.log(`- Stock out request ID: ${stockOutRequest.id}`);
    console.log(`- Stock out request product: ${stockOutRequest.product_id}`);
    console.log(`- Stock out request quantity: ${stockOutRequest.quantity}`);
    console.log(`- Stock out request remaining: ${stockOutRequest.remaining_quantity || stockOutRequest.quantity}`);
  }
};

/**
 * Fetches a batch item by barcode
 * @param barcode - The barcode to search for
 * @returns The batch item or null if not found
 */
export const fetchBatchItemByBarcode = async (
  barcode: string
): Promise<BatchItem | null> => {
  try {
    // Validate and clean the barcode to prevent API errors
    if (!barcode || typeof barcode !== 'string') {
      console.error('Invalid barcode provided to fetchBatchItemByBarcode:', barcode);
      return null;
    }
    
    // Trim the barcode and ensure it's in a valid format
    const cleanedBarcode = barcode.trim();
    console.log(`Fetching batch item with barcode: ${cleanedBarcode} from barcode_batch_view`);
    
    // Try to find the batch item with the exact barcode using barcode_batch_view
    const { data, error } = await supabase
      .from('barcode_batch_view' as any)
      .select(`
        batch_item_id,
        barcode_id,
        barcode,
        product_id,
        product_name,
        product_sku,
        product_description,
        quantity,
        batch_number,
        warehouse_id,
        location_id,
        color,
        size,
        status,
        created_at,
        updated_at,
        batch_id
      `)
      .eq('barcode', cleanedBarcode)
      .single() as { data: any, error: any };
      
    let batchItemData: any = null;
    
    if (!error && data) {
      batchItemData = data;
      console.log('Found batch item with exact barcode match:', batchItemData);
    } else {
      console.warn(`Error fetching batch item with barcode ${cleanedBarcode}:`, error);
      
      // If not found with exact match, try with LIKE query as fallback
      // This can help with barcode scanner issues that might add/remove characters
      const { data: likeData, error: likeError } = await supabase
        .from('barcode_batch_view' as any)
        .select(`
          batch_item_id,
          barcode_id,
          barcode,
          product_id,
          product_name,
          product_sku,
          product_description,
          quantity,
          batch_number,
          warehouse_id,
          location_id,
          color,
          size,
          status,
          created_at,
          updated_at,
          batch_id
        `)
        .ilike('barcode', `%${cleanedBarcode}%`)
        .limit(1) as { data: any[], error: any };
        
      if (!likeError && likeData && likeData.length > 0) {
        console.log('Found batch item with similar barcode:', likeData[0]);
        batchItemData = likeData[0];
      } else {
        console.warn('No batch items found with similar barcode');
        return null;
      }
    }
    
    if (!batchItemData) {
      return null;
    }
    
    // Get warehouse and location details if needed
    let warehouseName = '';
    let locationName = '';
    let floor = '';
    let zone = '';
    
    if (batchItemData.warehouse_id) {
      try {
        const { data: warehouseData, error: warehouseError } = await supabase
          .from('warehouses')
          .select('*')
          .eq('id', batchItemData.warehouse_id)
          .single() as { data: any, error: any };
        
        if (!warehouseError && warehouseData) {
          warehouseName = warehouseData.name || '';
        } else {
          console.warn('Error fetching warehouse details:', warehouseError);
        }
      } catch (err) {
        console.error('Exception when fetching warehouse details:', err);
      }
    }
    
    if (batchItemData.location_id) {
      try {
        const { data: locationData, error: locationError } = await supabase
          .from('warehouse_locations')
          .select('*')
          .eq('id', batchItemData.location_id)
          .single() as { data: any, error: any };
        
        if (!locationError && locationData) {
          locationName = locationData.name || '';
          floor = (locationData.floor !== undefined) ? locationData.floor.toString() : '';
          zone = locationData.zone || '';
        } else {
          console.warn('Error fetching location details:', locationError);
        }
      } catch (err) {
        console.error('Exception when fetching location details:', err);
      }
    }
    
    // Map the fields to the flat BatchItem structure
    const batchItem: BatchItem = {
      id: batchItemData.batch_item_id,
      batch_id: batchItemData.batch_id || '',
      product_id: batchItemData.product_id,
      product_name: batchItemData.product_name || '',
      barcode: batchItemData.barcode,
      quantity: batchItemData.quantity || 0,
      batch_number: batchItemData.batch_number || '',
      location_id: batchItemData.location_id,
      location_name: locationName,
      warehouse_id: batchItemData.warehouse_id,
      warehouse_name: warehouseName,
      floor: floor,
      zone: zone,
      status: batchItemData.status,
      color: batchItemData.color,
      size: batchItemData.size,
      created_at: batchItemData.created_at,
      updated_at: batchItemData.updated_at
    };
    
    return batchItem;
  } catch (err) {
    console.error('Error fetching batch item by barcode:', err);
    return null;
  }
};

/**
 * Calculates the maximum quantity that can be deducted from a batch item
 * @param batchItem - The batch item
 * @param stockOutIdOrRequest - The stock out request ID or object
 * @returns The maximum quantity that can be deducted
 */
export const calculateMaxDeductibleQuantity = async (
  batchItem: BatchItem,
  stockOutIdOrRequest: string | any
): Promise<number> => {
  try {
    // Handle different parameter types
    let stockOutId: string;
    let requestedQuantity: number;
    let remainingQuantity: number | undefined;
    
    // Determine if second parameter is a stock out ID or a stock out request object
    if (typeof stockOutIdOrRequest === 'string') {
      stockOutId = stockOutIdOrRequest;
      
      // Fetch the stock out request to get the quantity
      const { data, error } = await supabase
        .from('stock_out' as any)
        .select('quantity, remaining_quantity')
        .eq('id', stockOutId)
        .single() as { data: any, error: any };
        
      if (error || !data) {
        console.warn('Error fetching stock out request:', error);
        return 0;
      }
      
      requestedQuantity = data.quantity || 0;
      remainingQuantity = data.remaining_quantity;
    } else {
      // Use the provided stock out request object
      stockOutId = stockOutIdOrRequest?.id || '';
      requestedQuantity = stockOutIdOrRequest?.quantity || 0;
      remainingQuantity = stockOutIdOrRequest?.remaining_quantity;
      
      if (!stockOutId) {
        console.warn('Invalid stock out request object');
        return 0;
      }
    }
    
    // Use remaining_quantity if available, otherwise calculate it
    if (remainingQuantity !== undefined) {
      return Math.min(batchItem.quantity, remainingQuantity);
    }
    
    // Get the total already processed quantity for this stock out
    const { data: processedItems, error: processedError } = await supabase
      .from('stock_out_processed_items' as any)
      .select('quantity')
      .eq('stock_out_id', stockOutId) as { data: any[], error: any };
      
    if (processedError) {
      console.warn('Error fetching processed items:', processedError);
      return 0;
    }
    
    const totalProcessedQuantity = processedItems?.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0), 
      0
    ) || 0;
    
    // Calculate how much more is needed for the stock out
    const remainingNeeded = Math.max(0, requestedQuantity - totalProcessedQuantity);
    
    // The max deductible is the minimum of the batch item quantity and remaining needed
    return Math.min(batchItem.quantity, remainingNeeded);
  } catch (err) {
    console.error('Error calculating max deductible quantity:', err);
    return 0;
  }
};

/**
 * Calculates the progress of a stock out request
 * Progress starts at 0% (nothing processed) and ends at 100% (fully processed)
 * @param stockOutIdOrRequest - The stock out request ID or object
 * @returns The progress as a percentage (0-100)
 */
export const calculateStockOutProgress = async (
  stockOutIdOrRequest: string | any
): Promise<number> => {
  try {
    // Handle different parameter types
    let stockOutId: string;
    let stockOutRequest: any;
    
    // Determine if parameter is a stock out ID or a stock out request object
    if (typeof stockOutIdOrRequest === 'string') {
      stockOutId = stockOutIdOrRequest;
      
      // Fetch the stock out request to get the quantity
      const { data, error } = await supabase
        .from('stock_out' as any) // Correct table name from database schema
        .select('quantity, remaining_quantity, processed_items:stock_out_processed_items(quantity)')
        .eq('id', stockOutId)
        .single() as { data: any, error: any };
        
      if (error || !data) {
        console.warn('Error fetching stock out request for progress:', error);
        return 0; // 0% progress when error occurs
      }
      
      stockOutRequest = data;
    } else {
      // Use the provided stock out request object
      stockOutRequest = stockOutIdOrRequest;
      stockOutId = stockOutRequest?.id || '';
      
      if (!stockOutId) {
        console.warn('Invalid stock out request object for progress calculation');
        return 0; // 0% progress when invalid data
      }
    }
    
    const requestedQuantity = stockOutRequest.quantity || 0;
    
    if (requestedQuantity <= 0) {
      return 100; // If no quantity requested, consider it complete (100%)
    }
    
    // If we already have processed items from the join, use those
    if (stockOutRequest.processed_items && Array.isArray(stockOutRequest.processed_items)) {
      const totalProcessedQuantity = stockOutRequest.processed_items.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );
      
      // Calculate the progress percentage (0% = nothing processed, 100% = fully processed)
      return Math.min(100, Math.round((totalProcessedQuantity / requestedQuantity) * 100));
    }
    
    // Otherwise fetch processed items separately
    const { data: processedItems, error: processedError } = await supabase
      .from('stock_out_processed_items' as any)
      .select('quantity')
      .eq('stock_out_id', stockOutId) as { data: any[], error: any };
      
    if (processedError) {
      console.warn('Error fetching processed items for progress:', processedError);
      return 0; // 0% progress when error occurs
    }
    
    const totalProcessedQuantity = processedItems?.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0), 
      0
    ) || 0;
    
    // Calculate the progress percentage (0% = nothing processed, 100% = fully processed)
    const progress = Math.min(100, Math.round((totalProcessedQuantity / requestedQuantity) * 100));
    
    console.log(`Stock out progress: ${progress}% (${totalProcessedQuantity}/${requestedQuantity})`);
    return progress;
  } catch (err) {
    console.error('Error calculating stock out progress:', err);
    return 0; // 0% progress when exception occurs
  }
};

/**
 * Calculates the initial progress of a stock out request synchronously
 * This is a simplified version that doesn't make database calls, for use in initialization
 * Progress starts at 0% (nothing processed) and ends at 100% (fully processed)
 * @param stockOutRequest - The stock out request object
 * @returns The progress as a percentage (0-100)
 */
export const calculateInitialProgress = (
  stockOutRequest: any
): number => {
  try {
    if (!stockOutRequest) return 0; // 0% progress when no data
    
    const requestedQuantity = stockOutRequest.quantity || 0;
    if (requestedQuantity <= 0) return 100; // 100% progress when no quantity requested
    
    // If we have remaining_quantity, use that to calculate progress
    if (stockOutRequest.remaining_quantity !== undefined) {
      const processedQuantity = requestedQuantity - stockOutRequest.remaining_quantity;
      const progress = Math.min(100, Math.round((processedQuantity / requestedQuantity) * 100));
      console.log(`Initial stock out progress: ${progress}% (${processedQuantity}/${requestedQuantity})`);
      return progress;
    }
    
    // If we have processed_items, calculate from those
    if (stockOutRequest.processed_items && Array.isArray(stockOutRequest.processed_items)) {
      const totalProcessedQuantity = stockOutRequest.processed_items.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );
      
      return Math.min(100, Math.round((totalProcessedQuantity / requestedQuantity) * 100));
    }
    
    return 0;
  } catch (err) {
    console.error('Error calculating initial stock out progress:', err);
    return 0;
  }
};

/**
 * Creates a processed item object
 * @param stockOutId - The stock out request ID
 * @param batchItem - The batch item being processed
 * @param quantity - The quantity being processed
 * @param userId - The ID of the user processing the item
 * @param notes - Optional notes
 * @returns The created processed item
 */
export const createProcessedItem = (
  stockOutId: string,
  batchItem: BatchItem,
  quantity: number,
  userId: string,
  notes: string = ''
): ProcessedItem => {
  // Extract location information for tracking
  const locationInfo = {
    warehouse_id: batchItem.warehouse_id || null,
    warehouse_name: batchItem.warehouse_name || null,
    location_id: batchItem.location_id || null,
    location_name: batchItem.location_name || null,
    floor: batchItem.floor || null,
    zone: batchItem.zone || null
  };
  
  // Create barcode info
  const barcodeInfo: BarcodeInfo = {
    barcode: batchItem.barcode,
    batch_item_id: batchItem.id,
    batch_number: batchItem.batch_number,
    quantity: quantity
  };
  
  // Create the processed item with a new UUID
  // Store all the data in a notes object to match the database schema
  const notesData = {
    barcodes: [barcodeInfo],
    batch_number: batchItem.batch_number,
    product_name: batchItem.product_name,
    location_info: locationInfo
  };
  
  // Create the processed item with fields that match the database schema
  const processedItem: ProcessedItem = {
    id: uuidv4(),
    stock_out_id: stockOutId,
    stock_out_detail_id: null, // Will be set later when processing
    batch_item_id: batchItem.id,
    product_id: batchItem.product_id,
    barcode: batchItem.barcode,
    warehouse_id: locationInfo.warehouse_id,
    location_id: locationInfo.location_id,
    quantity,
    processed_at: new Date().toISOString(),
    processed_by: userId,
    notes: JSON.stringify(notesData),
    // Add virtual fields for compatibility with existing code
    batch_number: batchItem.batch_number,
    product_name: batchItem.product_name,
    location_info: locationInfo,
    barcodes: [barcodeInfo]
  };
  
  return processedItem;
};

/**
 * Processes a batch item for stock out
 * @param barcode - The barcode of the batch item
 * @param stockOutId - The stock out request ID
 * @param quantity - The quantity to process
 * @param userId - The ID of the user processing the item
 * @param notes - Optional notes
 * @returns The updated stock out request and processed item
 */
export const processBatchItem = async (
  barcode: string,
  stockOutId: string,
  quantity: number,
  userId: string,
  notes: string = ''
): Promise<{
  updatedStockOutRequest: StockOutRequest | null;
  processedItem: ProcessedItem | null;
}> => {
  try {
    // Validate the barcode first
    const validationResult = await validateBarcodeForStockOut(barcode, stockOutId);
    
    if (!validationResult.isValid || !validationResult.batchItem) {
      throw new Error(`Invalid barcode: ${validationResult.errorMessage}`);
    }
    
    // Check if the quantity is valid
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    
    const maxQuantity = validationResult.maxDeductibleQuantity || 0;
    
    if (quantity > maxQuantity) {
      throw new Error(`Quantity exceeds maximum allowed (${maxQuantity})`);
    }
    
    // Create the processed item
    const processedItem = createProcessedItem(
      stockOutId,
      validationResult.batchItem,
      quantity,
      userId,
      notes
    );
    
    // Insert the processed item into the database
    const { error: insertError } = await supabase
      .from('stock_out_processed_items' as any)
      .insert(processedItem);
      
    if (insertError) {
      throw new Error(`Failed to insert processed item: ${insertError.message}`);
    }
    
    // Update the stock out request status if needed
    const progress = await calculateStockOutProgress(stockOutId);
    
    let status = 'in_progress';
    if (progress >= 100) {
      status = 'ready_for_completion';
    }
    
    const { data: updatedRequest, error: updateError } = await supabase
      .from('stock_out' as any) // Correct table name from database schema
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', stockOutId)
      .select()
      .single() as { data: any, error: any };
      
    if (updateError) {
      console.warn(`Failed to update stock out request status: ${updateError.message}`);
    }
    
    return {
      updatedStockOutRequest: updatedRequest as StockOutRequest,
      processedItem
    };
  } catch (error) {
    console.error('Error processing batch item:', error);
    throw error;
  }
};

/**
 * Completes a stock out request by updating all related tables and marking the stock out as completed
 * @param stockOutId - The ID of the stock out to complete
 * @param processedItems - The items that have been processed for this stock out
 * @param userId - The ID of the user completing the stock out
 * @returns A promise that resolves when the stock out is completed
 */
export async function completeStockOut(
  stockOutId: string,
  processedItems: ProcessedItem[],
  userId: string
): Promise<void> {
  try {
    console.log('Starting stock out completion process for ID:', stockOutId);
    console.log('Number of processed items:', processedItems.length);
    
    // Use Promise.all to fetch stock out request and details in parallel for better performance
    const [stockOutResponse, stockOutDetailsResponse] = await Promise.all([
      supabase
        .from('stock_out' as any)
        .select('*')
        .eq('id', stockOutId)
        .single(),
      supabase
        .from('stock_out_details' as any)
        .select('*')
        .eq('stock_out_id', stockOutId)
    ]);
    
    const { data: stockOutData, error: stockOutFetchError } = stockOutResponse as { data: any, error: any };
    const { data: existingDetails, error: detailsError } = stockOutDetailsResponse as { data: any, error: any };
      
    if (stockOutFetchError || !stockOutData) {
      console.error('Error fetching stock out request:', stockOutFetchError);
      throw new Error('Failed to fetch stock out request');
    }
    
    if (detailsError) {
      console.warn('Error fetching stock out details:', detailsError);
      // Continue anyway as we'll update the details
    }
    
    // Filter out any duplicate processed items to avoid issues
    const uniqueProcessedItems = processedItems.filter((item, index, self) =>
      index === self.findIndex((t) => t.batch_item_id === item.batch_item_id)
    );
    
    // Only process new items that haven't been saved yet
    const { data: existingItems, error: existingItemsError } = await supabase
      .from('stock_out_processed_items' as any)
      .select('batch_item_id')
      .eq('stock_out_id', stockOutId) as { data: any[], error: any };
      
    if (existingItemsError) {
      console.error('Error fetching existing processed items:', existingItemsError);
      throw new Error(`Failed to fetch existing processed items: ${existingItemsError.message}`);
    }
    
    const existingBatchItemIds = new Set(
      existingItems?.map((item: any) => item.batch_item_id) || []
    );
    
    const newProcessedItems = uniqueProcessedItems.filter(
      item => !existingBatchItemIds.has(item.batch_item_id)
    );
    
    console.log('Filtered to new processed items:', newProcessedItems.length);
    
    if (newProcessedItems.length === 0) {
      console.log('No new items to process, skipping insertion');
    } else {
      // 1. Validate warehouse and location IDs before insertion
      // Get all valid warehouse IDs
      const { data: warehouses, error: warehouseError } = await supabase
        .from('warehouses' as any)
        .select('id') as { data: any[], error: any };
        
      if (warehouseError) {
        console.error('Error fetching warehouses:', warehouseError);
        throw new Error(`Failed to fetch warehouses: ${warehouseError.message}`);
      }
      
      const validWarehouseIds = new Set(warehouses?.map((w: any) => w.id) || []);
      
      // Get all valid location IDs
      const { data: locations, error: locationError } = await supabase
        .from('locations' as any)
        .select('id') as { data: any[], error: any };
        
      if (locationError) {
        console.error('Error fetching locations:', locationError);
        throw new Error(`Failed to fetch locations: ${locationError.message}`);
      }
      
      const validLocationIds = new Set(locations?.map((l: any) => l.id) || []);
      
      // Prepare items with validated IDs and location data in notes
      const itemsToInsert = newProcessedItems.map(item => {
        // Validate warehouse and location IDs
        const validatedLocationInfo = {
          ...item.location_info,
          warehouse_id: validWarehouseIds.has(item.location_info.warehouse_id || '') ? item.location_info.warehouse_id : null,
          location_id: validLocationIds.has(item.location_info.location_id || '') ? item.location_info.location_id : null
        };
        
        // Store location data and other fields as JSON in notes
        const notesData = {
          ...validatedLocationInfo,
          product_name: item.product_name,
          batch_number: item.batch_number,
          processed_by: userId,
          processed_at: new Date().toISOString()
        };
        
        // Return item with only the fields that exist in the database table
        return {
          id: item.id,
          stock_out_id: item.stock_out_id,
          stock_out_detail_id: item.stock_out_detail_id,
          batch_item_id: item.batch_item_id,
          product_id: item.product_id,
          barcode: item.barcode,
          warehouse_id: validatedLocationInfo.warehouse_id,
          location_id: validatedLocationInfo.location_id,
          quantity: item.quantity,
          processed_by: userId,
          processed_at: new Date().toISOString(),
          notes: JSON.stringify(notesData)
        };
      });
      
      // 2. Insert processed items
      const { error: insertError } = await supabase
        .from('stock_out_processed_items' as any)
        .insert(itemsToInsert);
        
      if (insertError) {
        console.error('Error inserting processed items:', insertError);
        throw new Error(`Failed to insert processed items: ${insertError.message}`);
      }
      
      console.log('Successfully inserted processed items');
    }
    
    // 3. Update stock out detail statuses - the table doesn't have status or completed_at columns
    // Instead update processed_at and processed_by fields
    try {
      // First get the current processed quantity
      const { data: processedItems, error: countError } = await supabase
        .from('stock_out_processed_items' as any)
        .select('quantity')
        .eq('stock_out_id', stockOutId) as { data: any[], error: any };
      
      if (countError) {
        console.warn('Error counting processed items:', countError);
      } else {
        // Calculate total processed quantity
        const totalProcessed = processedItems?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        
        // Update the stock out details
        const { error: detailUpdateError } = await supabase
          .from('stock_out_details' as any)
          .update({ 
            processed_at: new Date().toISOString(),
            processed_by: userId,
            processed_quantity: totalProcessed
          })
          .eq('stock_out_id', stockOutId);
          
        if (detailUpdateError) {
          console.warn('Error updating stock out details:', detailUpdateError);
        } else {
          console.log('Successfully updated stock out details with processed quantity:', totalProcessed);
        }
      }
    } catch (err) {
      console.error('Exception updating stock out details:', err);
    }
    
    // 4. Update related customer inquiries if any
    // Use the correct table name from the database schema
    const { data: stockOutInquiry, error: inquiryFetchError } = await supabase
      .from('stock_out' as any) // Correct table name from database schema
      .select('customer_inquiry_id')
      .eq('id', stockOutId)
      .single() as { data: any, error: any };
      
    if (!inquiryFetchError && stockOutInquiry?.customer_inquiry_id) {
      // Note: customer_inquiries table doesn't have updated_at column
      const { error: inquiryError } = await supabase
        .from('customer_inquiries' as any)
        .update({ status: 'completed' })
        .eq('id', stockOutInquiry.customer_inquiry_id);
        
      if (inquiryError) {
        console.warn('Error updating customer inquiry:', inquiryError);
      } else {
        console.log('Successfully updated customer inquiry status to completed');
      }
    }
    
    // 5. Update the stock out request status
    // Valid statuses from database: 'pending', 'pending_operator', 'approved', 'completed', 'rejected', 'processing'
    const { error: stockOutUpdateError } = await supabase
      .from('stock_out' as any) // Correct table name from database schema
      .update({ 
        status: 'completed', // This is a valid status in the database
        updated_at: new Date().toISOString(), // Add updated_at to match schema
        processed_at: new Date().toISOString(), // Use processed_at instead of completed_at
        processed_by: userId // Use processed_by instead of completed_by
      })
      .eq('id', stockOutId);
      
    if (stockOutUpdateError) {
      console.warn('Error updating stock out request:', stockOutUpdateError);
    } else {
      console.log('Successfully updated stock out request');
    }
    
    // 6. Deduct quantities from batch items
    const batchItemQuantities = new Map<string, number>();
    
    // Sum up quantities by batch item
    processedItems.forEach(item => {
      const currentQuantity = batchItemQuantities.get(item.batch_item_id) || 0;
      batchItemQuantities.set(item.batch_item_id, currentQuantity + item.quantity);
    });
    
    // Update batch items
    for (const [batchItemId, quantity] of batchItemQuantities.entries()) {
      const { data: batchItem, error: batchItemError } = await supabase
        .from('batch_items' as any)
        .select('quantity')
        .eq('id', batchItemId)
        .single() as { data: any, error: any };
        
      if (batchItemError || !batchItem) {
        console.warn(`Error fetching batch item ${batchItemId}:`, batchItemError);
        continue;
      }
      
      const newQuantity = Math.max(0, batchItem.quantity - quantity);
      
      const { error: updateError } = await supabase
        .from('batch_items' as any)
        .update({ quantity: newQuantity })
        .eq('id', batchItemId);
        
      if (updateError) {
        console.warn(`Error updating batch item ${batchItemId}:`, updateError);
      } else {
        console.log(`Updated batch item ${batchItemId} quantity to ${newQuantity}`);
      }
    }
    
    // 7. Update inventory quantities
    try {
      // Create maps for product and location-specific inventory updates
      const productQuantityMap = new Map<string, number>();
      const locationQuantityMap = new Map<string, number>();
      
      // Aggregate quantities by product and location
      processedItems.forEach(item => {
        // Update product-level quantity
        const currentProductQuantity = productQuantityMap.get(item.product_id) || 0;
        productQuantityMap.set(item.product_id, currentProductQuantity + item.quantity);
        
        // Update location-specific quantity if warehouse and location are provided
        if (item.location_info && item.location_info.warehouse_id && item.location_info.location_id) {
          const locationKey = `${item.product_id}:${item.location_info.warehouse_id}:${item.location_info.location_id}`;
          const currentLocationQuantity = locationQuantityMap.get(locationKey) || 0;
          locationQuantityMap.set(locationKey, currentLocationQuantity + item.quantity);
        }
      });
      
      // Update product-level inventory
      await updateInventoryForProducts(productQuantityMap);
      
      // Update location-specific inventory
      await updateLocationSpecificInventory(locationQuantityMap);
      
      // 4.4 Final refresh of inventory_details view
      try {
        // Try to call the populate_inventory_details function which exists in the database
        // The function doesn't expect any parameters, but we need to pass an empty object to avoid 400 Bad Request
        try {
          // Add a timeout to ensure we don't wait too long for this operation
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('RPC call timed out')), 5000);
          });
          
          // Race the RPC call against the timeout
          await Promise.race([
            // Use type assertion to fix TypeScript error
            (supabase.rpc as any)('populate_inventory_details', {}),
            timeoutPromise
          ]);
          
          console.log('Successfully called populate_inventory_details function to refresh inventory');
        } catch (rpcErr) {
          console.warn('Error calling populate_inventory_details:', rpcErr);
          
          // If the function call fails, try a direct query to the view to at least verify it exists
          console.log('Attempting direct query to inventory_details view');
          const { error: viewQueryError } = await supabase
            .from('inventory_details' as any)
            .select('product_id')
            .limit(1);
            
          if (viewQueryError) {
            console.warn('Error accessing inventory details view:', viewQueryError);
          } else {
            console.log('Successfully accessed inventory details view');
          }
        }
      } catch (refreshErr) {
        console.warn('Could not refresh inventory_details view:', refreshErr);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      // Don't throw here to allow the stock out completion to succeed
    }
  } catch (error) {
    console.error('Error completing stock out:', error);
    throw error;
  }
}

/**
 * Updates the inventory details materialized view
 * @returns Promise that resolves when the view has been refreshed
 */
async function updateInventoryDetails(): Promise<void> {
  try {
    const { error: refreshError } = await supabase.rpc('refresh_inventory_details' as any);
    if (!refreshError) {
      console.log('Successfully refreshed inventory_details view');
    } else {
      console.warn('Error refreshing inventory_details view:', refreshError.message);
    }
  } catch (refreshErr) {
    console.warn('Could not refresh inventory_details view:', refreshErr);
  }
}

/**
 * Updates the quantity of a batch item
 * @param batchItemId - The ID of the batch item to update
 * @param newQuantity - The new quantity value
 * @returns Promise that resolves when the update is complete
 */
async function updateBatchItemQuantity(batchItemId: string, newQuantity: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('batch_items')
      .update({ quantity: newQuantity })
      .eq('id', batchItemId);
      
    if (error) {
      console.warn(`Error updating batch item ${batchItemId}:`, error);
    } else {
      console.log(`Updated batch item ${batchItemId} quantity to ${newQuantity}`);
    }
  } catch (err) {
    console.warn(`Error updating batch item ${batchItemId}:`, err);
  }
}

/**
 * Updates inventory for products based on quantity map
 * @param productQuantityMap - Map of product IDs to quantities to deduct
 * @returns Promise that resolves when all inventory updates are complete
 */
async function updateInventoryForProducts(productQuantityMap: Map<string, number>): Promise<void> {
  // Process products in parallel with a limit to avoid overwhelming the database
  const productEntries = Array.from(productQuantityMap.entries())
    .filter(([key]) => !key.includes(':'));
  
  console.log(`Updating inventory for ${productEntries.length} products`);
  
  // Process in batches of 5 to avoid overwhelming the database
  const batchSize = 5;
  for (let i = 0; i < productEntries.length; i += batchSize) {
    const batch = productEntries.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async ([productId, quantityToDeduct]) => {
      try {
        // Instead of using inventory_summary which doesn't exist,
        // we'll update batch_items directly
        console.log(`Processing product ${productId}, deducting ${quantityToDeduct}`);
        
        // Get all batch items for this product that have quantity > 0
        // Use explicit type annotation to avoid excessive type instantiation
        interface BatchItemResponse {
          data: Array<{
            id: string;
            product_id: string;
            quantity: number;
            created_at: string;
            [key: string]: any; // Allow for other properties
          }> | null;
          error: any;
        }
        
        // Modified to include items with quantity = 0 to handle cases where we need to update existing records
        const { data: batchItems, error: fetchError } = await supabase
          .from('batch_items')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: true })
          .limit(100) as BatchItemResponse; // Add limit to prevent potential infinite loops
          
        if (fetchError) {
          console.warn(`Error fetching batch items for product ${productId}:`, fetchError);
          return;
        }
        
        if (!batchItems || batchItems.length === 0) {
          console.warn(`No batch items found for product ${productId}`);
          return;
        }
        
        // Filter to find items with quantity > 0 for deduction
        const availableItems = batchItems.filter(item => item.quantity > 0);
        
        // If no items with quantity > 0, but we have batch items, update the first one
        // This handles the case where we need to track negative inventory
        if (availableItems.length === 0) {
          console.log(`No items with quantity > 0 found for product ${productId}, updating first batch item to track negative inventory`);
          const firstItem = batchItems[0];
          await updateBatchItemQuantity(firstItem.id, firstItem.quantity - quantityToDeduct);
          return;
        }
        
        console.log(`Found ${batchItems.length} batch items for product ${productId}`);
        
        // Deduct quantity from batch items (FIFO)
        let remainingToDeduct = quantityToDeduct;
        
        for (const batchItem of batchItems) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(batchItem.quantity, remainingToDeduct);
          const newQuantity = batchItem.quantity - deductFromThis;
          remainingToDeduct -= deductFromThis;
          
          // Update the batch item quantity using the dedicated function
          try {
            await updateBatchItemQuantity(batchItem.id, newQuantity);
            console.log(`Updated batch item ${batchItem.id} quantity to ${newQuantity}`);
          } catch (updateError) {
            console.warn(`Error updating batch item ${batchItem.id}:`, updateError);
          }
        }
        
        if (remainingToDeduct > 0) {
          console.warn(`Could not deduct full quantity for product ${productId}, remaining: ${remainingToDeduct}`);
        }
      } catch (err) {
        console.warn(`Error processing product ${productId}:`, err);
      }
    }));
  }
}

/**
 * Updates location-specific inventory based on quantity map
 * This function is modified to log information but not attempt to update the non-existent inventory_locations table
 * @param locationQuantityMap - Map of location keys to quantities to deduct
 * @returns Promise that resolves when all inventory updates are complete
 */
async function updateLocationSpecificInventory(locationQuantityMap: Map<string, number>): Promise<void> {
  // Process locations in parallel with a limit to avoid overwhelming the database
  const locationEntries = Array.from(locationQuantityMap.entries())
    .filter(([key]) => key.includes(':'));
  
  console.log('Updating location-specific inventory with keys:', locationEntries.map(([key]) => key));
  
  // Since the inventory_locations table doesn't exist, we'll just log the information
  // and update the batch_items table directly
  for (const [locationKey, quantity] of locationEntries) {
    try {
      // Parse the location key (format: "productId:warehouseId:locationId")
      const [productId, warehouseId, locationId] = locationKey.split(':');
      
      if (!productId || !warehouseId || !locationId) {
        console.warn(`Invalid location key: ${locationKey}`);
        continue;
      }
      
      console.log(`Would update inventory location: Product ${productId} at warehouse ${warehouseId}, location ${locationId}, deducting ${quantity}`);
      
      // Find batch items at this specific location with a limit to prevent excessive data fetching
      // Use the same interface as defined above to avoid excessive type instantiation
      interface BatchItemResponse {
        data: Array<{
          id: string;
          product_id: string;
          warehouse_id: string;
          location_id: string;
          quantity: number;
          created_at: string;
          [key: string]: any; // Allow for other properties
        }> | null;
        error: any;
      }
      
      // Modified to include items with quantity = 0 to handle cases where we need to update existing records
      const { data: batchItems, error: fetchError } = await supabase
        .from('batch_items')
        .select('*')
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId)
        .eq('location_id', locationId)
        .order('created_at', { ascending: true })
        .limit(100) as BatchItemResponse; // Add limit to prevent potential infinite loops
        
      if (fetchError) {
        console.warn(`Error fetching batch items for location ${locationKey}:`, fetchError);
        continue;
      }
      
      if (!batchItems || batchItems.length === 0) {
        console.warn(`No batch items found for location ${locationKey}`);
        continue;
      }
      
      // Filter to find items with quantity > 0 for deduction
      const availableItems = batchItems.filter(item => item.quantity > 0);
      
      // If no items with quantity > 0, but we have batch items, update the first one
      // This handles the case where we need to track negative inventory
      if (availableItems.length === 0) {
        console.log(`No items with quantity > 0 found for location ${locationKey}, updating first batch item to track negative inventory`);
        const firstItem = batchItems[0];
        
        try {
          await updateBatchItemQuantity(firstItem.id, firstItem.quantity - quantity);
          console.log(`Updated batch item ${firstItem.id} quantity to ${firstItem.quantity - quantity} to track negative inventory`);
        } catch (updateError) {
          console.warn(`Error updating batch item ${firstItem.id}:`, updateError);
        }
        continue;
      }
      
      console.log(`Found ${batchItems.length} batch items for location ${locationKey}`);
      
      // Deduct quantity from batch items at this location (FIFO)
      let remainingToDeduct = quantity;
      
      for (const batchItem of batchItems) {
        if (remainingToDeduct <= 0) break;
        
        const deductFromThis = Math.min(batchItem.quantity, remainingToDeduct);
        const newQuantity = batchItem.quantity - deductFromThis;
        remainingToDeduct -= deductFromThis;
        
        // Update the batch item quantity using the dedicated function
        try {
          await updateBatchItemQuantity(batchItem.id, newQuantity);
          console.log(`Updated batch item ${batchItem.id} quantity to ${newQuantity}`);
        } catch (updateError) {
          console.warn(`Error updating batch item ${batchItem.id}:`, updateError);
        }
      }
      
      if (remainingToDeduct > 0) {
        console.warn(`Could not deduct full quantity for location ${locationKey}, remaining: ${remainingToDeduct}`);
      }
    } catch (err) {
      console.warn(`Error processing location ${locationKey}:`, err);
    }
  }
}

/**
 * Refreshes the inventory details view
 * @returns Promise that resolves when the view has been refreshed
 */
async function refreshInventoryDetailsView(): Promise<void> {
  try {
    // First try to use the refresh function if available
    try {
      const { error: refreshError } = await supabase.rpc('refresh_inventory_details' as any);
      if (!refreshError) {
        console.log('Successfully refreshed inventory_details view using RPC');
        return;
      }
    } catch (rpcErr) {
      // Silently fail and try the fallback method
    }
    
    // Fallback: This query will force the view to refresh with the latest data
    await supabase
      .from('inventory_details' as any)
      .select('product_id')
      .limit(1) as any;
      
    console.log('Refreshed inventory_details view after updates');
  } catch (viewErr) {
    console.warn('Error refreshing inventory_details view after updates:', viewErr);
  }
}


/**
 * StockOut Service - Provides functions for managing stock out operations
 */
export const stockOutService = {
  // Barcode validation and processing
  validateBarcodeForStockOut,
  fetchBatchItemByBarcode,
  
  // Quantity calculations
  calculateMaxDeductibleQuantity,
  calculateStockOutProgress,
  
  // Item processing
  createProcessedItem,
  processBatchItem,
  
  // Stock out completion
  completeStockOut,
  
  // Batch item quantity updates
  updateBatchItemQuantity,
  
  // Inventory management
  refreshInventoryDetailsView,
  updateInventoryDetails,
  updateInventoryForProducts,
  updateLocationSpecificInventory,
  getLocationQuantity
};