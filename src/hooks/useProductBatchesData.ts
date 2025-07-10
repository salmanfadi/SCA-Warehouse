
import { useQuery } from '@tanstack/react-query';
import { supabase, executeQuery } from '@/lib/supabase';

export interface BatchDetail {
  batchId: string;
  quantity: number;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  zone: string;
  floor: string;
  createdAt: string;
}

export interface ProductWithBatches {
  productId: string;
  productName: string;
  sku: string;
  categories: string[];
  hsnCode: string;
  gstRate?: number;
  totalQuantity: number; // Total quantity across all batches
  totalProductCount: number; // Total product count (batches * boxes * quantity)
  batchCount: number; // Number of batches
  batches?: BatchDetail[];
}

export interface ProductBatchesResponse {
  data: ProductWithBatches[];
  totalCount: number;
}

export function useProductBatchesData(
  page: number = 1,
  pageSize: number = 20,
  searchQuery: string = ''
) {
  return useQuery<ProductBatchesResponse, Error>({
    queryKey: ['productBatches', page, pageSize, searchQuery],
    queryFn: () => fetchProductBatchesData(page, pageSize, searchQuery),
    staleTime: 30000
  });
}

async function fetchProductBatchesData(
  page: number,
  pageSize: number,
  searchQuery: string
): Promise<ProductBatchesResponse> {
  try {
    // First, we need to get all product IDs with their stock status to sort them properly
    // This query will get all product IDs and their associated batch quantities
    const { data: productStockData, error: stockError } = await supabase
      .from('processed_batches')
      .select('product_id, total_quantity')
      .order('total_quantity', { ascending: false });
    
    if (stockError) {
      console.error('Error fetching product stock data:', stockError);
      throw new Error(`Failed to fetch product stock data: ${stockError.message}`);
    }
    
    // Create a map of product IDs to their total quantity
    const productQuantityMap: Record<string, number> = {};
    productStockData?.forEach((item: any) => {
      const productId = item.product_id;
      if (productId) {
        productQuantityMap[productId] = (productQuantityMap[productId] || 0) + Number(item.total_quantity || 0);
      }
    });
    
    // Get all product IDs sorted by their stock status (in-stock first)
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, name, sku, categories, hsn_code');
      
    if (allProductsError) {
      console.error('Error fetching all products:', allProductsError);
      throw new Error(`Failed to fetch all products: ${allProductsError.message}`);
    }
    
    // Sort products by stock status (in-stock first)
    const sortedProducts = (allProducts || []).sort((a: any, b: any) => {
      const aQuantity = productQuantityMap[a.id] || 0;
      const bQuantity = productQuantityMap[b.id] || 0;
      
      // First sort by stock status (in stock first)
      if (aQuantity > 0 && bQuantity <= 0) return -1;
      if (aQuantity <= 0 && bQuantity > 0) return 1;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
    
    // Apply search filter if provided
    let filteredProducts = sortedProducts;
    if (searchQuery) {
      filteredProducts = sortedProducts.filter((product: any) => {
        return (
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.hsn_code?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }
    
    // Calculate total count
    const totalProductCount = filteredProducts.length;
    
    // Apply pagination
    const from = Math.max(0, (page - 1) * pageSize);
    const to = Math.min(from + pageSize, filteredProducts.length);
    const paginatedProducts = filteredProducts.slice(from, to);
    
    // Use the paginated products as our product data
    const productsData = paginatedProducts;
    
    if (!productsData || productsData.length === 0) {
      return {
        data: [],
        totalCount: totalProductCount || 0
      };
    }
    
    // Step 2: Get all product IDs
    const productIds = productsData.map((product: any) => product.id);
    
    // Step 3: Fetch all batches for these products from processed_batches table
    const { data: batchesData, error: batchesError } = await supabase
      .from('processed_batches')
      .select('id, created_at, product_id, warehouse_id, location_id, total_quantity')
      .in('product_id', productIds);
      
    // Step 3.5: Fetch batch items to calculate accurate product counts
    let batchItemsData: any[] = [];
    if (batchesData && batchesData.length > 0) {
      const batchIds = batchesData.map((batch: any) => batch.id);
      const { data: batchItems, error: batchItemsError } = await supabase
        .from('batch_items')
        .select('id, batch_id, quantity')
        .in('batch_id', batchIds);
        
      if (batchItemsError) {
        console.error('Error fetching batch items:', batchItemsError);
        throw new Error(`Failed to fetch batch items: ${batchItemsError.message}`);
      }
      
      batchItemsData = batchItems || [];
    }
    
    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      throw new Error(`Failed to fetch batches: ${batchesError.message}`);
    }
    
    // Step 4: Fetch warehouse details for these batches
    const warehouseIds = [...new Set(batchesData.map((batch: any) => batch.warehouse_id).filter(Boolean))];
    let warehousesData: any[] = [];
    
    if (warehouseIds.length > 0) {
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name')
        .in('id', warehouseIds);
      
      if (warehousesError) {
        console.error('Error fetching warehouses:', warehousesError);
        throw new Error(`Failed to fetch warehouses: ${warehousesError.message}`);
      }
      
      warehousesData = warehouses || [];
    }
    
    // Step 5: Fetch location details for these batches
    const locationIds = [...new Set(batchesData.map((batch: any) => batch.location_id).filter(Boolean))];
    let locationsData: any[] = [];
    
    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from('warehouse_locations')
        .select('id, floor, zone')
        .in('id', locationIds);
      
      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        throw new Error(`Failed to fetch locations: ${locationsError.message}`);
      }
      
      locationsData = locations || [];
    }
    
    // Create lookup maps
    const warehouseMap: Record<string, any> = {};
    warehousesData.forEach((warehouse: any) => {
      if (warehouse && warehouse.id) {
        warehouseMap[warehouse.id] = warehouse;
      }
    });
    
    const locationMap: Record<string, any> = {};
    locationsData.forEach((location: any) => {
      if (location && location.id) {
        locationMap[location.id] = location;
      }
    });
    
    // Process the data to build the product batches response
    const productBatches: ProductWithBatches[] = productsData.map((product: any) => {
      // Find all batches for this product
      const productBatchesData = (batchesData || []).filter((batch: any) => batch.product_id === product.id);
      
      // Calculate total quantity across all batches
      const totalQuantity = productBatchesData.reduce((sum: number, batch: any) => sum + (Number(batch.total_quantity) || 0), 0);
      
      // Calculate total product count (batches * boxes * quantity)
      let totalProductCount = 0;
      let batchCount = productBatchesData.length;
      
      // For each batch, find its batch items and sum up the quantities
      productBatchesData.forEach((batch: any) => {
        const batchItems = batchItemsData.filter((item: any) => item.batch_id === batch.id);
        const batchItemCount = batchItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        totalProductCount += batchItemCount > 0 ? batchItemCount : Number(batch.total_quantity) || 0;
      });
      
      // If no batch items found but we have batches, use total_quantity as fallback
      if (totalProductCount === 0 && totalQuantity > 0) {
        totalProductCount = totalQuantity;
      }
      
      // Format batch details
      const batches: BatchDetail[] = productBatchesData.map((batch: any) => {
        const warehouseId = batch.warehouse_id || '';
        const warehouse = warehouseMap[warehouseId] || {};
        const warehouseName = warehouse.name || `Warehouse ${warehouseId.substring(0, 8)}`;
        
        const locationId = batch.location_id || '';
        const location = locationMap[locationId] || {};
        const locationName = `Location ${locationId.substring(0, 8)}`;
        const zone = location.zone || 'N/A';
        const floor = location.floor || 'N/A';
        
        // Calculate actual quantity for this batch
        const batchItems = batchItemsData.filter((item: any) => item.batch_id === batch.id);
        const batchItemQuantity = batchItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const finalQuantity = batchItemQuantity > 0 ? batchItemQuantity : Number(batch.total_quantity) || 0;
        
        return {
          batchId: batch.id,
          quantity: finalQuantity,
          warehouseId,
          warehouseName,
          locationId,
          locationName,
          zone,
          floor,
          createdAt: batch.created_at
        };
      });
      
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categories: product.categories || [],
        hsnCode: product.hsn_code || 'Not Set',
        gstRate: 0, // Default value since gst_rate doesn't exist in the table
        totalQuantity,
        totalProductCount,
        batchCount,
        batches
      };
    });
    
    return {
      data: productBatches,
      totalCount: totalProductCount || 0
    };
  } catch (error) {
    console.error('Failed to fetch product batches:', error);
    throw error;
  }
}
