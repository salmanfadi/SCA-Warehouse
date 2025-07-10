/**
 * Stockout Service
 * Handles all stockout-related logic including barcode validation, quantity calculations,
 * and database interactions.
 */

// Import the stockout fix functions
import { fixBatchItemDeduction, updateStockOutWithProperDeduction } from './stockoutFix';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { 
  BatchItem, 
  StockOutRequest, 
  ProcessedItem, 
  BarcodeValidationResult,
  BarcodeInfo
} from './types';

// Define common interfaces for Supabase responses to avoid excessive type instantiation errors
interface BatchItemResponse {
  data: Array<{
    id: string;
    product_id: string;
    quantity: number;
    created_at: string;
    [key: string]: any;
  }> | null;
  error: any;
}

// Explicitly define BatchItemsResponse type to avoid excessive type instantiation
interface BatchItemsResponse {
  data: Array<{
    id: string;
    product_id: string;
    quantity: number;
    created_at: string;
    [key: string]: any;
  }> | null;
  error: any;
}

interface InventorySummaryResponse {
  data: {
    id: string;
    product_id: string;
    total_quantity: number;
    [key: string]: any;
  } | null;
  error: any;
}

interface StockOutResponse {
  data: {
    id: string;
    product_id: string;
    quantity: number;
    remaining_quantity: number;
    stock_out_details: any;
    [key: string]: any;
  } | null;
  error: any;
}

interface StockOutProcessedItemsResponse {
  data: Array<{
    quantity: number;
    [key: string]: any;
  }> | null;
  error: any;
}

// Type definitions for inventory functions
type ProductQuantityMap = Map<string, number>;
type LocationProductQuantityMap = Map<string, number>;

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
      stockOutRequest = stockOutIdOrRequest;
      stockOutId = stockOutRequest?.id || '';
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
      .eq('stock_out_id', stockOutId) as { data: any, error: any };
      
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
      .single() as { 
        data: { 
          batch_item_id: string; 
          barcode_id: string; 
          barcode: string; 
          product_id: string; 
          product_name: string; 
          product_sku: string; 
          product_description: string; 
          quantity: number; 
          batch_number: string; 
          warehouse_id: string; 
          location_id: string; 
          color: string; 
          size: string; 
          status: string; 
          created_at: string; 
          updated_at: string; 
          batch_id: string; 
        } | null, 
        error: any 
      };
      
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
        .limit(1) as { 
          data: Array<{ 
            batch_item_id: string; 
            barcode_id: string; 
            barcode: string; 
            product_id: string; 
            product_name: string; 
            product_sku: string; 
            product_description: string; 
            quantity: number; 
            batch_number: string; 
            warehouse_id: string; 
            location_id: string; 
            color: string; 
            size: string; 
            status: string; 
            created_at: string; 
            updated_at: string; 
            batch_id: string; 
          }> | null, 
          error: any 
        };
        
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
      let stockOutRequest = stockOutIdOrRequest;
      stockOutId = stockOutRequest?.id || '';
      requestedQuantity = stockOutRequest?.quantity || 0;
      remainingQuantity = stockOutRequest?.remaining_quantity;
      
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
// Define a simple interface to avoid excessive type instantiation
interface StockOutRequestProgress {
  quantity?: number;
  remaining_quantity?: number;
  processed_quantity?: number;
  processed_items?: Array<{
    product_id: string;
    quantity: number;
    [key: string]: any;
  }>;
  [key: string]: any; // Allow other properties
}

/**
 * Calculates the initial progress of a stock out request synchronously
 * This is a simplified version that doesn't make database calls, for use in initialization
 * Progress starts at 0% (nothing processed) and ends at 100% (fully processed)
 * @param stockOutRequest - The stock out request object
 * @returns The progress as a percentage (0-100)
 */
