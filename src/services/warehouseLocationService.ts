
import { supabase } from '@/integrations/supabase/client';

export const warehouseLocationService = {
  // Helper function to get warehouse ID from warehouse name
  async getWarehouseId(warehouseName: string): Promise<string> {
    const { data, error } = await supabase
      .from('warehouses')
      .select('id')
      .eq('name', warehouseName)
      .single();
    
    if (error || !data) {
      console.error('Error getting warehouse ID:', error);
      return '';
    }
    
    return data.id;
  },
  
  // Helper function to get location ID from floor and zone
  async getLocationId(floor: number, zone: string): Promise<string> {
    const { data, error } = await supabase
      .from('warehouse_locations')
      .select('id')
      .eq('floor', floor.toString())
      .eq('zone', zone)
      .single();
    
    if (error || !data) {
      console.error('Error getting location ID:', error);
      return '';
    }
    
    return data.id;
  }
};
