import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useInventoryFilters } from '@/hooks/useInventoryFilters';
import { InventoryTableContainer } from '@/components/warehouse/InventoryTableContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InventoryView: React.FC = () => {
  // Get filters 
  const {
    filters,
    setSearchTerm,
    setWarehouseFilter,
    setStatusFilter,
    warehouses,
    availableStatuses,
    resetFilters
  } = useInventoryFilters();
  
  const handleRefresh = () => {
    resetFilters();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        description="View and manage sales inventory."
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Status</CardTitle>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by product name, SKU, or barcode..."
                value={filters.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="w-full sm:w-1/4">
              <Select
                value={filters.warehouseFilter}
                onValueChange={setWarehouseFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-1/4">
              <Select
                value={filters.statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={handleRefresh}>
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <InventoryTableContainer 
            warehouseFilter={filters.warehouseFilter}
            batchFilter={''}
            statusFilter={filters.statusFilter}
            searchTerm={filters.searchTerm}
            highlightedBarcode={null}
            title="Current Inventory"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryView;