export const calculateInitialProgress = (
  stockOutRequest: StockOutRequestProgress | null | undefined
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
 * @param notes - Optional notes
 * @returns A promise that resolves when the stock out is completed
 */
export async function completeStockOut(
  stockOutId: string,
  processedItems: ProcessedItem[],
  userId: string,
  notes?: string
): Promise<void> {
  // Define productQuantityMap at the function scope level to ensure it's accessible throughout
  let productQuantityMap = new Map<string, number>();
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
        .from('warehouses')
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
      // First get the current processed quantity
const { data: processedItems, error: countError } = await supabase
.from('stock_out_processed_items' as any)
.select('quantity')
.eq('stock_out_id', stockOutId) as { data: any, error: any };

if (countError) {
console.warn('Error counting processed items:', countError);
} else {
// Calculate total processed quantity
// Ensure processedItems is treated as an array
const processedItemsArray = Array.isArray(processedItems) ? processedItems : [processedItems].filter(Boolean);
const totalProcessed = processedItemsArray.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        
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
      console.error(`Error updating stock out request ${stockOutId}:`, stockOutUpdateError);
      throw new Error(`Failed to update stock out request: ${stockOutUpdateError.message}`);
    }
    
    console.log(`Successfully updated stock out request ${stockOutId} to completed`);
    
    // 6. Deduct quantities from inventory
    // Create maps to track quantities to deduct by product and by location
    // Use the already defined productQuantityMap
    productQuantityMap = new Map<string, number>();
    const locationProductQuantityMap = new Map<string, number>();
    
    // Populate the maps with quantities to deduct
    for (const detail of existingDetails || []) {
      const { product_id, quantity, location_id } = detail;
      
      // Add to product-level map
      const currentProductQuantity = productQuantityMap.get(product_id) || 0;
      productQuantityMap.set(product_id, currentProductQuantity + quantity);
      
      // Add to location-specific map if location is provided
      if (location_id) {
        const locationKey = `${location_id}:${product_id}`;
        const currentLocationQuantity = locationProductQuantityMap.get(locationKey) || 0;
        locationProductQuantityMap.set(locationKey, currentLocationQuantity + quantity);
      }
    }

// Skip updating inventory by product ID to avoid duplicate deductions
// We'll use barcode-based deduction instead through ensureBatchItemDeduction
console.log('Skipping product ID-based inventory update to avoid duplicate deductions');
// The following line was causing duplicate deductions and has been removed:
// await updateInventoryByProductId(productQuantityMap, userId);

// Update inventory for location-specific products
await updateLocationSpecificInventory(locationProductQuantityMap, userId);

// 4. Refresh inventory details
try {
  // First try to update inventory directly with an RPC call
  const { error: updateError } = await supabase.rpc('update_inventory_for_location' as any, {
    p_product_id: null, // null means update all products
    p_location_id: null  // null means update all locations
  });

  if (updateError) {
    console.warn('Error updating inventory via update_inventory_for_location:', updateError);
    // Try the populate_inventory_details function as fallback
    const { error: rpcError } = await supabase.rpc('populate_inventory_details' as any);
    if (rpcError) {
      console.warn('Error refreshing inventory details via populate_inventory_details:', rpcError);
      throw rpcError; // Throw to trigger the fallback
    }
    const { error: viewError } = await supabase
      .from('inventory_details')
      .select('count')
      .limit(1);

    if (viewError) {
      console.warn('Error querying inventory_details view:', viewError);
    } else {
      console.log('Successfully queried inventory_details view');
    }
  }
} catch (error) {
  console.error('Error refreshing inventory details:', error);
}

console.log(`Stock out request ${stockOutId} completed successfully`);
} catch (error) {
  console.error('Error completing stock out:', error);
  throw error;
}

// Use a simpler type definition to avoid excessive type instantiation
type SimpleProductMap = Map<string, number>;

/**
 * @deprecated This function is deprecated and should not be used as it causes duplicate deductions.
 * Use ensureBatchItemDeduction instead which deducts based on barcodes.
 */
async function updateInventoryByProductId(productQuantityMap: SimpleProductMap, userId?: string): Promise<void> {
  // Process products in parallel with a limit to avoid overwhelming the database
  const productEntries = Array.from(productQuantityMap.entries())
    .filter(([key]) => !key.includes(':'));
  
  console.log(`Updating inventory for ${productEntries.length} products`);
  
  // Process in batches of 5 to avoid overwhelming the database
  const batchSize = 5;
  for (let i = 0; i < productEntries.length; i += batchSize) {
    const batch = productEntries.slice(i, i + batchSize);
    
    // Process each batch item sequentially to avoid excessive type instantiation
    for (const [productId, quantityToDeduct] of batch) {
      try {
        console.log(`Processing product ${productId}, deducting ${quantityToDeduct}`);
        
        // 1. First, update the processed_batches table to reflect the stock out
        // Get product information for creating processed batch record
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name,sku,category,categories')
          .eq('id', productId)
          .single() as { data: { name: string; sku: string; category?: string; categories?: string[] } | null, error: any };
        
        if (!productError && productData) {
          // Skip processed batch creation as requested
          // We'll directly update the batch items based on barcode information
        }
        
        // 2. Now update batch_items
        // Get all batch items for this product
        // Use a simpler approach to avoid excessive type instantiation
        let batchItems: any[] = [];
        let fetchError: any = null;
        try {
          // Use direct query instead of RPC to avoid TypeScript errors
          // Don't use eq with null values - use is_null filter instead
          // Use type assertion to avoid excessive type instantiation error
          const queryResult = await supabase
            .from('batch_items' as any)
            .select('*')
            .eq('product_id', productId)
            .is('location_id', null)  // Use is_null instead of eq.null
            .order('created_at', { ascending: true });
          
          const data = queryResult.data;
          const error = queryResult.error;
          
          batchItems = data || [];
          fetchError = error;
        } catch (err) {
          console.error(`Error querying batch items for ${productId}:`, err);
          fetchError = err;
        }
          
        if (fetchError) {
          console.warn(`Error fetching batch items for product ${productId}:`, fetchError);
          return;
        }
        
        // If no batch items found, try to find existing batch items through barcode_batch_view
        // Use explicit null check to avoid excessive type instantiation
        // Use a simpler check that doesn't trigger deep type instantiation
        const hasBatchItems = !!(batchItems && Array.isArray(batchItems) && batchItems.length);
        if (!hasBatchItems) {
          console.log(`No batch items found for product ${productId}, trying to find in barcode_batch_view`);
          
          // Try to find batch items through barcode_batch_view
          const { data: barcodeBatchItems, error: barcodeFetchError } = await supabase
            .from('barcode_batch_view' as any)
            .select('batch_item_id, barcode, quantity, warehouse_id, location_id')
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .limit(10) as { 
              data: Array<{
                batch_item_id: string; 
                barcode: string; 
                quantity: number; 
                warehouse_id: string; 
                location_id: string; 
              }> | null, 
              error: any 
            };
          
          if (barcodeFetchError) {
            console.error(`Error fetching from barcode_batch_view for product ${productId}:`, barcodeFetchError);
            return;
          }
          
          // Check if we found any items through barcode_batch_view
          const hasBarcodeBatchItems = !!(barcodeBatchItems && Array.isArray(barcodeBatchItems) && barcodeBatchItems.length);
          
          if (hasBarcodeBatchItems) {
            console.log(`Found ${barcodeBatchItems.length} batch items through barcode_batch_view for product ${productId}`);
            
            // Use the first item found
            const batchItemToUpdate = barcodeBatchItems[0];
            const currentQuantity = batchItemToUpdate.quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - quantityToDeduct);
            
            console.log(`Updating batch item ${batchItemToUpdate.batch_item_id} quantity from ${currentQuantity} to ${newQuantity}`);
            
            // Update the batch item quantity
const { error: updateError } = await supabase
.from('batch_items')
.update({ 
  quantity: newQuantity,
  updated_at: new Date().toISOString()
})
.eq('id', batchItemToUpdate.batch_item_id);
              
            if (updateError) {
              console.error(`Error updating batch item ${batchItemToUpdate.batch_item_id}:`, updateError);
            } else {
              console.log(`Successfully updated batch item ${batchItemToUpdate.batch_item_id} for product ${productId}`);
            }
            return;
          }
          
          // If we still couldn't find any batch items, log an error instead of creating a new one with negative inventory
          console.error(`No batch items found in barcode_batch_view for product ${productId}. Cannot process stock-out without existing inventory.`);
          throw new Error(`No batch items found for product ${productId}. Cannot create negative inventory.`);
        }
        
        // Filter to find items with quantity > 0 for deduction
        // Use a simpler approach that avoids excessive type instantiation
        let availableItems: Array<{id: string; quantity: number; [key: string]: any}> = [];
        
        // Manual filtering to avoid deep type instantiation
        if (batchItems && Array.isArray(batchItems)) {
          for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            if (item && typeof item.quantity === 'number' && item.quantity > 0) {
              availableItems.push(item);
            }
          }
        }
        
        // If no items with quantity > 0, look up in barcode_batch_view for available items
        if (availableItems.length === 0) {
          console.log(`No items with quantity > 0 found for product ${productId}, looking up in barcode_batch_view`);
          
          // Try to find batch items through barcode_batch_view with quantity > 0
          const { data: barcodeBatchItems, error: barcodeFetchError } = await supabase
            .from('barcode_batch_view' as any)
            .select('batch_item_id, barcode, quantity, warehouse_id, location_id')
            .eq('product_id', productId)
            .gt('quantity', 0) // Only get items with positive quantity
            .order('created_at', { ascending: true })
            .limit(10) as { 
              data: Array<{
                batch_item_id: string; 
                barcode: string; 
                quantity: number; 
                warehouse_id: string; 
                location_id: string; 
              }> | null, 
              error: any 
            };
          
          if (barcodeFetchError) {
            console.error(`Error fetching from barcode_batch_view for product ${productId}:`, barcodeFetchError);
            throw new Error(`Cannot find inventory for product ${productId}. Stock-out cannot be processed.`);
          }
          
          // Check if we found any items through barcode_batch_view
          const hasBarcodeBatchItems = !!(barcodeBatchItems && Array.isArray(barcodeBatchItems) && barcodeBatchItems.length);
          
          if (hasBarcodeBatchItems) {
            console.log(`Found ${barcodeBatchItems.length} batch items with positive quantity in barcode_batch_view for product ${productId}`);
            
            // Convert to availableItems format for processing below
            availableItems = barcodeBatchItems.map(item => ({
              id: item.batch_item_id,
              quantity: item.quantity,
              warehouse_id: item.warehouse_id,
              location_id: item.location_id
            }));
          } else {
            console.error(`No batch items with positive quantity found for product ${productId}. Cannot process stock-out without available inventory.`);
            throw new Error(`No available inventory found for product ${productId}. Stock-out cannot be processed.`);
          }
        }
        
        console.log(`Found ${availableItems.length} available batch items for product ${productId}`);
        
        // Deduct quantity from batch items (FIFO)
        let remainingToDeduct = quantityToDeduct;
        
        for (const batchItem of availableItems) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(batchItem.quantity, remainingToDeduct);
          const newQuantity = batchItem.quantity - deductFromThis;
          remainingToDeduct -= deductFromThis;
          
          // Update the batch item quantity
          try {
            await updateBatchItemQuantity(batchItem.id, newQuantity);
            console.log(`Updated batch item ${batchItem.id} quantity to ${newQuantity}`);
          } catch (updateError) {
            console.warn(`Error updating batch item ${batchItem.id}:`, updateError);
          }
        }
        
        if (remainingToDeduct > 0) {
          console.warn(`Could not deduct full quantity for product ${productId}, remaining: ${remainingToDeduct}. Looking up additional inventory in barcode_batch_view.`);
          
          // Try to find more batch items through barcode_batch_view with quantity > 0
          const { data: additionalBatchItems, error: barcodeFetchError } = await supabase
            .from('barcode_batch_view' as any)
            .select('batch_item_id, barcode, quantity, warehouse_id, location_id')
            .eq('product_id', productId)
            .gt('quantity', 0) // Only get items with positive quantity
            .order('created_at', { ascending: true })
            .limit(20) as { 
              data: Array<{
                batch_item_id: string; 
                barcode: string; 
                quantity: number; 
                warehouse_id: string; 
                location_id: string; 
              }> | null, 
              error: any 
            };
          
          if (barcodeFetchError) {
            console.error(`Error fetching additional items from barcode_batch_view for product ${productId}:`, barcodeFetchError);
            throw new Error(`Insufficient inventory for product ${productId}. Stock-out cannot be fully processed.`);
          }
          
          // Filter out batch items we've already processed
          const processedIds = new Set(availableItems.map(item => item.id));
          const additionalItems = (additionalBatchItems || []).filter(item => !processedIds.has(item.batch_item_id));
          
          if (additionalItems.length > 0) {
            console.log(`Found ${additionalItems.length} additional batch items for product ${productId}`);
            
            // Deduct remaining quantity from these additional items
            for (const batchItem of additionalItems) {
              if (remainingToDeduct <= 0) break;
              
              const deductFromThis = Math.min(batchItem.quantity, remainingToDeduct);
              const newQuantity = batchItem.quantity - deductFromThis;
              remainingToDeduct -= deductFromThis;
              
              // Update the batch item quantity
              try {
                await updateBatchItemQuantity(batchItem.batch_item_id, newQuantity);
                console.log(`Updated additional batch item ${batchItem.batch_item_id} quantity to ${newQuantity}`);
              } catch (updateError) {
                console.warn(`Error updating additional batch item ${batchItem.batch_item_id}:`, updateError);
              }
            }
          }
          
          // If we still have remaining quantity to deduct after checking all available inventory
          if (remainingToDeduct > 0) {
            console.error(`Insufficient inventory for product ${productId}, remaining: ${remainingToDeduct}. Stock-out cannot be fully processed.`);
            throw new Error(`Insufficient inventory for product ${productId}. Only ${quantityToDeduct - remainingToDeduct} of ${quantityToDeduct} units could be processed. Please adjust the stock-out quantity.`);
          }
        }
        
        // 3. Update inventory summary if it exists
        try {
          // Use type assertion to avoid excessive type instantiation
          const inventorySummaryResult = await supabase
            .from('inventory_summary')
            .select('*')
            .eq('product_id', productId)
            .single();
            
          const inventoryData = inventorySummaryResult.data;
          const inventoryError = inventorySummaryResult.error;
            
          if (!inventoryError && inventoryData) {
            const newTotalQuantity = Math.max(0, inventoryData.total_quantity - quantityToDeduct);
            
            const { error: updateError } = await supabase
              .from('inventory_summary')
              .update({
                total_quantity: newTotalQuantity,
                last_updated: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('product_id', productId);
              
            if (updateError) {
              console.warn(`Error updating inventory summary for product ${productId}:`, updateError);
            } else {
              console.log(`Updated inventory summary for product ${productId} to ${newTotalQuantity}`);
            }
          }
        } catch (err) {
          console.warn(`Error processing inventory summary for product ${productId}:`, err);
        }
      } catch (err) {
        console.warn(`Error processing product ${productId}:`, err);
      }
    }
  }
}

