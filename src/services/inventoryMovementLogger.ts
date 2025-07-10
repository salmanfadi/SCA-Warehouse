
import { supabase } from '@/integrations/supabase/client';
import { MovementType } from '@/types/inventory';
import { warehouseLocationService } from './warehouseLocationService';

export const inventoryMovementLogger = {
  async logScanMovement(item: any, userId: string | undefined, scannedBarcode: string) {
    // Get warehouse and location IDs
    const warehouseId = await warehouseLocationService.getWarehouseId(item.warehouses?.name || '');
    const locationId = await warehouseLocationService.getLocationId(
      parseInt(item.warehouse_locations?.floor || '1'), 
      item.warehouse_locations?.zone || ''
    );
    
    // Log the scan for tracking purposes using inventory_movements
    const logDetails = { 
      inventory_id: item.id,
      product_name: item.products?.name || 'Unknown Product',
      location: `${item.warehouses?.name} - Floor ${item.warehouse_locations?.floor} - Zone ${item.warehouse_locations?.zone}`,
      barcode: scannedBarcode,
      event_type: 'scan'
    };
    
    if (warehouseId && locationId) {
      // Add an inventory movement record instead of using barcode_logs
      await supabase.from('inventory_movements').insert({
        inventory_id: item.id,
        movement_type: 'adjustment' as MovementType,
        quantity: 0, // Zero quantity as this is just a scan, not actual movement
        performed_by: userId || null,
        notes: JSON.stringify(logDetails)
      });
    }
  }
};
