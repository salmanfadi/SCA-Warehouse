import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export type BoxItemType = {
  id: string;
  stock_in_id: string;
  barcode: string;
  quantity: number;
  color: string | null;
  size: string | null;
  warehouse_id: string | null;
  location_id: string | null;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_description: string | null;
  warehouse_name: string | null;
  zone: string | null;
  floor: number | null;
  position: string | null;
};

export type BatchItemType = {
  id: string;
  barcode: string;
  quantity: number;
  color: string | null;
  size: string | null;
  status: string;
  created_at?: string;
  warehouse_id?: string | null;
  location_id?: string | null;
  warehouses?: {
    id: string;
    name: string;
    zone: string | null;
    floor: number | null;
    position: string | null;
  };
  locations?: {
    floor: number;
    zone: string;
  };
};

export interface ProcessedBatchType {
  id: string;
  product_id: string;
  submitted_by: string;
  processed_by: string;
  boxes: number;
  status: 'completed' | 'rejected' | string;
  source: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  product_name: string;
  product_sku: string;
  submitter_name: string;
  processor_name: string;
  total_quantity: number;
  warehouse_id?: string;
  location_id?: string;
  warehouse_name?: string;
  items?: BatchItemType[];
  location_details?: {
    floor?: number;
    zone?: string;
    position?: string;
  };
  locationDetails?: string;
}

interface ProcessedBatchesFilters {
  searchTerm?: string;
  warehouse_id?: string;
  location_id?: string;
  fromDate?: Date;
  toDate?: Date;
}

const fetchProcessedBatches = async (
  page = 1,
  pageSize = 10,
  filters: ProcessedBatchesFilters = {}
): Promise<{
  data: ProcessedBatchType[];
  count: number;
}> => {
  try {
    // 1. Get the total count (without range or joins)
    let countQuery = supabase
      .from('processed_batches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');
    if (filters.warehouse_id) {
      countQuery = countQuery.eq('warehouse_id', filters.warehouse_id);
    }
    if (filters.fromDate) {
      countQuery = countQuery.gte('processed_at', filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      countQuery = countQuery.lte('processed_at', toDate.toISOString());
    }
    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throw countError;

    // 2. Get the paginated data with joins
    let dataQuery = supabase
      .from('processed_batches')
      .select(`
        id,
        product_id,
        processed_by,
        total_boxes,
        status,
        source,
        notes,
        processed_at,
        total_quantity,
        warehouse_id,
        products:product_id (
          name,
          sku
        )
      `)
      .eq('status', 'completed')
      .order('processed_at', { ascending: false });
    if (filters.warehouse_id) {
      dataQuery = dataQuery.eq('warehouse_id', filters.warehouse_id);
    }
    if (filters.fromDate) {
      dataQuery = dataQuery.gte('processed_at', filters.fromDate.toISOString());
    }
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      dataQuery = dataQuery.lte('processed_at', toDate.toISOString());
    }
    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    dataQuery = dataQuery.range(from, to);
    const { data, error } = await dataQuery;
    if (error) throw error;

    // Transform the data
    const processedData = data ? await Promise.all(data.map(async (item: any) => {
      // Get processor name if available
      let processorName = "Unknown";
      if (item.processed_by) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', item.processed_by)
            .maybeSingle();
          
          // Type assertion to handle the response properly
          if (profileData && typeof profileData === 'object' && profileData !== null) {
            processorName = (profileData as { full_name?: string }).full_name || "Unknown";
          }
        } catch (error) {
          console.error("Error getting processor name:", error);
        }
      }

      // Get warehouse name if available
      let warehouseName = "Unknown";
      if (item.warehouse_id) {
        try {
          const { data: warehouseData } = await supabase
            .from('warehouses')
            .select('name')
            .eq('id', item.warehouse_id)
            .single();
          
          if (warehouseData) {
            warehouseName = warehouseData.name;
          }
        } catch (error) {
          console.error("Error getting warehouse name:", error);
        }
      }

      return {
        id: item.id || '',
        product_id: item.product_id || '',
        submitted_by: item.processed_by || '', // Using processed_by as submitted_by
        processed_by: item.processed_by || '',
        boxes: item.total_boxes || 0,
        status: item.status || 'completed',
        source: item.source || '',
        notes: item.notes || '',
        created_at: item.processed_at || new Date().toISOString(),
        completed_at: item.status === 'completed' ? item.processed_at : null,
        product_name: item.products?.name || 'Unknown Product',
        product_sku: item.products?.sku || '',
        submitter_name: processorName,
        processor_name: processorName,
        total_quantity: item.total_quantity || 0,
        warehouse_id: item.warehouse_id || undefined,
        warehouse_name: warehouseName,
      };
    })) : [];

    return {
      data: processedData,
      count: totalCount || 0,
    };
  } catch (error) {
    console.error('Error fetching processed batches:', error);
    throw error;
  }
};

