import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Database } from '@/types/supabase';

type InventoryTransfer = Database['public']['Tables']['inventory_transfers']['Row'];
type InventoryTransferInsert = Database['public']['Tables']['inventory_transfers']['Insert'];

// Define interface for TransferForm.tsx
export interface TransferFormData {
  source_warehouse_id: string;
  source_location_id?: string;
  destination_warehouse_id: string;
  destination_location_id?: string;
  notes?: string;
  
  // Form field names that match what's used in TransferForm.tsx
  fromWarehouseId?: string;
  fromLocationId?: string;
  toWarehouseId?: string;
  toLocationId?: string;
}

export const useTransfers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch transfer history with proper relationship aliases
  const getTransferHistory = (filters?: Record<string, any>) => {
    return useQuery<InventoryTransfer[]>({
      queryKey: ['transfers-history', filters],
      queryFn: async () => {
        let query = supabase
          .from('inventory_transfers')
          .select(`
            id,
            source_warehouse_id,
            source_location_id,
            destination_warehouse_id,
            destination_location_id,
            status,
            created_at,
            updated_at,
            created_by,
            approved_by,
            received_by,
            approved_at,
            received_at,
            notes
          `)
          .order('created_at', { ascending: false });
        
        // Apply filters if provided
        if (filters) {
          if (filters.status) {
            query = query.eq('status', filters.status);
          }
          if (filters.sourceWarehouseId) {
            query = query.eq('source_warehouse_id', filters.sourceWarehouseId);
          }
          if (filters.destinationWarehouseId) {
            query = query.eq('destination_warehouse_id', filters.destinationWarehouseId);
          }
          if (filters.createdBy) {
            query = query.eq('created_by', filters.createdBy);
          }
          if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
          }
          if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
          }
          // Add limit if specified
          if (filters.limit) {
            query = query.limit(filters.limit);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching transfer history:', error);
          throw error;
        }
        
        return data || [];
      }
    });
  };

  // Get pending transfers for approval
  const getPendingTransfers = () => {
    return useQuery<InventoryTransfer[]>({
      queryKey: ['transfers-pending'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inventory_transfers')
          .select(`
            id,
            source_warehouse_id,
            source_location_id,
            destination_warehouse_id,
            destination_location_id,
            status,
            created_at,
            created_by,
            notes
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching pending transfers:', error);
          throw error;
        }
        
        return data || [];
      }
    });
  };

  // Create new transfer
  const createTransfer = useMutation<InventoryTransfer, Error, TransferFormData>({
    mutationFn: async (transferData: TransferFormData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Map the form field names to the database column names
      const transferPayload: InventoryTransferInsert = {
        source_warehouse_id: transferData.source_warehouse_id || transferData.fromWarehouseId!,
        destination_warehouse_id: transferData.destination_warehouse_id || transferData.toWarehouseId!,
        source_location_id: transferData.source_location_id || transferData.fromLocationId,
        destination_location_id: transferData.destination_location_id || transferData.toLocationId,
        notes: transferData.notes,
        created_by: user.id,
        status: 'pending'
      };
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .insert(transferPayload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-history'] });
      
      toast({
        title: 'Transfer Created',
        description: 'Your inventory transfer request has been submitted for approval.',
      });
    },
    onError: (error: any) => {
      console.error('Failed to create transfer:', error);
      toast({
        variant: 'destructive',
        title: 'Transfer Failed',
        description: error.message || 'Could not create inventory transfer',
      });
    }
  });

  // Approve a transfer
  const approveTransfer = useMutation<InventoryTransfer, Error, string>({
    mutationFn: async (transferId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .update({
          status: 'completed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', transferId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-pending'] });
      queryClient.invalidateQueries({ queryKey: ['transfers-history'] });
      
      toast({
        title: 'Transfer Approved',
        description: 'The inventory transfer has been approved.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: error.message || 'Could not approve the transfer',
      });
    }
  });

  // Reject a transfer
  const rejectTransfer = useMutation<InventoryTransfer, Error, { transferId: string; reason: string }>({
    mutationFn: async ({ transferId, reason }: { transferId: string; reason: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .update({
          status: 'cancelled',
          notes: reason
        })
        .eq('id', transferId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-pending'] });
      queryClient.invalidateQueries({ queryKey: ['transfers-history'] });
      
      toast({
        title: 'Transfer Rejected',
        description: 'The inventory transfer has been rejected.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Rejection Failed',
        description: error.message || 'Could not reject the transfer',
      });
    }
  });

  // Mark transfer as complete
  const completeTransfer = useMutation<InventoryTransfer, Error, string>({
    mutationFn: async (transferId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .update({
          status: 'completed',
          received_by: user.id,
          received_at: new Date().toISOString()
        })
        .eq('id', transferId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-history'] });
      
      toast({
        title: 'Transfer Completed',
        description: 'The inventory transfer has been marked as completed.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Completion Failed',
        description: error.message || 'Could not mark the transfer as completed',
      });
    }
  });

  return {
    getTransferHistory,
    getPendingTransfers,
    createTransfer,
    approveTransfer,
    rejectTransfer,
    completeTransfer
  };
};
