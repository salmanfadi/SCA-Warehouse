
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BoxesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryFilters } from '@/hooks/useInventoryFilters';
import { InventoryFiltersPanel } from '@/components/warehouse/InventoryFiltersPanel';
import { InventoryTableContainer } from '@/components/warehouse/InventoryTableContainer';
import { useInventoryData } from '@/hooks/useInventoryData';

const AdminInventoryView = () => {
  const navigate = useNavigate();
  const [highlightedBarcode, setHighlightedBarcode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get filters with enhanced hook
  const {
    filters,
    setSearchTerm,
    setWarehouseFilter,
    setBatchFilter,
    setStatusFilter,
    resetFilters,
    warehouses,
    batchIds,
    availableStatuses,
    isLoadingBatches,
    isLoadingWarehouses
  } = useInventoryFilters();
  
  useEffect(() => {
    // Log initial inventory state for debugging
    console.log("Mounted AdminInventoryView with filters:", filters);
    
    // Force a refetch when component mounts to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['inventory-data'] });
  }, []);
  
  // Use shared inventory hook with filters
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useInventoryData(
    filters.warehouseFilter, 
    filters.batchFilter, 
    filters.statusFilter, 
    filters.searchTerm
  );
  
  // Extract inventory items from the data
  const inventoryItems = data?.data || [];

  // Handle barcode scanned
  const handleBarcodeScanned = async (barcode: string) => {
    setHighlightedBarcode(barcode);
    
    // Clear existing filters to ensure we see the item
    resetFilters();
    setSearchTerm(barcode);
    
    // Invalidate query to ensure we have the latest data
    await queryClient.invalidateQueries({ queryKey: ['inventory-data'] });
    
    // Find item matching barcode
    const item = inventoryItems?.find(item => item.barcode === barcode);
    
    if (item) {
      toast.success(`Found ${item.productName} in ${item.warehouseName}`);
    } else {
      toast.error(`No inventory item with barcode ${barcode} was found.`);
      
      // After a brief delay, refresh again to make sure we check database
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  };
  
  const handleRefresh = () => {
    console.log("Refreshing inventory data...");
    queryClient.invalidateQueries({ queryKey: ['batch-ids'] });
    queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-data'] });
    toast('Getting the latest inventory data...');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="View and manage current inventory across all warehouses"
      />
      
      <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/inventory/batches')}
            className="flex items-center gap-1"
          >
            <BoxesIcon className="h-4 w-4" />
            View Batch Inventory
          </Button>
        </div>
      </div>
      
      <InventoryFiltersPanel
        onBarcodeScanned={handleBarcodeScanned}
        onRefresh={handleRefresh}
        searchTerm={filters.searchTerm}
        setSearchTerm={setSearchTerm}
        warehouseFilter={filters.warehouseFilter}
        setWarehouseFilter={setWarehouseFilter}
        batchFilter={filters.batchFilter}
        setBatchFilter={setBatchFilter}
        statusFilter={filters.statusFilter}
        setStatusFilter={setStatusFilter}
        warehouses={warehouses}
        batchIds={batchIds}
        availableStatuses={availableStatuses}
        onResetFilters={resetFilters}
        isLoadingBatches={isLoadingBatches}
        isLoadingWarehouses={isLoadingWarehouses}
      />
      
      <InventoryTableContainer 
        warehouseFilter={filters.warehouseFilter}
        batchFilter={filters.batchFilter}
        statusFilter={filters.statusFilter}
        searchTerm={filters.searchTerm}
        highlightedBarcode={highlightedBarcode}
        title="Current Inventory"
      />
    </div>
  );
};

export default AdminInventoryView;
