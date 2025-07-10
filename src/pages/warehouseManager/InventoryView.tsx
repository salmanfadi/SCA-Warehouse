import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryFilters } from '@/hooks/useInventoryFilters';
import { InventoryTableContainer } from '@/components/warehouse/InventoryTableContainer';
import { Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InventoryView: React.FC = () => {
  const navigate = useNavigate();
  // Use shared inventory filters for warehouse, status, etc.
  const {
    filters,
    setSearchTerm,
    setWarehouseFilter,
    setStatusFilter,
    warehouses,
    availableStatuses
  } = useInventoryFilters();

  // Advanced filters
  const [sizeFilter, setSizeFilter] = useState('');
  const [quantityPerBoxFilter, setQuantityPerBoxFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');

  // Handler for advanced search
  const handleAdvancedSearch = () => {
    // This will trigger a re-render and pass filters to InventoryTableContainer
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manager/inventory/batches')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Inventory
        </Button>
      </div>
      <PageHeader 
        description="View and manage inventory."
      />
      <Card>
        <CardHeader>
          <CardTitle>Advanced Inventory Search</CardTitle>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
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
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Filter by size..."
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="sm:w-1/4"
            />
            <Input
              placeholder="Filter by quantity per box..."
              value={quantityPerBoxFilter}
              onChange={(e) => setQuantityPerBoxFilter(e.target.value)}
              className="sm:w-1/4"
              type="number"
              min={1}
            />
            <Input
              placeholder="Filter by color..."
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="sm:w-1/4"
            />
            <Button onClick={handleAdvancedSearch} variant="outline">
              Search
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
            title="Inventory"
            sizeFilter={sizeFilter}
            quantityPerBoxFilter={quantityPerBoxFilter}
            colorFilter={colorFilter}
            colorFilterType="ilike"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryView; 