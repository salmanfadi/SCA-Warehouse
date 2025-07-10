
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ProcessedBatch } from '@/types/batchStockIn';
import { Product, Warehouse, WarehouseLocation, Profile } from '@/types/database';

export const useStockInBatches = (stockInId?: string) => {
  return useQuery({
    queryKey: ['stock-in-batches', stockInId],
    enabled: !!stockInId,
    queryFn: async () => {
      if (!stockInId) return [];

      const { data: batchesData, error } = await supabase
        .from('processed_batches')
        .select(`
          id, 
          product_id, 
          warehouse_id, 
          source, 
          notes,
          status, 
          total_boxes, 
          total_quantity,
          processed_at,
          processed_by,
          products:product_id (id, name, sku),
          warehouses:warehouse_id (id, name, location),
          profiles:processed_by (id, full_name, username)
        `)
        .eq('stock_in_id', stockInId)
        .order('processed_at', { ascending: false });

      if (error) {
        console.error('Error fetching batches:', error);
        throw error;
      }

      // Get all batch items for these batches
      const batchIds = batchesData.map(batch => batch.id);
      
      if (batchIds.length === 0) {
        return [];
      }
      
      const { data: batchItems, error: itemsError } = await supabase
        .from('batch_items')
        .select(`
          id,
          batch_id,
          barcode,
          quantity,
          color,
          size,
          warehouse_id,
          location_id,
          status,
          warehouse_locations:location_id (id, floor, zone)
        `)
        .in('batch_id', batchIds);
        
      if (itemsError) {
        console.error('Error fetching batch items:', itemsError);
        throw itemsError;
      }

      // Group items by batch_id
      const itemsByBatch = batchItems?.reduce((acc, item) => {
        if (!acc[item.batch_id]) {
          acc[item.batch_id] = [];
        }
        acc[item.batch_id].push(item);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Map the data to our ProcessedBatch type with proper type casting
      return batchesData.map(batch => {
        const items = itemsByBatch[batch.id] || [];
        const barcodes = items.map(item => item.barcode);
        const warehouseLocation = items.length > 0 ? items[0].warehouse_locations : null;
        
        return {
          id: batch.id,
          product_id: batch.product_id,
          warehouse_id: batch.warehouse_id,
          location_id: warehouseLocation?.id,
          boxes_count: batch.total_boxes,
          quantity_per_box: batch.total_quantity / batch.total_boxes,
          barcodes,
          created_by: batch.processed_by,
          product: batch.products as unknown as Product,
          warehouse: batch.warehouses as unknown as Warehouse,
          warehouseLocation,
          submitter: batch.profiles as unknown as Profile,
          created_at: batch.processed_at
        } as ProcessedBatch;
      });
    }
  });
};