export const fetchBatchDetails = async (batchId: string | null): Promise<ProcessedBatchType | null> => {
  if (!batchId) return null;
  
  try {
    // First get the processed batch details
    const { data, error } = await supabase
      .from('processed_batches')
      .select(`
        id,
        product_id,
        processed_by,
        total_boxes,
        status,
        source,
        notes,
        processed_at,
        total_quantity,
        warehouse_id,
        location_id,
        products:product_id (
          name,
          sku,
          description
        ),
        processor:processed_by (full_name),
        warehouses:warehouse_id (name)
      `)
      .eq('id', batchId)
      .single();
      
    // Then get the batch items with their barcodes
    const { data: batchItemsData, error: batchItemsError } = await supabase
      .from('batch_items')
      .select(`
        id,
        barcode,
        quantity,
        color,
        size,
        status,
        created_at,
        warehouse_id,
        location_id
      `)
      .eq('batch_id', batchId);

    if (error) throw error;
    if (batchItemsError) {
      console.error("Error fetching batch items:", batchItemsError);
    }
    if (!data) return null;
    
    // Get processor name if available
    let processorName = "Unknown";
    if (data.processed_by) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.processed_by)
          .maybeSingle();
        
        // Type assertion to handle the response properly
        if (profileData && typeof profileData === 'object' && profileData !== null) {
          processorName = (profileData as { full_name?: string }).full_name || "Unknown";
        }
      } catch (error) {
        console.error("Error getting processor name:", error);
        // Continue execution even if we can't get the processor name
      }
    }

    // Get warehouse details if it exists
    let warehouseName = null;
    let locationDetails = {};

    if (data.warehouse_id) {
      try {
        const { data: warehouseData } = await supabase
          .from('warehouses')
          .select('name')
          .eq('id', data.warehouse_id)
          .single();

        if (warehouseData) {
          warehouseName = warehouseData.name;
        }
      } catch (error) {
        console.error("Error getting warehouse details:", error);
        // Continue execution even if we can't get the warehouse details
      }
    }

    // Get location details if available
    let locationName = "Unknown";
    if (data.location_id) {
      try {
        const { data: locationData } = await supabase
          .from('warehouse_locations')
          .select('floor, zone')
          .eq('id', data.location_id)
          .single();
          
        if (locationData) {
          locationName = `Floor ${locationData.floor || '?'} - Zone ${locationData.zone || '?'}`;
        }
      } catch (error) {
        console.error("Error getting location details:", error);
      }
    }
    
    return {
      id: data.id,
      product_id: data.product_id,
      submitted_by: data.processed_by, // Using processed_by as submitted_by if not available
      processed_by: data.processed_by,
      boxes: data.total_boxes || 0,
      status: data.status,
      source: data.source,
      notes: data.notes,
      created_at: data.processed_at,
      completed_at: data.status === 'completed' ? data.processed_at : null,
      product_name: data.products?.name || 'Unknown Product',
      product_sku: data.products?.sku || '',
      submitter_name: processorName,
      processor_name: processorName,
      total_quantity: data.total_quantity || 0,
      warehouse_id: data.warehouse_id || undefined,
      warehouse_name: warehouseName,
      location_id: data.location_id,
      locationDetails: locationName,
      items: batchItemsData?.map((item: any) => ({
        id: item.id,
        barcode: item.barcode || `BATCH-${data.id}-${item.id}`,
        quantity: item.quantity || 0,
        color: item.color || null,
        size: item.size || null,
        status: item.status || 'available',
        created_at: item.created_at || new Date().toISOString(),
        warehouse_id: item.warehouse_id || null,
        location_id: item.location_id || null,
      })) || [],
    };
  } catch (error) {
    console.error('Error fetching batch details:', error);
    throw error;
  }
};

interface BatchItemRow {
  id?: string;
  quantity?: number | null;
  color?: string | null;
  size?: string | null;
  warehouse_id?: string | null;
  location_id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

const fetchBatchItems = async (batchId: string): Promise<BatchItemType[]> => {
  try {
    // Query the database for batch items
    const { data, error } = await supabase
      .from('batch_items')
      .select('*')
      .eq('batch_id', batchId);

    if (error) {
      console.error('Error fetching batch items:', error);
      return [];
    }

    if (!Array.isArray(data)) {
      return [];
    }

    // Transform the data to match BatchItemType
    return data.map((item: BatchItemRow) => {
      // Generate a unique ID if not present
      const itemId = item.id || `item-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        id: itemId,
        barcode: `BATCH-${batchId}-${itemId}`,
        quantity: item.quantity ? Number(item.quantity) : 0,
        color: item.color || null,
        size: item.size || null,
        status: item.status?.toString() || 'available',
        created_at: item.created_at || new Date().toISOString(),
        warehouse_id: item.warehouse_id?.toString() || null,
        location_id: item.location_id?.toString() || null,
      };
    });
  } catch (error) {
    console.error('Error fetching batch items:', error);
    return [];
  }
};

export const useProcessedBatches = (
  page: number = 1,
  pageSize: number = 10,
  filters: ProcessedBatchesFilters = {}
) => {
  const [currentPageSize, setCurrentPageSize] = useState<number>(pageSize);

  const query = useQuery({
    queryKey: ['processedBatches', page, currentPageSize, filters],
    queryFn: () => fetchProcessedBatches(page, currentPageSize, filters),
    refetchInterval: 5000,
  });

  const setPageSize = (newSize: number) => {
    setCurrentPageSize(newSize);
  };

  return {
    ...query,
    pageSize: currentPageSize,
    setPageSize,
  };
};

export const useBatchDetails = (batchId: string | undefined) => {
  return useQuery({
    queryKey: ['batchDetails', batchId],
    queryFn: () => (batchId ? fetchBatchDetails(batchId) : null),
    enabled: !!batchId,
  });
};

export const useBatchItems = (batchId: string | undefined) => {
  const query = useQuery({
    queryKey: ['batchItems', batchId],
    queryFn: () => (batchId ? fetchBatchItems(batchId) : []),
    enabled: !!batchId,
  });

  return query;
};

export const useProcessedBatchDetails = (batchId: string | null) => {
  return useQuery({
    queryKey: ['processedBatchDetails', batchId],
    queryFn: () => fetchBatchDetails(batchId),
    enabled: !!batchId,
  });
};