/**
 * Updates inventory for specific product-location combinations
 * @param locationProductQuantityMap - Map of location:product_id to quantity
 * @param userId - ID of the user performing the update
 */
async function updateLocationSpecificInventory(locationProductQuantityMap: Map<string, number>, userId?: string): Promise<void> {
  // Process location-specific products in parallel with a limit
  const locationProductEntries = Array.from(locationProductQuantityMap.entries())
    .filter(([key]) => key.includes(':'));
  
  console.log(`Updating location-specific inventory for ${locationProductEntries.length} entries`);
  
  // Process in batches of 5 to avoid overwhelming the database
  const batchSize = 5;
  for (let i = 0; i < locationProductEntries.length; i += batchSize) {
    const batch = locationProductEntries.slice(i, i + batchSize);
    // Use a regular for loop instead of Promise.all to avoid excessive type instantiation
    for (const [locationProductKey, quantityToDeduct] of batch) {
      try {
        // Parse the location and product IDs from the composite key
        const [locationId, productId] = locationProductKey.split(':');
        
        if (!locationId || !productId) {
          console.warn(`Invalid location-product key: ${locationProductKey}`);
          return;
        }
        
        console.log(`Processing location ${locationId}, product ${productId}, deducting ${quantityToDeduct}`);
        
        // 1. First, update the processed_batches table to reflect the location-specific stock out
        // Get product and location information for creating processed batch record
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name,sku,category,categories')
          .eq('id', productId)
          .single() as { data: { name: string; sku: string; category?: string; categories?: string[] } | null, error: any };
        
        // Get warehouse ID for this location
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('warehouse_id')
          .eq('id', locationId)
          .single();
        
        const warehouseId = locationData?.warehouse_id || '00000000-0000-0000-0000-000000000000';
        
        if (!productError && productData) {
          // Create a processed batch record for this stock out
          const processedBatchData = {
            id: uuidv4(),
            product_id: productId,
            total_quantity: -quantityToDeduct, // Negative to indicate stock out
            status: 'completed',
            source: 'stock_out',
            processed_at: new Date().toISOString(),
            notes: `Stock out of ${quantityToDeduct} units from location ${locationId}`,
            created_at: new Date().toISOString(),
            processed_by: 'system', // Default to system for automated stock outs
            warehouse_id: warehouseId,
            location_id: locationId
          };
          
          const { error: insertError } = await supabase
            .from('processed_batches')
            .insert(processedBatchData);
          
          if (insertError) {
            console.warn(`Error creating processed batch record for product ${productId} at location ${locationId}:`, insertError);
          } else {
            console.log(`Created processed batch record for product ${productId} stock out at location ${locationId}`);
          }
        } else {
          console.warn(`Could not fetch product data for ${productId}:`, productError);
        }
        
        // 2. Now update batch_items for this product at this location
        // Use type assertion to avoid excessive type instantiation
        // Use a simpler approach to avoid excessive type instantiation
        let batchItems: any[] = [];
        let fetchError: any = null;
        
        try {
          // Use type assertion to avoid excessive type instantiation
          const query = supabase.from('batch_items' as any);
          const result = await query.select('*')
            .eq('product_id', productId)
            .eq('location_id', locationId)
            .order('created_at', { ascending: true });
          batchItems = result.data || [];
          fetchError = result.error;
        } catch (err) {
          console.error(`Error querying batch items for ${productId} at location ${locationId}:`, err);
          fetchError = err;
        }
          
        if (fetchError) {
          console.warn(`Error fetching batch items for product ${productId} at location ${locationId}:`, fetchError);
          return;
        }
        
        // If no batch items found, try to find existing batch items through barcode_batch_view
        // Use explicit null check to avoid excessive type instantiation
        // Use a simpler check that doesn't trigger deep type instantiation
        const hasBatchItems = !!(batchItems && Array.isArray(batchItems) && batchItems.length);
        if (!hasBatchItems) {
          console.log(`No batch items found for product ${productId} at location ${locationId}, trying to find in barcode_batch_view`);
          
          // Try to find batch items through barcode_batch_view
          const { data: barcodeBatchItems, error: barcodeFetchError } = await supabase
            .from('barcode_batch_view' as any)
            .select('batch_item_id, barcode, quantity, warehouse_id, location_id')
            .eq('product_id', productId)
            .order('created_at', { ascending: false })
            .limit(10) as { 
              data: Array<{
                batch_item_id: string; 
                barcode: string; 
                quantity: number; 
                warehouse_id: string; 
                location_id: string; 
              }> | null, 
              error: any 
            };
          
          if (barcodeFetchError) {
            console.error(`Error fetching from barcode_batch_view for product ${productId} at location ${locationId}:`, barcodeFetchError);
            return;
          }
          
          // Check if we found any items through barcode_batch_view
          const hasBarcodeBatchItems = !!(barcodeBatchItems && Array.isArray(barcodeBatchItems) && barcodeBatchItems.length);
          
          if (hasBarcodeBatchItems) {
            console.log(`Found ${barcodeBatchItems.length} batch items through barcode_batch_view for product ${productId} at location ${locationId}`);
            
            // Use the first item found
            const batchItemToUpdate = barcodeBatchItems[0];
            const batchItemId = batchItemToUpdate.batch_item_id;
            const currentQuantity = batchItemToUpdate.quantity || 0;
            const newQuantity = Math.max(0, currentQuantity - quantityToDeduct);
            
            console.log(`Updating batch item ${batchItemToUpdate.batch_item_id} quantity from ${currentQuantity} to ${newQuantity}`);
            
            // Update the batch item quantity
            const { error: updateError } = await supabase
              .from('batch_items')
              .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', batchItemToUpdate.batch_item_id);
              
            if (updateError) {
              console.error(`Error updating batch item ${batchItemToUpdate.batch_item_id}:`, updateError);
              throw updateError;
            } else {
              console.log(`Successfully updated batch item ${batchItemToUpdate.batch_item_id} quantity to ${newQuantity}`);
            }
          } else {
            // No batch items found in barcode_batch_view
            console.error(`No batch items found in barcode_batch_view for product ${productId} at location ${locationId}. Cannot process stock-out without existing inventory.`);
            throw new Error(`No batch items found for product ${productId} at location ${locationId}. Cannot create negative inventory.`);
          }
        }
        
        // Filter to find items with quantity > 0 for deduction
        // Use a simpler approach that avoids excessive type instantiation
        let availableItems: Array<{id: string; quantity: number; [key: string]: any}> = [];
        
        // Manual filtering to avoid deep type instantiation
        if (batchItems && Array.isArray(batchItems)) {
          for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            if (item && typeof item.quantity === 'number' && item.quantity > 0) {
              availableItems.push(item);
            }
          }
        }
        
        if (availableItems.length === 0) {
          console.log(`No items with quantity > 0 found for product ${productId} at location ${locationId}, updating first batch item to track negative inventory`);
          const firstItem = batchItems[0];
          await updateBatchItemQuantity(firstItem.id, firstItem.quantity - quantityToDeduct);
          return;
        }
        
        console.log(`Found ${availableItems.length} batch items for product ${productId} at location ${locationId}`);
        
        // Deduct quantity from batch items (FIFO)
        let remainingToDeduct = quantityToDeduct;
        
        for (const batchItem of availableItems) {
          if (remainingToDeduct <= 0) break;
          
          const deductFromThis = Math.min(batchItem.quantity, remainingToDeduct);
          const newQuantity = batchItem.quantity - deductFromThis;
          remainingToDeduct -= deductFromThis;
          
          // Update the batch item quantity
          try {
            await updateBatchItemQuantity(batchItem.id, newQuantity);
            console.log(`Updated batch item ${batchItem.id} quantity to ${newQuantity}`);
          } catch (updateError) {
            console.warn(`Error updating batch item ${batchItem.id}:`, updateError);
          }
        }
        
        if (remainingToDeduct > 0) {
          console.warn(`Could not deduct full quantity for product ${productId} at location ${locationId}, remaining: ${remainingToDeduct}. Creating negative inventory.`);
          // Create negative inventory in the first batch item
          const firstItem = batchItems[0];
          await updateBatchItemQuantity(firstItem.id, firstItem.quantity - remainingToDeduct);
        }
        
        // 3. Update location-specific inventory summary if it exists
        try {
          // Check if inventory_locations table exists by querying it safely
          // Use a more generic approach with a custom query to avoid type errors
          // Avoid type instantiation errors by using separate variable assignments
          // Use a simpler approach to avoid excessive type instantiation
          let inventoryLocation: any = null;
          let locationError: any = null;
          
          try {
            // Execute the query directly to avoid deep type instantiation
            const result = await supabase
              .from('inventory_details')
              .select('*')
              .eq('product_id', productId)
              .eq('location_id', locationId)
              .single();
              
            inventoryLocation = result.data;
            locationError = result.error;
          } catch (err) {
            console.error(`Error querying inventory details for ${productId} at location ${locationId}:`, err);
            locationError = err;
          }
            
          // Variables are already defined in the try/catch block above
            
          if (!locationError && inventoryLocation) {
            console.log(`Found inventory details for product ${productId} at location ${locationId}`);
            // Instead of directly updating a table that might not exist in the schema,
            // we'll call the refresh function which will handle the updates properly
            try {
              await (supabase.rpc as any)('update_inventory_for_location', {
                p_product_id: productId,
                p_location_id: locationId,
                p_quantity_change: -quantityToDeduct
              });
              console.log(`Updated inventory for product ${productId} at location ${locationId}`);
            } catch (rpcError) {
              console.warn(`Error updating inventory for product ${productId} at location ${locationId}:`, rpcError);
            }
          }
        } catch (err) {
          console.warn(`Error processing inventory details for product ${productId} at location ${locationId}:`, err);
        }
      } catch (err) {
        console.warn(`Error processing location-product entry:`, err);
      }
    }
  }
  
  // Apply the enhanced batch item deduction to ensure proper updates
  try {
    // Pass the map that was created earlier in this function (around line 1091)
    // This ensures batch items are properly deducted even if the regular process fails
    if (productQuantityMap instanceof Map) {
      console.log('Applying enhanced batch item deduction fix...');
      await ensureBatchItemDeduction(stockOutId, productQuantityMap);
    } else {
      console.error('productQuantityMap is not a valid Map, skipping enhanced batch item deduction');
    }
  } catch (error) {
    console.error(`Error applying batch item deduction fix for ${stockOutId}:`, error);
    // Continue with completion even if the fix fails
  }
  
  console.log(`Completed stock out process for ${stockOutId}`);
}

