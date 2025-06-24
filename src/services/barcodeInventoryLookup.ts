
import { supabase } from '@/integrations/supabase/client';
import { ScanResponse } from '@/types/auth';

export const barcodeInventoryLookup = {
  async findInventoryByBarcode(barcode: string) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        id,
        product_id,
        quantity,
        barcode,
        color,
        size,
        batch_id,
        status,
        warehouse_id,
        location_id,
        products!inner(id, name, sku, description),
        warehouses!inner(id, name),
        warehouse_locations!inner(id, zone, floor)
      `)
      .eq('barcode', barcode)
      .limit(1);
    
    if (inventoryError) {
      console.error('Error finding inventory by barcode:', inventoryError);
      return null;
    }
    
    return inventoryData && Array.isArray(inventoryData) && inventoryData.length > 0 
      ? inventoryData[0] 
      : null;
  },

  formatInventoryToScanResponse(item: any, scannedBarcode: string): ScanResponse {
    return {
      success: true,
      status: 'success',
      data: {
        box_id: item.barcode || '',
        product: {
          id: item.product_id,
          name: item.products?.name || 'Unknown Product',
          sku: item.products?.sku || '',
          description: item.products?.description || 'Product from inventory'
        },
        box_quantity: item.quantity,
        total_product_quantity: item.quantity,
        location: {
          warehouse: item.warehouses?.name || 'Unknown Warehouse',
          zone: item.warehouse_locations?.zone || 'Unknown Zone',
          position: `Floor ${item.warehouse_locations?.floor || '1'}`
        },
        status: item.status || 'available',
        attributes: {
          color: item.color,
          size: item.size,
          batch_id: item.batch_id
        },
        history: [{
          action: 'Lookup',
          timestamp: new Date().toLocaleString()
        }]
      }
    };
  }
};
