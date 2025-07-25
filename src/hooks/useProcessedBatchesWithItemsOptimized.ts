import { useQuery, type QueryObserverResult } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ProcessedBatchItemType {
  id: string;
  barcode: string;
  batch_id?: string; 
  warehouse_id?: string;
  location_id?: string;
  quantity: number;
  color?: string;
  size?: string;
  status: string;
  warehouseName?: string;
  locationDetails?: string;
  created_at?: string;
}

export interface ProcessedBatchWithItems {
  id: string;
  sno: number | null; // Serial number field - required but can be null
  product_id?: string;
  stock_in_id?: string;
  status: "processing" | "completed" | "failed" | "cancelled";
  created_at: string;
  totalBoxes: number;
  totalQuantity: number;
  processorName?: string; 
  source?: string;
  notes?: string;
  warehouseName?: string;
  locationDetails?: string;
  createdAt: string;
  progress: {
    percentage: number;
    status: string;
  };
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  items: ProcessedBatchItemType[];
}

export interface UseProcessedBatchesWithItemsProps {
  limit?: number;
  status?: string;
  productId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
  warehouseId?: string;
  page?: number;
}

export interface ProcessedBatchesResult {
  batches: ProcessedBatchWithItems[];
  count: number;
}

export function useProcessedBatchesWithItemsOptimized({
  limit = 10,
  status,
  productId,
  sortBy = 'processed_at',
  sortOrder = 'desc',
  searchTerm,
  warehouseId,
  page = 1,
}: UseProcessedBatchesWithItemsProps = {}): QueryObserverResult<ProcessedBatchesResult, Error> {
  return useQuery({
    queryKey: ['processedBatchesOptimized', { limit, status, productId, sortBy, sortOrder, searchTerm, warehouseId, page }],
    queryFn: async () => {
      try {
        // Get processed batches with all related data in a single optimized query
        let query = supabase
          .from('processed_batches')
          .select(`
            id, 
            sno, 
            product_id, 
            stock_in_id, 
            status, 
            source, 
            notes, 
            warehouse_id, 
            location_id, 
            total_quantity, 
            total_boxes, 
            processed_by, 
            processed_at,
            products:product_id (
              id,
              name,
              sku
            ),
            warehouses:warehouse_id (
              id,
              name
            ),
            warehouse_locations:location_id (
              id,
              floor,
              zone
            ),
            profiles:processed_by (
              id,
              full_name
            )
          `)
          .order(sortBy, { ascending: sortOrder === 'asc' });

        if (status) {
          query = query.eq('status', status);
        }

        if (productId) {
          query = query.eq('product_id', productId);
        }

        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }

        // Add pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: batchesData, error: batchesError, count } = await query;

        if (batchesError) {
          throw new Error(`Error fetching batches: ${batchesError.message}`);
        }
        
        // Debug: Log the raw batches data to check serial numbers
        console.log('Raw batches data from DB (Optimized):', batchesData?.map(b => ({ id: b.id, sno: b.sno })));

        // Get all batch IDs for efficient batch items query
        const batchIds = (batchesData || []).map(batch => batch.id);
        
        // Fetch all items for all batches in a single optimized query with joins
        let itemsData: any[] = [];
        if (batchIds.length > 0) {
          const { data: allItemsData, error: allItemsError } = await supabase
            .from('batch_items')
            .select(`
              id,
              barcode,
              quantity,
              color,
              size,
              status,
              warehouse_id,
              location_id,
              batch_id,
              warehouses:warehouse_id (
                id,
                name
              ),
              warehouse_locations:location_id (
                id,
                floor,
                zone
              )
            `)
            .in('batch_id', batchIds);
            
          if (allItemsError) {
            console.error('Error fetching batch items:', allItemsError);
          } else {
            itemsData = allItemsData || [];
          }
        }
        
        // Group items by batch_id for faster access
        const itemsByBatchId = itemsData.reduce((acc, item) => {
          if (!acc[item.batch_id]) {
            acc[item.batch_id] = [];
          }
          acc[item.batch_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Process all batches efficiently with pre-joined data
        const batchesWithItems: ProcessedBatchWithItems[] = (batchesData || []).map((batch) => {
          // Use processed_at as created_at since that's what we have
          const createdAt = batch.processed_at || new Date().toISOString();
          
          // Get batch items from the pre-fetched and grouped data
          const batchItemsData = itemsByBatchId[batch.id] || [];

          // Get processor name from the joined data  
          const processorName = (batch.profiles as any)?.full_name;

          // Get location details from the joined data
          const locationDetails = batch.warehouse_locations 
            ? `Floor ${(batch.warehouse_locations as any).floor || 'N/A'}, Zone ${(batch.warehouse_locations as any).zone || 'N/A'}`
            : undefined;

          // Get warehouse name from the joined data
          const warehouseName = (batch.warehouses as any)?.name;

          // Process items with pre-joined warehouse and location info
          const processedItems: ProcessedBatchItemType[] = batchItemsData.map((item) => {
            // Get location details from the joined item data
            const itemLocationDetails = item.warehouse_locations 
              ? `Floor ${item.warehouse_locations.floor || 'N/A'}, Zone ${item.warehouse_locations.zone || 'N/A'}`
              : 'No location details';
              
            return {
              id: item.id,
              barcode: item.barcode || `BATCH-${item.id.substring(0, 8)}`,
              batch_id: item.batch_id,
              warehouse_id: item.warehouse_id,
              location_id: item.location_id,
              quantity: item.quantity || 0,
              color: item.color,
              size: item.size,
              status: item.status || 'unknown',
              warehouseName: item.warehouses?.name,
              locationDetails: itemLocationDetails,
              created_at: createdAt
            };
          });

          // Ensure sno is properly handled - explicitly convert to number if it exists
          let serialNumber: number | null = null;
          
          if (batch.sno !== null && batch.sno !== undefined) {
            // Force conversion to number if it's a string or other type
            serialNumber = typeof batch.sno === 'number' ? batch.sno : Number(batch.sno);
            
            // If conversion resulted in NaN, set to null
            if (isNaN(serialNumber)) {
              serialNumber = null;
            }
          }
          
          // Debug: Log the serial number for this batch
          console.log(`Batch ${batch.id} serial number (Optimized):`, {
            raw: batch.sno,
            processed: serialNumber,
            type: typeof batch.sno,
            afterConversion: typeof serialNumber
          });
          
          return {
            id: batch.id,
            sno: serialNumber,
            product_id: batch.product_id,
            stock_in_id: batch.stock_in_id,
            status: batch.status as ProcessedBatchWithItems['status'],
            created_at: createdAt,
            totalBoxes: batch.total_boxes || 0,
            totalQuantity: batch.total_quantity || 0,
            processorName,
            source: batch.source,
            notes: batch.notes,
            warehouseName,
            locationDetails,
            createdAt: createdAt,
            progress: {
              percentage: batch.status === 'completed' ? 100 : 0,
              status: batch.status
            },
            product: batch.products ? {
              id: (batch.products as any).id,
              name: (batch.products as any).name,
              sku: (batch.products as any).sku
            } : undefined,
            items: processedItems
          };
        });

        // Apply search filter if provided
        let filteredBatches = batchesWithItems;
        if (searchTerm) {
          filteredBatches = batchesWithItems.filter(batch => 
            batch.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            batch.warehouseName?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        return {
          batches: filteredBatches,
          count: count || 0
        };
      } catch (error) {
        console.error('Error in useProcessedBatchesWithItemsOptimized:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });
} 