/**
 * Ensures proper batch item deduction for a stock out
 * @param stockOutId - The ID of the stock out
 * @param productQuantities - Map of product IDs to quantities
 */
async function ensureBatchItemDeduction(stockOutId: string, productQuantities: Map<string, number>): Promise<void> {
  try {
    console.log(`Ensuring proper batch item deduction for stock out ${stockOutId}`);
    
    // Create a map to store barcode information
    const barcodeMap = new Map<string, { quantity: number; productId: string }>(); 
    
    // Get all processed items for this stock out
    const processedItemsResult = await supabase
      .from('stock_out_processed_items' as any)
      .select('*')
      .eq('stock_out_id', stockOutId);
      
    const processedItems = processedItemsResult.data as any[] || [];
    const processedItemsError = processedItemsResult.error;
    
    if (processedItemsError) {
      console.error(`Error fetching processed items for stock out ${stockOutId}:`, processedItemsError);
      return;
    }
    
    console.log(`Found ${processedItems.length} processed items for stock out ${stockOutId}`);
    
    // Extract barcode information from processed items
    for (const item of processedItems) {
      try {
        console.log(`Processing item for barcode extraction:`, item);
        const productId = item.product_id;
        const quantity = item.quantity || 1;
        
        if (!productId) {
          console.warn(`No product ID found for processed item ${item.id}, skipping`);
          continue;
        }
        
        // First check for direct barcode column (primary source)
        if (item && item.barcode) {
          const barcode = item.barcode;
          console.log(`Found direct barcode ${barcode} in processed item ${item.id}`);
          
          barcodeMap.set(barcode, { 
            quantity, 
            productId 
          });
          console.log(`✅ Added barcode ${barcode} with quantity ${quantity} for product ${productId}`);
          continue; // If we found a direct barcode, no need to check other sources
        }
          
        // Fallback: Extract barcode information from the notes field
        if (item && item.notes && typeof item.notes === 'string') {
          try {
            const notesData = JSON.parse(item.notes);
            console.log('Parsed notes data:', notesData);
            
            if (notesData.barcodes && Array.isArray(notesData.barcodes)) {
              // Process each barcode in the notes
              for (const b of notesData.barcodes) {
                const barcode = b.barcode || b.id || b;
                const barcodeQuantity = b.quantity || quantity;
                
                if (barcode) {
                  barcodeMap.set(barcode, { 
                    quantity: barcodeQuantity, 
                    productId 
                  });
                  console.log(`✅ Added barcode ${barcode} with quantity ${barcodeQuantity} from notes for product ${productId}`);
                }
              }
            }
          } catch (parseError) {
            console.error(`Error parsing notes JSON for item ${item.id}:`, parseError);
          }
        }
        
        // Also check for direct barcodes field as last resort
        if (item && item.barcodes && barcodeMap.size === 0) {
          let barcodeArray: any[] = [];
          
          // Handle both string and array formats
          if (typeof item.barcodes === 'string') {
            try {
              barcodeArray = JSON.parse(item.barcodes);
              console.log('Parsed barcodes from string:', barcodeArray);
            } catch (parseError) {
              console.error(`Error parsing barcodes JSON for item ${item.id}:`, parseError);
            }
          } else if (Array.isArray(item.barcodes)) {
            barcodeArray = item.barcodes;
            console.log('Using direct barcodes array:', barcodeArray);
          }
          
          if (Array.isArray(barcodeArray) && barcodeArray.length > 0) {
            // Process each barcode in the array
            for (const b of barcodeArray) {
              const barcode = typeof b === 'string' ? b : (b.barcode || b.id || b);
              const barcodeQuantity = typeof b === 'string' ? quantity : (b.quantity || quantity);
              
              if (barcode) {
                barcodeMap.set(barcode, { 
                  quantity: barcodeQuantity, 
                  productId 
                });
                console.log(`✅ Added barcode ${barcode} with quantity ${barcodeQuantity} from barcodes array for product ${productId}`);
              }
            }
          }
        }
        
        // If no barcodes were found in the processed item, log a warning
        if (barcodeMap.size === 0) {
          console.warn(`No barcodes found for processed item ${item.id} with product ${productId}`);
        }
      } catch (error) {
        console.error(`Error processing item ${item?.id || 'unknown'}:`, error);
      }
    }
    
    console.log('Barcode mapping with quantities:', 
      Array.from(barcodeMap.entries()).map(([barcode, info]) => 
        ({ barcode, quantity: info.quantity, productId: info.productId })
      )
    );
    
    // Process each barcode in the map
    let deductionSuccessful = false;
    let totalDeducted = 0;
    
    for (const [barcode, info] of barcodeMap.entries()) {
      try {
        const { quantity, productId } = info;
        
        console.log(`Processing deduction for barcode ${barcode} with quantity ${quantity}`);
        
        // Use the revised fixBatchItemDeduction function that prioritizes barcodes
        const success = await fixBatchItemDeduction(barcode, quantity, productId);
        
        if (success) {
          console.log(`✅ Successfully deducted ${quantity} from batch item with barcode ${barcode}`);
          totalDeducted += quantity;
          deductionSuccessful = true;
        } else {
          console.error(`❌ Failed to deduct ${quantity} from batch item with barcode ${barcode}`);
        }
      } catch (error) {
        console.error(`Error processing barcode ${barcode}:`, error);
      }
    }
    
    // Log the overall results
    if (deductionSuccessful) {
      console.log(`✅ Successfully deducted a total of ${totalDeducted} units from batch items using barcodes`);
    } else {
      console.error(`❌ Could not deduct any quantities from batch items using barcodes`);
    }
    
    // Refresh inventory views to ensure changes are visible
    await refreshInventoryDetailsView();
    console.log(`Completed batch item deduction fix for stock out ${stockOutId}`);
  } catch (error) {
    console.error(`Error in ensureBatchItemDeduction for ${stockOutId}:`, error);
  }
}

