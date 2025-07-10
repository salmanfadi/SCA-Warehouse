
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type MovementType = 'in' | 'out' | 'adjustment' | 'transfer';
export type MovementStatus = 'pending' | 'approved' | 'rejected' | 'in_transit';

export interface SimpleInventoryMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  movement_type: MovementType;
  quantity: number;
  status: MovementStatus;
  reference_table?: string;
  reference_id?: string;
  performed_by: string;
  created_at: string;
  transfer_reference_id?: string;
  details?: Record<string, any>;
}

interface MovementFilters {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  movementType?: MovementType;
  status?: MovementStatus;
  dateFrom?: string;
  dateTo?: string;
  referenceId?: string;
  performedBy?: string;
}

// Hook to fetch inventory movements with filters
export const useInventoryMovements = (filters?: MovementFilters) => {
  const query = useQuery({
    queryKey: ['inventory-movements', filters],
    queryFn: async (): Promise<SimpleInventoryMovement[]> => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('performed_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.inventory_id || '',
        warehouse_id: 'default',
        location_id: 'default',
        movement_type: item.movement_type,
        quantity: item.quantity,
        status: 'approved' as MovementStatus,
        reference_table: 'inventory_movements',
        reference_id: item.reference_id,
        performed_by: item.performed_by,
        created_at: item.performed_at || new Date().toISOString(),
        transfer_reference_id: item.transfer_reference_id,
        details: {}
      }));
    }
  });

  return {
    movements: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

// Hook to create movement mutations
export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      productId,
      warehouseId,
      locationId,
      quantity,
      movementType,
      referenceTable,
      referenceId,
      performedBy,
      details
    }: {
      productId: string;
      warehouseId: string;
      locationId: string;
      quantity: number;
      movementType: MovementType;
      referenceTable?: string;
      referenceId?: string;
      performedBy: string;
      details?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.from('inventory_movements').insert({
        movement_type: movementType,
        quantity: quantity,
        reference_id: referenceId,
        performed_by: performedBy,
        notes: JSON.stringify(details || {})
      }).select();
      
      if (error) {
        throw error;
      }
      
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      toast.success(
        "Inventory movement created successfully."
      );
    },
    onError: (error: any) => {
      console.error('Failed to create inventory movement:', error);
      toast.error(
        "Failed to create inventory movement."
      );
    }
  });
};

// Export function for backward compatibility
export const createInventoryMovement = async (
  productId: string,
  warehouseId: string,
  locationId: string,
  quantity: number,
  movementType: MovementType,
  status: MovementStatus,
  referenceTable?: string,
  referenceId?: string,
  performedBy?: string,
  details?: Record<string, any>
) => {
  const { data, error } = await supabase.from('inventory_movements').insert({
    movement_type: movementType,
    quantity: quantity,
    reference_id: referenceId,
    performed_by: performedBy || '',
    notes: JSON.stringify(details || {})
  }).select();
  
  if (error) {
    throw error;
  }
  
  return data[0];
};
