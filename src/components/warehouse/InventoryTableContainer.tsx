
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSimpleInventory } from '@/hooks/useSimpleInventory';
import { toast } from 'sonner';

interface InventoryTableContainerProps {
  warehouseFilter?: string;
  batchFilter?: string;
  statusFilter?: string;
  searchTerm?: string;
  highlightedBarcode?: string | null;
  title?: string;
  sizeFilter?: string;
  quantityPerBoxFilter?: string;
  colorFilter?: string;
  colorFilterType?: string;
}

export const InventoryTableContainer: React.FC<InventoryTableContainerProps> = ({
  warehouseFilter,
  batchFilter,
  statusFilter,
  searchTerm,
  highlightedBarcode,
  title = "Inventory Overview",
  sizeFilter,
  quantityPerBoxFilter,
  colorFilter,
  colorFilterType
}) => {
  const { data: inventoryItems, isLoading, error, refetch } = useSimpleInventory();
  const [isExporting, setIsExporting] = useState(false);

  // Apply filters to the data
  const filteredItems = React.useMemo(() => {
    if (!inventoryItems) return [];
    
    return inventoryItems.filter(item => {
      // Warehouse filter
      if (warehouseFilter && item.warehouse_id !== warehouseFilter) return false;
      
      // Status filter
      if (statusFilter && statusFilter !== '' && item.status !== statusFilter) return false;
      
      // Search term filter
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          item.product_name?.toLowerCase().includes(searchLower) ||
          item.product_sku?.toLowerCase().includes(searchLower) ||
          item.barcode?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Size filter
      if (sizeFilter && sizeFilter.trim() !== '') {
        if (!item.size?.toLowerCase().includes(sizeFilter.toLowerCase())) return false;
      }
      
      // Color filter
      if (colorFilter && colorFilter.trim() !== '') {
        if (!item.color?.toLowerCase().includes(colorFilter.toLowerCase())) return false;
      }
      
      // Quantity per box filter
      if (quantityPerBoxFilter && quantityPerBoxFilter.trim() !== '') {
        const filterValue = parseInt(quantityPerBoxFilter);
        if (!isNaN(filterValue) && item.quantity !== filterValue) return false;
      }
      
      return true;
    });
  }, [inventoryItems, warehouseFilter, statusFilter, searchTerm, sizeFilter, colorFilter, quantityPerBoxFilter]);

  const handleExport = async () => {
    if (!filteredItems || filteredItems.length === 0) {
      toast.error('No Data', {
        description: 'No inventory data to export'
      });
      return;
    }

    setIsExporting(true);
    try {
      // Create CSV content
      const headers = ['Product', 'SKU', 'Warehouse', 'Location', 'Quantity', 'Status', 'Color', 'Size', 'Batch ID'];
      const csvContent = [
        headers.join(','),
        ...filteredItems.map(item => [
          `"${item.product_name || ''}"`,
          `"${item.product_sku || ''}"`,
          `"${item.warehouse_name || ''}"`,
          `"${item.location_details || ''}"`,
          item.quantity,
          `"${item.status || ''}"`,
          `"${item.color || ''}"`,
          `"${item.size || ''}"`,
          `"${item.batch_id || ''}"`
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export Successful', {
        description: 'Inventory data has been exported to CSV'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export Failed', {
        description: 'Failed to export inventory data'
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-4">Error loading inventory data</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-green-500';
      case 'sold':
        return 'bg-red-500';
      case 'damaged':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm" title="Sync" aria-label="Sync">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || !filteredItems || filteredItems.length === 0}
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredItems || filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No inventory items found</p>
          </div>
        ) : (
          <>
            {/* Desktop/tablet table with scroll hint */}
            <div className="hidden sm:block relative">

              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attributes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow 
                        key={item.id}
                        className={highlightedBarcode && item.barcode === highlightedBarcode ? 'bg-yellow-100' : ''}
                      >
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.product_sku}
                        </TableCell>
                        <TableCell>{item.warehouse_name}</TableCell>
                        <TableCell className="text-sm">
                          {item.location_details}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.quantity}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'available' ? 'bg-green-500' :
                            item.status === 'sold' ? 'bg-red-500' :
                            item.status === 'damaged' ? 'bg-yellow-500' : ''
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(item.color || item.size) ? (
                            <div className="flex flex-wrap gap-1">
                              {item.color && <Badge variant="outline" className="text-xs">{item.color}</Badge>}
                              {item.size && <Badge variant="outline" className="text-xs">{item.size}</Badge>}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {/* Remove scroll hints */}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryTableContainer;