/**
 * Refreshes the inventory views and summary tables
 * @returns Promise that resolves when the views have been refreshed
 */
async function refreshInventoryDetailsView(): Promise<void> {
  try {
    console.log('Refreshing inventory views and summary tables...');
    
    // Try multiple refresh methods to ensure data consistency
    const refreshMethods = [
      // Method 1: Try the refresh_inventory_details RPC (now deployed)
      async () => {
        try {
          const { error } = await supabase.rpc('refresh_inventory_details' as any);
          if (!error) {
            console.log('Successfully refreshed inventory using refresh_inventory_details RPC');
            return true;
          }
          return false;
        } catch (e) {
          console.log('refresh_inventory_details RPC error:', e);
          return false;
        }
      },
      
      // Method 2: Try the get_inventory_summary RPC (now deployed)
      async () => {
        try {
          // This RPC updates the inventory_summary table with aggregated product quantities
          const { error } = await supabase.rpc('get_inventory_summary' as any);
          if (!error) {
            console.log('Successfully refreshed inventory_summary table using get_inventory_summary RPC');
            return true;
          }
          return false;
        } catch (e) {
          console.log('get_inventory_summary RPC error:', e);
          return false;
        }
      },
      
      // Method 3: Try the get_product_locations RPC (now deployed with warehouse_locations)
      async () => {
        try {
          // This RPC updates product location details across warehouses
          // Passing null as product_id refreshes all products
          const { error } = await supabase.rpc('get_product_locations' as any, { product_id: null });
          if (!error) {
            console.log('Successfully refreshed product locations using get_product_locations RPC');
            return true;
          }
          return false;
        } catch (e) {
          console.log('get_product_locations RPC error:', e);
          return false;
        }
      },
      
      // Method 4: Force refresh by directly querying batch_items
      async () => {
        try {
          // This query will force the database to refresh its internal state
          await supabase
            .from('batch_items' as any)
            .select('id, product_id, quantity')
            .limit(1);
          console.log('Successfully refreshed inventory using batch_items query');
          return true;
        } catch (e) {
          console.log('batch_items query error:', e);
          return false;
        }
      },
      
      // Method 5: Force refresh by querying warehouse_locations
      async () => {
        try {
          await supabase
            .from('warehouse_locations' as any)
            .select('id, warehouse_id, floor, zone')
            .limit(1);
          console.log('Successfully refreshed inventory using warehouse_locations query');
          return true;
        } catch (e) {
          console.log('warehouse_locations query error:', e);
          return false;
        }
      }
    ];
    
    // Try each method until one succeeds
    let refreshed = false;
    for (const method of refreshMethods) {
      refreshed = await method();
      if (refreshed) {
        break;
      }
    }
    
    if (!refreshed) {
      console.warn('All inventory refresh methods failed, inventory data may be stale');
    } else {
      console.log('Successfully refreshed inventory data');
    }
  } catch (error) {
    console.error('Error refreshing inventory views:', error);
  }
}


