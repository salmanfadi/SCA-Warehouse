
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCw, Filter } from 'lucide-react';
import { InventoryBarcodeScanner } from '@/components/inventory/InventoryBarcodeScanner';

interface InventoryFiltersPanelProps {
  onBarcodeScanned: (barcode: string) => void;
  onRefresh: () => void;
  onResetFilters: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  warehouseFilter: string;
  setWarehouseFilter: (warehouse: string) => void;
  batchFilter: string;
  setBatchFilter: (batch: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  warehouses?: Array<{ id: string, name: string, location?: string }>;
  batchIds?: Array<{ value: string, label: string }>;
  availableStatuses: Array<{ value: string, label: string }>;
  isLoadingWarehouses?: boolean;
  isLoadingBatches?: boolean;
}

export const InventoryFiltersPanel: React.FC<InventoryFiltersPanelProps> = ({
  onBarcodeScanned,
  onRefresh,
  onResetFilters,
  searchTerm,
  setSearchTerm,
  warehouseFilter,
  setWarehouseFilter,
  batchFilter,
  setBatchFilter,
  statusFilter,
  setStatusFilter,
  warehouses = [],
  batchIds = [],
  availableStatuses,
  isLoadingWarehouses = false,
  isLoadingBatches = false,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by product name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <InventoryBarcodeScanner onBarcodeScanned={onBarcodeScanned} />
            
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="whitespace-nowrap"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select
                value={warehouseFilter}
                onValueChange={setWarehouseFilter}
                disabled={isLoadingWarehouses}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} {warehouse.location && `(${warehouse.location})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select
                value={batchFilter}
                onValueChange={setBatchFilter}
                disabled={isLoadingBatches}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Batches</SelectItem>
                  {batchIds?.map((batch) => (
                    <SelectItem key={batch.value} value={batch.value}>
                      {batch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select
                value={statusFilter}
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
          
          {(searchTerm || warehouseFilter || batchFilter || statusFilter) && (
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                onClick={onResetFilters} 
                size="sm"
              >
                <Filter className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
