
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
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barcode</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Attributes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batchItems.map((item) => (
            <TableRow 
              key={item.id} 
              className={selectedBarcodes.includes(item.barcode) ? "bg-blue-50" : undefined}
            >
              <TableCell className="font-mono">{formatBarcodeForDisplay(item.barcode)}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                {item.warehouses?.name || 'Unknown'}, 
                Floor {item.locations?.floor}, 
                Zone {item.locations?.zone}
              </TableCell>
              <TableCell>
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
  );
};

export default BarcodeInventoryTable;