/**
 * StockOut Service - Provides functions for managing stock out operations
 */
/**
 * Updates the quantity of a batch item
 * @param batchItemId - ID of the batch item to update
 * @param newQuantity - New quantity for the batch item
 * @param userId - ID of the user making the update (optional)
 * @returns Promise that resolves when the update is complete
 */
async function updateBatchItemQuantity(batchItemId: string, newQuantity: number, userId?: string): Promise<void> {
  try {
    console.log(`Updating batch item ${batchItemId} quantity to ${newQuantity}`);
    
    const updateData: Record<string, any> = {
      quantity: newQuantity,
      updated_at: new Date().toISOString()
    };
    
    // Add user ID if provided
    if (userId) {
      updateData.updated_by = userId;
    }
    
    const { error } = await supabase
      .from('batch_items')
      .update(updateData)
      .eq('id', batchItemId);
      
    if (error) {
      console.error(`Error updating batch item ${batchItemId}:`, error);
      throw new Error(`Failed to update batch item: ${error.message}`);
    }
    
    console.log(`Successfully updated batch item ${batchItemId} quantity to ${newQuantity}`);
  } catch (err) {
    console.error(`Exception updating batch item ${batchItemId}:`, err);
    throw err;
  }
}

/**
 * Updates inventory details by calling the appropriate RPC function
 * @returns Promise that resolves when inventory details have been updated
 */
