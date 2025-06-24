import { useQuery } from '@tanstack/react-query';
import { supabase, executeQuery } from '@/lib/supabase';

export interface LocationDetail {
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  zone: string;
  floor: string;
  quantity: number;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalQuantity: number;
  allLocationDetails?: LocationDetail[];
}

export interface ProcessedBatchesResponse {
  data: InventoryItem[];
  totalCount: number;
}

export function useProcessedBatchesData(
  warehouseFilter: string = '',
  batchFilter: string = '',
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery<ProcessedBatchesResponse, Error>({
    queryKey: ['processedBatches', warehouseFilter, batchFilter, page, pageSize],
    queryFn: () => fetchProcessedBatchesData(warehouseFilter, batchFilter, page, pageSize),
    staleTime: 30000
  });
}

async function fetchProcessedBatchesData(
  warehouseFilter: string,
  batchFilter: string,
  page: number,
  pageSize: number
): Promise<ProcessedBatchesResponse> {
  try {
    // Step 1: First fetch all products to ensure we include products with 0 batches
    const { data: allProductsData, error: allProductsError, count: totalProductCount } = await supabase
      .from('products')
      .select('id, name, sku, category', { count: 'exact' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (allProductsError) {
      console.error('Error fetching products:', allProductsError);
      throw new Error(`Failed to fetch products: ${allProductsError.message}`);
    }

    if (!allProductsData || allProductsData.length === 0) {
      return {
        data: [],
        totalCount: 0
      };
    }

    // Create a map of products by ID for easy lookup
    const productMap: Record<string, any> = {};
    allProductsData.forEach((product: any) => {
      if (product && product.id) {
        productMap[product.id] = {
          ...product,
          totalQuantity: 0,
          allLocationDetails: []
        };
      }
    });

    // Extract all product IDs
    const productIds = Object.keys(productMap);

    // Step 2: Get processed batches data for these products
    let batchQuery = supabase
      .from('processed_batches')
      .select('id, created_at, warehouse_id, location_id, product_id, total_quantity')
      .in('product_id', productIds);

    // Apply filters
    if (warehouseFilter) {
      batchQuery = batchQuery.eq('warehouse_id', warehouseFilter);
    }

    if (batchFilter) {
      batchQuery = batchQuery.ilike('id', `%${batchFilter}%`);
    }

    const { data: batchData, error: batchError } = await batchQuery;

    if (batchError) {
      console.error('Error fetching batch data:', batchError);
      throw new Error(`Failed to fetch batch data: ${batchError.message}`);
    }
    
    // Get all warehouse IDs from the batch data (if any batches exist)
    const warehouseIds = batchData && batchData.length > 0 ? 
      [...new Set(batchData.map((batch: any) => batch.warehouse_id).filter(Boolean))] : 
      [];

    // Fetch warehouse data separately
    let warehouseData: any[] = [];
    
    if (warehouseIds.length > 0) {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .in('id', warehouseIds);
      
      if (error) {
        console.error('Error fetching warehouse data:', error);
      } else {
        warehouseData = data || [];
      }
    }

    // Create warehouse lookup map
    const warehouseMap: Record<string, any> = {};
    warehouseData.forEach((warehouse: any) => {
      if (warehouse && warehouse.id) {
        warehouseMap[warehouse.id] = warehouse;
      }
    });

    // Get all location IDs from the batch data (if any batches exist)
    const locationIds = batchData && batchData.length > 0 ?
      [...new Set(batchData.map((batch: any) => batch.location_id).filter(Boolean))] :
      [];
    
    // Fetch location data separately
    let locationData: any[] = [];
    
    if (locationIds.length > 0) {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, zone, floor')
        .in('id', locationIds);
      
      if (error) {
        console.error('Error fetching location data:', error);
      } else {
        locationData = data || [];
      }
    }

    // Create location lookup map
    const locationMap: Record<string, any> = {};
    locationData.forEach((location: any) => {
      if (location && location.id) {
        locationMap[location.id] = location;
      }
    });

    // Process each batch and update the product map with location details
    if (batchData && batchData.length > 0) {
      batchData.forEach((batch: any) => {
        if (!batch.product_id) return;
        
        // Get warehouse and location info
        const warehouseId = batch.warehouse_id || '';
        const warehouse = warehouseMap[warehouseId] || {};
        const warehouseName = warehouse.name || `Warehouse ${warehouseId}`;
        
        const locationId = batch.location_id || '';
        const location = locationMap[locationId] || {};
        const zone = location.zone || 'N/A';
        const floor = location.floor || 'N/A';
        
        const productId = batch.product_id;
        const quantity = batch.total_quantity || 0;

        // Create location detail
        const locationDetail: LocationDetail = {
          warehouseId,
          warehouseName,
          locationId,
          zone,
          floor,
          quantity
        };
        
        // Update the product in our product map
        if (productMap[productId]) {
          productMap[productId].totalQuantity += quantity;
          if (!productMap[productId].allLocationDetails) {
            productMap[productId].allLocationDetails = [];
          }
          productMap[productId].allLocationDetails.push(locationDetail);
        }
      });
    }

    // Convert the product map to inventory items
    const inventoryItems: InventoryItem[] = Object.values(productMap).map((product: any) => ({
      productId: product.id,
      productName: product.name || 'Unknown Product',
      sku: product.sku || '',
      category: product.category || 'Uncategorized',
      totalQuantity: product.totalQuantity || 0,
      allLocationDetails: product.allLocationDetails || []
    }));

    return {
      data: inventoryItems,
      totalCount: totalProductCount || 0
    };
  } catch (error) {
    console.error('Failed to fetch processed batches:', error);
    throw error;
  }
}