import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { toast } from 'sonner';

// Define interfaces for the data structure
export interface ProcessedItem {
  id: string;
  stock_out_detail_id: string;
  batch_item_id: string;
  product_id: string;
  barcode: string;
  quantity: number;
  processed_by: string;
  processed_at: string;
  location_id: string;
  warehouse_id: string;
  notes?: any;
  
  // Joined data
  product_name?: string;
  product_sku?: string;
  user_name?: string;
  user_role?: string;
  warehouse_name?: string;
  location_name?: string;
  floor?: number;
  zone?: string;
  box_code?: string;
  color?: string;
  size?: string;
  batch_info?: {
    id: string;
    status: string;
  };
  reservation_info?: {
    id: string;
    reserved_quantity: number;
    total_quantity: number;
  };
}

export interface StockOutDetail {
  id: string;
  product_id: string;
  quantity: number;
  processed_quantity: number;
  barcode?: string;
  product_name?: string;
  product_sku?: string;
}

export interface CompletedStockOut {
  id: string;
  reference_number: string;
  customer_inquiry_id: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  customer_name: string;
  user_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  details: StockOutDetail[];
  processed_items: ProcessedItem[];
  is_reservation_based: boolean;
  reservation_id?: string;
}

/**
 * Custom hook to fetch detailed information about a completed stock-out
 * 
 * @param stockOutId - The ID of the stock-out to fetch details for
 * @param enabled - Whether the query should run automatically
 * @returns Query result with the completed stock-out details
 */