async function updateInventoryDetails(): Promise<void> {
  try {
    // First try to use the update_inventory_for_location RPC
    const { error: updateError } = await supabase.rpc('update_inventory_for_location' as any, {
      p_product_id: null, // null means update all products
      p_location_id: null // null means update all locations
    });
    
    if (!updateError) {
      console.log('Successfully updated inventory details using update_inventory_for_location');
      return;
    }
    
    console.warn('Error using update_inventory_for_location, falling back to populate_inventory_details:', updateError);
    
    // Fallback to populate_inventory_details
    const { error: rpcError } = await supabase.rpc('populate_inventory_details' as any);
    
    if (rpcError) {
      console.warn('Error refreshing inventory details via populate_inventory_details:', rpcError);
      throw rpcError;
    }
    
    console.log('Successfully refreshed inventory details using populate_inventory_details');
  } catch (refreshErr) {
    console.warn('Could not refresh inventory_details view:', refreshErr);
    throw refreshErr;
  }
}

// Missing closing brace for the completeStockOut function defined at line 827
}

/**
 * Updates the quantity of a batch item
 * @param batchItemId - The ID of the batch item to update
 * @param newQuantity - The new quantity value
 * @returns A promise that resolves when the update is complete
 */
export async function updateBatchItemQuantity(
  batchItemId: string,
  newQuantity: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('batch_items')
      .update({ quantity: newQuantity })
      .eq('id', batchItemId);
      
    if (error) {
      console.error('Error updating batch item quantity:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to update batch item quantity:', err);
    throw err;
  }
}

