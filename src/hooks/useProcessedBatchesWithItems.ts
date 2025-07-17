import { useQuery, type QueryObserverResult } from "@tanstack/react-query";
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { supabase } from "@/lib/supabase";

type SupabaseQueryBuilder = PostgrestFilterBuilder<any, any, any>;
type ProcessedBatchStatus = "processing" | "completed" | "failed" | "cancelled";

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
  product_id?: string;
  stock_in_id?: string;
  status: ProcessedBatchStatus;
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

interface ProcessedBatchWithRelations {
  id: string;
  product_id: string | null;
  stock_in_id: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  warehouse_id: string | null;
  location_id: string | null;
  total_quantity: number | null;
  total_boxes: number | null;
  processed_by: string | null;
  processed_at: string | null;
  products: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
  batch_items: Array<{
    id: string;
    barcode: string;
    quantity: number | null;
    color: string | null;
    size: string | null;
    status: string;
    warehouse_id: string | null;
    location_id: string | null;
  }>;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
}

async function fetchProcessedBatches({
  limit = 10,
  status,
  productId,
  sortBy = 'processed_at',
  sortOrder = 'desc',
  searchTerm,
  warehouseId,
  page = 1,
}: UseProcessedBatchesWithItemsProps = {}): Promise<ProcessedBatchesResult> {
  try {
    // Calculate pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // First, get the count of batches for pagination
    let countQuery = supabase
      .from('processed_batches')
      .select('*', { count: 'exact', head: true });
    
    if (status) countQuery = countQuery.eq('status', status);
    if (productId) countQuery = countQuery.eq('product_id', productId);
    if (warehouseId) countQuery = countQuery.eq('warehouse_id', warehouseId);
    
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      throw new Error(`Error counting batches: ${countError.message}`);
    }
    
    // Build the base query
    let query = supabase
      .from('processed_batches')
      .select(`
        id, 
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
        products:product_id (id, name, sku),
        batch_items!inner(
          id,
          barcode,
          quantity,
          color,
          size,
          status,
          warehouse_id,
          location_id
        ),
        profiles:processed_by (id, full_name)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(from, to);

    // Execute the query
    const { data: batchesData, error: batchesError } = await query as unknown as {
      data: ProcessedBatchWithRelations[] | null;
      error: Error | null;
    };

    if (batchesError) {
      throw new Error(`Error fetching batches: ${batchesError.message}`);
    }

    // Transform the data to match the expected format
    const batchesWithItems = (batchesData || []).map(batch => {
      const createdAt = batch.processed_at || new Date().toISOString();
      const processorName = batch.profiles?.full_name || '';
      
      // Get warehouse and location details from the first item if available
      const firstItem = batch.batch_items?.[0];
      let warehouseName = '';
      let locationDetails = '';
      
      if (firstItem) {
        warehouseName = firstItem.warehouse_id || '';
        locationDetails = firstItem.location_id || '';
      }

      return {
        id: batch.id,
        product_id: batch.product_id || undefined,
        stock_in_id: batch.stock_in_id || undefined,
        status: batch.status as ProcessedBatchStatus,
        created_at: createdAt,
        totalBoxes: batch.total_boxes || 0,
        totalQuantity: batch.total_quantity || 0,
        processorName,
        source: batch.source || undefined,
        notes: batch.notes || undefined,
        warehouseName,
        locationDetails,
        createdAt,
        progress: {
          percentage: batch.status === 'completed' ? 100 : 50,
          status: batch.status
        },
        product: batch.products ? {
          id: batch.products.id,
          name: batch.products.name,
          sku: batch.products.sku || undefined
        } : undefined,
        items: (batch.batch_items || []).map(item => ({
          id: item.id,
          barcode: item.barcode,
          quantity: item.quantity || 0,
          color: item.color || undefined,
          size: item.size || undefined,
          status: item.status,
          warehouse_id: item.warehouse_id || undefined,
          location_id: item.location_id || undefined,
          warehouseName: '',
          locationDetails: ''
        }))
      };
    });

    // Apply search filter if provided
    let filteredBatches = batchesWithItems;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredBatches = batchesWithItems.filter(batch => 
        (batch.product?.name?.toLowerCase().includes(searchLower)) ||
        (batch.source?.toLowerCase().includes(searchLower)) ||
        (batch.notes?.toLowerCase().includes(searchLower))
      );
    }

    return {
      batches: filteredBatches,
      count: count || 0
    };
  } catch (error) {
    console.error('Error in fetchProcessedBatches:', error);
    throw error;
  }
}

export function useProcessedBatchesWithItems(
  props: UseProcessedBatchesWithItemsProps = {}
): QueryObserverResult<ProcessedBatchesResult, Error> {
  const { 
    limit = 10, 
    status, 
    productId, 
    sortBy = 'processed_at', 
    sortOrder = 'desc', 
    searchTerm, 
    warehouseId, 
    page = 1 
  } = props;

  return useQuery<ProcessedBatchesResult, Error>({
    queryKey: [
      'processedBatches', 
      { 
        limit, 
        status, 
        productId, 
        sortBy, 
        sortOrder, 
        searchTerm, 
        warehouseId, 
        page 
      }
    ],
    queryFn: () => fetchProcessedBatches({
      limit,
      status,
      productId,
      sortBy,
      sortOrder,
      searchTerm,
      warehouseId,
      page
    }),
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    staleTime: 30 * 1000, // 30 seconds before refetching
  });
}