export const useCompletedStockOutDetails = (stockOutId: string | undefined, enabled = true) => {
  // Use React Query to fetch and cache the data
  return useQuery({
    queryKey: ['completed-stock-out-details', stockOutId],
    queryFn: async () => {
      if (!stockOutId) {
        throw new Error('Stock out ID is required');
      }
      
      try {
        // Step 1: Get the basic stock-out information
        const { data: stockOut, error: stockOutError } = await executeQuery('stock-out-basic', async (supabase) => {
          return await supabase
            .from('stock_out')
            .select(`
              id, reference_number, customer_inquiry_id, status, 
              created_at, processed_at, processed_by, customer_name,
              warehouse_id, notes, destination
            `)
            .eq('id', stockOutId)
            .single();
        });
        
        if (stockOutError) {
          console.warn('Stock out fetch error:', stockOutError);
          throw new Error(`Failed to fetch stock out: ${stockOutError.message || 'Unknown error'}`);
        }
        if (!stockOut) throw new Error('Stock out not found');
        
        // Check if this is a reservation-based stock-out
        let isReservationBased = false;
        let reservationId = null;
        
        if (stockOut.customer_inquiry_id) {
          try {
            const { data: reservations, error: reservationError } = await executeQuery('reservation-check', async (supabase) => {
              return await supabase
                .from('custom_reservations')
                .select('id')
                .eq('inquiry_id', stockOut.customer_inquiry_id);
            });
            
            if (!reservationError && reservations && reservations.length > 0) {
              isReservationBased = true;
              // Use the first reservation ID if multiple exist
              reservationId = reservations[0].id;
            }
          } catch (error) {
            console.warn('Reservation check error:', error);
            // Continue execution even if reservation check fails
            // This is non-critical and shouldn't block the whole process
          }
        }
        
        // Step 2: Get the stock-out details (requested products and quantities)
        const { data: stockOutDetails, error: detailsError } = await executeQuery('stock-out-details', async (supabase) => {
          return await supabase
            .from('stock_out_details')
            .select(`
              id, stock_out_id, product_id, quantity, processed_quantity, barcode
            `)
            .eq('stock_out_id', stockOutId);
        });
        
        if (detailsError) {
          console.warn('Stock out details fetch error:', detailsError);
          throw new Error(`Failed to fetch stock out details: ${detailsError.message || 'Unknown error'}`);
        }
        
        if (!stockOutDetails || stockOutDetails.length === 0) {
          console.warn('No stock out details found for ID:', stockOutId);
        }
        
        // Step 3: Get the processed items (actual items that were processed)
        const { data: processedItems, error: processedError } = await executeQuery('stock-out-processed-items', async (supabase) => {
          return await supabase
            .from('stock_out_processed_items')
            .select(`
              id, stock_out_id, stock_out_detail_id, batch_item_id, 
              product_id, barcode, warehouse_id, location_id,
              quantity, processed_by, processed_at, notes
            `)
            .eq('stock_out_id', stockOutId);
        });
        
        if (processedError) {
          console.warn('Processed items fetch error:', processedError);
          throw new Error(`Failed to fetch processed items: ${processedError.message || 'Unknown error'}`);
        }
        
        if (!processedItems || processedItems.length === 0) {
          console.warn('No processed items found for stock out ID:', stockOutId);
        }
        
        // Step 4: Get additional data for joins
        
        // Get product details
        const productIds = [
          ...new Set([
            ...(stockOutDetails || []).map(detail => detail.product_id),
            ...(processedItems?.map(item => item.product_id) || [])
          ].filter(Boolean))
        ];
        
        let products = [];
        try {
          if (productIds.length > 0) {
            const { data: productsData, error: productsError } = await executeQuery('products-info', async (supabase) => {
              return await supabase
                .from('products')
                .select('id, name, sku, barcode')
                .in('id', productIds);
            });
            
            if (productsError) {
              console.warn('Products fetch error:', productsError);
            } else {
              products = productsData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching products:', error);
          // Continue execution - this is non-critical
        }
        
        // Get user details for processed_by
        const userIds = [...new Set((processedItems || []).map(item => item.processed_by).filter(Boolean))];
        if (stockOut.processed_by) userIds.push(stockOut.processed_by);
        
        let users = [];
        try {
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await executeQuery('users-info', async (supabase) => {
              return await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', userIds);
            });
            
            if (usersError) {
              console.warn('Users fetch error:', usersError);
            } else {
              users = usersData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching users:', error);
          // Continue execution - this is non-critical
        }
        
        // Get warehouse details
        const warehouseIds = [...new Set([
          stockOut.warehouse_id,
          ...(processedItems?.map(item => item.warehouse_id) || [])
        ].filter(Boolean))];
        
        let warehouses = [];
        try {
          if (warehouseIds.length > 0) {
            const { data: warehousesData, error: warehousesError } = await executeQuery('warehouses-info', async (supabase) => {
              return await supabase
                .from('warehouses')
                .select('id, name, code')
                .in('id', warehouseIds);
            });
            
            if (warehousesError) {
              console.warn('Warehouses fetch error:', warehousesError);
            } else {
              warehouses = warehousesData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching warehouses:', error);
          // Continue execution - this is non-critical
        }
        
        // Get location details
        const locationIds = [...new Set((processedItems || []).map(item => item.location_id).filter(Boolean))];
        
        let locations = [];
        try {
          if (locationIds.length > 0) {
            const { data: locationsData, error: locationsError } = await executeQuery('locations-info', async (supabase) => {
              return await supabase
                .from('warehouse_locations')
                .select('id, name, floor, zone, warehouse_id')
                .in('id', locationIds);
            });
            
            if (locationsError) {
              console.warn('Locations fetch error:', locationsError);
            } else {
              locations = locationsData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching locations:', error);
          // Continue execution - this is non-critical
        }
        
        // Get batch item details
        const batchItemIds = [...new Set((processedItems || []).map(item => item.batch_item_id).filter(Boolean))];
        
        let batchItems = [];
        try {
          if (batchItemIds.length > 0) {
            const { data: batchItemsData, error: batchItemsError } = await executeQuery('batch-items-info', async (supabase) => {
              return await supabase
                .from('batch_items')
                .select('id, batch_id, status, color, size')
                .in('id', batchItemIds);
            });
            
            if (batchItemsError) {
              console.warn('Batch items fetch error:', batchItemsError);
            } else {
              batchItems = batchItemsData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching batch items:', error);
          // Continue execution - this is non-critical
        }
        
        // Get inventory details for box codes
        let inventoryItems = [];
        try {
          if (productIds.length > 0) {
            const { data: inventoryItemsData, error: inventoryItemsError } = await executeQuery('inventory-info', async (supabase) => {
              return await supabase
                .from('inventory')
                .select('id, barcode, product_id, location_id')
                .in('product_id', productIds);
            });
            
            if (inventoryItemsError) {
              console.warn('Inventory items fetch error:', inventoryItemsError);
            } else {
              inventoryItems = inventoryItemsData || [];
            }
          }
        } catch (error) {
          console.warn('Error fetching inventory items:', error);
          // Continue execution - this is non-critical
        }
        
        // If reservation-based, get reservation box details
        let reservationBoxes = [];
        if (isReservationBased && reservationId) {
          try {
            const { data: boxes, error: boxesError } = await executeQuery('reservation-boxes', async (supabase) => {
              return await supabase
                .from('custom_reservation_boxes')
                .select('id, box_id, reserved_quantity, total_quantity')
                .eq('reservation_id', reservationId);
            });
            
            if (boxesError) {
              console.warn('Reservation boxes fetch error:', boxesError);
            } else {
              reservationBoxes = boxes || [];
            }
          } catch (error) {
            console.warn('Error fetching reservation boxes:', error);
            // Continue execution - this is non-critical
          }
        }
        
        // Step 5: Create lookup maps for efficient joins
        const productMap = new Map();
        (products || []).forEach(p => productMap.set(p.id, p));
        
        const userMap = new Map();
        (users || []).forEach(u => userMap.set(u.id, u));
        
        const warehouseMap = new Map();
        (warehouses || []).forEach(w => warehouseMap.set(w.id, w));
        
        const locationMap = new Map();
        (locations || []).forEach(l => locationMap.set(l.id, l));
        
        const batchItemMap = new Map();
        (batchItems || []).forEach(b => batchItemMap.set(b.id, b));
        
        const inventoryMap = new Map();
        (inventoryItems || []).forEach(i => {
          // Create a composite key of product_id and barcode
          const key = `${i.product_id}_${i.barcode || ''}`;
          inventoryMap.set(key, i);
        });
        
        const reservationBoxMap = new Map();
        reservationBoxes.forEach(rb => reservationBoxMap.set(rb.box_id, rb));
        
        // Step 6: Enrich the stock-out details with product information
        const enrichedDetails = stockOutDetails.map(detail => {
          const product = productMap.get(detail.product_id) || {};
          
          return {
            ...detail,
            product_name: product.name || 'Unknown Product',
            product_sku: product.sku || 'No SKU'
          };
        });
        
        // Step 7: Enrich the processed items with all the joined information
        const enrichedProcessedItems = (processedItems || []).map(item => {
          const product = productMap.get(item.product_id) || {};
          const user = userMap.get(item.processed_by) || {};
          const warehouse = warehouseMap.get(item.warehouse_id) || {};
          const location = locationMap.get(item.location_id) || {};
          const batchItem = batchItemMap.get(item.batch_item_id) || {};
          
          // Look up inventory item for box code
          const inventoryKey = `${item.product_id}_${item.barcode || ''}`;
          const inventoryItem = inventoryMap.get(inventoryKey) || {};
          
          // Look up reservation info if applicable
          const reservationBox = reservationBoxMap.get(inventoryItem.id) || null;
          
          return {
            ...item,
            product_name: product.name || 'Unknown Product',
            product_sku: product.sku || 'No SKU',
            user_name: user.full_name || 'Unknown User',
            user_role: user.role || 'Staff',
            warehouse_name: warehouse.name || 'Unknown Warehouse',
            location_name: location.name || '',
            floor: location.floor,
            zone: location.zone || '',
            box_code: item.barcode || inventoryItem.barcode || 'N/A',
            color: batchItem.color || '',
            size: batchItem.size || '',
            batch_info: batchItem.id ? {
              id: batchItem.id,
              status: batchItem.status || 'unknown'
            } : undefined,
            reservation_info: reservationBox ? {
              id: reservationBox.id,
              reserved_quantity: reservationBox.reserved_quantity,
              total_quantity: reservationBox.total_quantity
            } : undefined
          };
        });
        
        // Step 8: Build and return the final enriched stock-out object
        const warehouseInfo = warehouseMap.get(stockOut.warehouse_id) || {};
        const processedByUser = userMap.get(stockOut.processed_by) || {};
        
        return {
          ...stockOut,
          warehouse_name: warehouseInfo.name,
          user_name: processedByUser.full_name,
          details: enrichedDetails,
          processed_items: enrichedProcessedItems,
          is_reservation_based: isReservationBased,
          reservation_id: reservationId
        } as CompletedStockOut;
      } catch (error: any) {
        console.error('Error fetching stock-out details:', error);
        toast.error('Failed to load stock-out details');
        throw error;
      }
    },
    enabled: !!stockOutId && enabled
  });
};

export default useCompletedStockOutDetails;
