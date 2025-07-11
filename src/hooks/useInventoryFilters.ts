
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Filters {
  searchTerm: string;
  warehouseFilter: string;
  batchFilter: string;
  statusFilter: string;
}

interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

interface BatchOption {
  value: string;
  label: string;
}

export const useInventoryFilters = () => {
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    warehouseFilter: '',
    batchFilter: '',
    statusFilter: '',
  });

  const setSearchTerm = (term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  };

  const setWarehouseFilter = (warehouseId: string) => {
    setFilters(prev => ({ ...prev, warehouseFilter: warehouseId }));
  };

  const setBatchFilter = (batchId: string) => {
    setFilters(prev => ({ ...prev, batchFilter: batchId }));
  };

  const setStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, statusFilter: status }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      warehouseFilter: '',
      batchFilter: '',
      statusFilter: '',
    });
  };

  // Fetch warehouses for filtering
  const warehousesQuery = useQuery({
    queryKey: ['warehouses'],
    queryFn: async (): Promise<Warehouse[]> => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch batch IDs for filtering
  const batchesQuery = useQuery({
    queryKey: ['batch-ids'],
    queryFn: async (): Promise<BatchOption[]> => {
      const { data, error } = await supabase
        .from('processed_batches')
        .select('id, product_id')
        .order('processed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return (data || []).map(batch => ({
        value: batch.id,
        label: `Batch ${batch.id.substring(0, 8)}...`
      }));
    }
  });

  // Available status options
  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'sold', label: 'Sold' },
    { value: 'damaged', label: 'Damaged' },
  ];

  return {
    filters,
    setSearchTerm,
    setWarehouseFilter,
    setBatchFilter,
    setStatusFilter,
    resetFilters,
    warehouses: warehousesQuery.data,
    batchIds: batchesQuery.data,
    availableStatuses: statusOptions,
    isLoadingWarehouses: warehousesQuery.isLoading,
    isLoadingBatches: batchesQuery.isLoading,
  };
};
