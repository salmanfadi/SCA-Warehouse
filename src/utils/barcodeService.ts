import { supabase, executeQuery } from '@/lib/supabase';

/**
 * Barcode Service
 * Handles barcode operations including fetching from database and formatting
 */

export interface BarcodeData {
  barcode: string;
  sku?: string | null;
  quantity?: number;
  description?: string | null;
  item_id: string;
}

interface BatchItem {
  id: string;
  barcode?: string | null;
  sku?: string | null;
  quantity?: number;
  description?: string | null;
}

// Type for the barcodes table in Supabase
interface Barcode {
  id: string;
  barcode: string;  // Changed from barcode_number to barcode
  status: string;
  quantity: number;
  created_at: string;
}

// Type for the inventory table in Supabase
interface InventoryItem {
  id: string;
  barcode?: string | null;  // Changed from barcode_number to barcode
  sku?: string | null;
  quantity?: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches a barcode from the database for a specific item
 * @param itemId The ID of the item to fetch barcode for
 * @returns Promise that resolves to the barcode string or null if not found
 */
export const fetchBarcodeForItem = async (itemId: string): Promise<string | null> => {
  try {
    // Try to get from barcodes table
    const { data: barcodeData, error: barcodeError } = await supabase
      .from('barcodes')
      .select('barcode')
      .eq('id', itemId)
      .single();

    if (!barcodeError && barcodeData?.barcode) {
      return barcodeData.barcode;
    }

    // If not found in barcodes, try inventory table
    const { data: inventoryItem, error: invError } = await supabase
      .from('inventory')
      .select('barcode')
      .eq('id', itemId)
      .single();

    if (!invError && inventoryItem?.barcode) {
      return inventoryItem.barcode;
    }

    console.warn(`No barcode found for item ${itemId}`);
    return null;
  } catch (error) {
    console.error('Error fetching barcode:', error);
    return null;
  }
};

/**
 * Generates a new barcode and saves it to the database
 * @param itemId The ID of the item to generate a barcode for
 * @param length Length of the barcode (default: 12)
 * @returns Promise that resolves to the generated barcode string
 */
export const generateAndSaveBarcode = async (itemId: string, length = 12): Promise<string> => {
  if (!itemId) {
    throw new Error('Item ID is required to generate a barcode');
  }

  // First, check if there's an existing barcode
  const existingBarcode = await fetchBarcodeForItem(itemId);
  if (existingBarcode) {
    return existingBarcode;
  }

  // Generate a new barcode
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const barcode = Math.floor(min + Math.random() * (max - min + 1)).toString();

  try {
    // Save to barcodes table
    const { error } = await supabase
      .from('barcodes')
      .insert([
        {
          id: itemId,
          barcode,
          status: 'active',
          quantity: 1,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Database error when saving barcode:', error);
      throw new Error(`Failed to save barcode: ${error.message}`);
    }
    
    return barcode;
  } catch (error) {
    console.error('Error in generateAndSaveBarcode:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate barcode');
  }
};

/**
 * Formats a barcode string for better readability
 * @param barcode Barcode string to format
 * @param groupSize Number of characters per group (default: 4)
 * @param separator Separator character (default: ' ')
 * @returns Formatted barcode string
 */
export const formatBarcode = (barcode: string, groupSize = 4, separator = ' '): string => {
  if (!barcode) return '';
  const regex = new RegExp(`\\B(?=(\\d{${groupSize}})+(?!\\d))`, 'g');
  return barcode.replace(regex, separator);
};

/**
 * Validates a barcode string
 * @param barcode Barcode to validate
 * @returns Boolean indicating if the barcode is valid
 */
export const isValidBarcode = (barcode: string): boolean => {
  return /^\d+$/.test(barcode) && barcode.length >= 8 && barcode.length <= 13;
};

/**
 * Gets or generates barcode data for a batch item
 * @param item Batch item data
 * @returns Promise that resolves to the barcode data
 */
export const getOrCreateBarcodeData = async (item: BatchItem): Promise<BarcodeData> => {
  if (!item?.id) {
    throw new Error('Valid item with ID is required to get or create barcode data');
  }

  try {
    // If barcode already exists and is valid, use it
    if (item.barcode && isValidBarcode(item.barcode)) {
      return {
        barcode: item.barcode,
        sku: item.sku || null,
        quantity: item.quantity || 1,
        description: item.description || null,
        item_id: item.id
      };
    }

    // Otherwise, fetch or generate a new barcode
    const barcode = await generateAndSaveBarcode(item.id);
    
    return {
      barcode,
      sku: item.sku || null,
      quantity: item.quantity || 1,
      description: item.description || null,
      item_id: item.id
    };
  } catch (error) {
    console.error('Error in getOrCreateBarcodeData:', error);
    
    // Fallback to a local barcode if database operation fails
    const fallbackBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    console.warn(`Using fallback barcode for item ${item.id}:`, fallbackBarcode);
    
    return {
      barcode: fallbackBarcode,
      sku: item.sku || null,
      quantity: item.quantity || 1,
      description: item.description || null,
      item_id: item.id
    };
  }
};