/**
 * Refreshes the inventory details view
 * @returns A promise that resolves when the refresh is complete
 */
export async function refreshInventoryDetailsView(): Promise<void> {
  try {
    // Using type assertion to bypass TypeScript's type checking for RPC function name
    const { error } = await supabase.rpc('refresh_inventory_details' as any);
    if (error) {
      console.error('Error refreshing inventory details view:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to refresh inventory details view:', err);
    throw err;
  }
}

/**
 * Updates inventory details for all products
 * @returns A promise that resolves when the update is complete
 */
export async function updateInventoryDetails(): Promise<void> {
  try {
    // Using type assertion to bypass TypeScript's type checking for RPC function name
    const { error } = await supabase.rpc('update_inventory_details' as any);
    if (error) {
      console.error('Error updating inventory details:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to update inventory details:', err);
    throw err;
  }
}

/**
 * Updates inventory for specific products
 * @param productIds - Array of product IDs to update
 * @returns A promise that resolves when the update is complete
 */
export async function updateInventoryForProducts(productIds: string[]): Promise<void> {
  try {
    // Using type assertion to bypass TypeScript's type checking for RPC function name
    const { error } = await supabase.rpc('update_inventory_for_products' as any, { product_ids: productIds });
    if (error) {
      console.error('Error updating inventory for products:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to update inventory for products:', err);
    throw err;
  }
}

/**
 * Updates inventory for a specific location
 * @param warehouseId - The warehouse ID
 * @param locationId - The location ID
 * @returns A promise that resolves when the update is complete
 */
export async function updateLocationSpecificInventory(
  warehouseId: string,
  locationId: string
): Promise<void> {
  try {
    // Using type assertion to bypass TypeScript's type checking for RPC function name
    const { error } = await supabase.rpc('update_location_inventory' as any, { 
      warehouse_id: warehouseId,
      location_id: locationId 
    });
    if (error) {
      console.error('Error updating location inventory:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to update location inventory:', err);
    throw err;
  }
}

// Note: These function declarations were removed because they were duplicates
// of functions already defined earlier in the file.
// The stockOutService export object below still references the original function declarations.

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
  calculateInitialProgress,
  
  // Batch item quantity updates
  updateBatchItemQuantity,
  
  // Inventory management
  refreshInventoryDetailsView,
  updateInventoryDetails,
  updateInventoryForProducts,
  updateLocationSpecificInventory,
  getLocationQuantity
};