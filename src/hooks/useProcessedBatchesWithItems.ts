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

export function useProcessedBatchesWithItems({
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
    queryKey: ['processedBatches', { limit, status, productId, sortBy, sortOrder, searchTerm, warehouseId, page }],
    queryFn: async () => {
      try {
        // First, get processed batches with product and warehouse info
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
        console.log('Raw batches data from DB:', batchesData?.map(b => ({ id: b.id, sno: b.sno })));

        // For each batch, get its items from batch_items - using a more efficient approach
        // Get all batch IDs first
        const batchIds = (batchesData || []).map(batch => batch.id);
        
        // Fetch all items for all batches in a single query with an 'in' filter
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
            batch_id
          `)
          .in('batch_id', batchIds);
          
        if (allItemsError) {
          console.error('Error fetching batch items:', allItemsError);
        }
        
        // Group items by batch_id for faster access
        const itemsByBatchId = (allItemsData || []).reduce((acc, item) => {
          if (!acc[item.batch_id]) {
            acc[item.batch_id] = [];
          }
          acc[item.batch_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);
        
        // For each batch, process its items
        const batchesWithItems = await Promise.all(
          (batchesData || []).map(async (batch) => {
            // Use processed_at as created_at since that's what we have
            const createdAt = batch.processed_at || new Date().toISOString();
            
            // Get batch items from the pre-fetched and grouped data
            const itemsData = itemsByBatchId[batch.id] || [];

            // Get processor name if available
            let processorName = undefined;
            if (batch.processed_by) {
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', batch.processed_by)
                .single();
              
              // Type assertion to handle the response properly
              if (userData && typeof userData === 'object' && userData !== null) {
                processorName = (userData as { full_name?: string }).full_name;
              }
            }

            // Get location details if available
            let locationDetails = undefined;
            if (batch.location_id) {
              const { data: locationData } = await supabase
                .from('warehouse_locations')
                .select('zone, floor')
                .eq('id', batch.location_id)
                .single();

              if (locationData) {
                locationDetails = `Floor ${locationData.floor}, Zone ${locationData.zone}`;
              }
            }

            // Get warehouse name if available
            let warehouseName = undefined;
            if (batch.warehouse_id) {
              const { data: warehouseData } = await supabase
                .from('warehouses')
                .select('name')
                .eq('id', batch.warehouse_id)
                .single();
              if (warehouseData) {
                warehouseName = warehouseData.name;
              }
            }

            // Process items with warehouse and location info
            const processedItems = await Promise.all(
              (itemsData || []).map(async (item) => {
                let itemLocationDetails = undefined;

                // Get location details
                if (item.location_id) {
                  const { data: locationData } = await supabase
                    .from('warehouse_locations')
                    .select('zone, floor')
                    .eq('id', item.location_id)
                    .single();

                  if (locationData) {
                    itemLocationDetails = `Floor ${locationData.floor}, Zone ${locationData.zone}`;
                  }
                }

                return {
                  ...item,
                  warehouseName,
                  locationDetails: itemLocationDetails,
                  created_at: createdAt
                } as ProcessedBatchItemType;
              })
            );

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
            console.log(`Batch ${batch.id} serial number:`, {
              raw: batch.sno,
              processed: serialNumber,
              type: typeof batch.sno,
              afterConversion: typeof serialNumber
            });
            
            return {
              id: batch.id,
              sno: serialNumber, // Include serial number with proper handling
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
                id: batch.products.id,
                name: batch.products.name,
                sku: batch.products.sku
              } : undefined,
              items: processedItems
            } as ProcessedBatchWithItems;
          })
        );

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
        console.error('Error in useProcessedBatchesWithItems:', error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute - increased to reduce refetches
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetching when window regains focus for better performance
  });
}
