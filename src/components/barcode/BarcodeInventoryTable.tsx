
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Eye } from 'lucide-react';
import { BatchItemType } from '@/hooks/useProcessedBatches';
import { formatBarcodeForDisplay } from '@/utils/barcodeUtils';

interface BarcodeInventoryTableProps {
  batchItems: BatchItemType[];
  isLoading?: boolean;
  onViewDetails?: (barcode: string) => void;
  onPrintBarcode?: (barcode: string) => void;
  onSelectBarcode?: (barcode: string) => void;
  selectedBarcodes?: string[];
}

const BarcodeInventoryTable: React.FC<BarcodeInventoryTableProps> = ({
  batchItems,
  isLoading = false,
  onViewDetails,
  onPrintBarcode,
  onSelectBarcode,
  selectedBarcodes = []
}) => {
  if (isLoading) {
    return (
      <div className="w-full py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading barcode inventory...</p>
      </div>
    );
  }

  if (!batchItems || batchItems.length === 0) {
    return (
      <div className="w-full py-8 text-center border rounded-lg">
        <p className="text-gray-500">No barcodes found in this batch.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop/tablet view */}
      <div className="hidden sm:block relative">
        <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-md border">
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Barcode</TableHead>
                    <TableHead className="whitespace-nowrap">Quantity</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Location</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Attributes</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className={selectedBarcodes.includes(item.barcode) ? "bg-blue-50 dark:bg-blue-900/20" : undefined}
                    >
                      <TableCell className="font-mono">{formatBarcodeForDisplay(item.barcode)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-[150px]" title={`${item.warehouses?.name || 'Unknown'}, Floor ${item.locations?.floor}, Zone ${item.locations?.zone}`}>
                        {item.warehouses?.name || 'Unknown'}, 
                        Floor {item.locations?.floor}, 
                        Zone {item.locations?.zone}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {item.color && (
                            <Badge variant="outline">{item.color}</Badge>
                          )}
                          {item.size && (
                            <Badge variant="outline">{item.size}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'available' ? 'default' : 'secondary'}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {onViewDetails && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onViewDetails(item.barcode)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View Details</span>
                            </Button>
                          )}
                          {onPrintBarcode && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onPrintBarcode(item.barcode)}
                              className="h-8 w-8 p-0"
                            >
                              <Printer className="h-4 w-4" />
                              <span className="sr-only">Print Barcode</span>
                            </Button>
                          )}
                          {onSelectBarcode && (
                            <Button
                              variant={selectedBarcodes.includes(item.barcode) ? "default" : "outline"}
                              size="sm"
                              onClick={() => onSelectBarcode(item.barcode)}
                            >
                              {selectedBarcodes.includes(item.barcode) ? "Selected" : "Select"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        {/* Remove scroll hints */}
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-4">
        {batchItems.map((item) => (
          <div 
            key={item.id} 
            className={`rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900 ${selectedBarcodes.includes(item.barcode) ? "border-blue-500 dark:border-blue-700" : ""}`}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="font-mono text-sm font-medium">{formatBarcodeForDisplay(item.barcode)}</div>
              <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>
                {item.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="text-xs">
                <span className="text-muted-foreground block">Quantity</span>
                <span className="font-medium">{item.quantity}</span>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground block">Location</span>
                <span className="font-medium truncate block">
                  {item.warehouses?.name || 'Unknown'}, Floor {item.locations?.floor}, Zone {item.locations?.zone}
                </span>
              </div>
            </div>
            
            {(item.color || item.size) && (
              <div className="mb-3">
                <span className="text-xs text-muted-foreground block mb-1">Attributes</span>
                <div className="flex flex-wrap gap-1">
                  {item.color && <Badge variant="outline">{item.color}</Badge>}
                  {item.size && <Badge variant="outline">{item.size}</Badge>}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-end space-x-2 mt-2 border-t pt-2">
              {onViewDetails && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewDetails(item.barcode)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  <span>View</span>
                </Button>
              )}
              {onPrintBarcode && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onPrintBarcode(item.barcode)}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  <span>Print</span>
                </Button>
              )}
              {onSelectBarcode && (
                <Button
                  variant={selectedBarcodes.includes(item.barcode) ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectBarcode(item.barcode)}
                >
                  {selectedBarcodes.includes(item.barcode) ? "Selected" : "Select"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default BarcodeInventoryTable;
