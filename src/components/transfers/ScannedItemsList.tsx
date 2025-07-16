
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScannedItem } from '@/hooks/useTransferLogic';

interface ScannedItemsListProps {
  scannedItems: ScannedItem[];
  onRemoveItem: (barcode: string) => void;
  selectedBoxes: string[];
  onBoxSelectionChange: (boxId: string, selected: boolean) => void;
}

export const ScannedItemsList: React.FC<ScannedItemsListProps> = ({
  scannedItems,
  onRemoveItem,
  selectedBoxes,
  onBoxSelectionChange
}) => {
  if (scannedItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No boxes scanned yet
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Select</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scannedItems.map((item) => (
            <TableRow key={item.barcode}>
              <TableCell>
                <Checkbox
                  checked={selectedBoxes.includes(item.id)}
                  onCheckedChange={(checked) => onBoxSelectionChange(item.id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-mono">{item.barcode}</TableCell>
              <TableCell>
                {item.product_name}
                {item.product_sku && (
                  <span className="text-gray-500 text-sm ml-2">
                    ({item.product_sku})
                  </span>
                )}
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                {item.warehouse_name}
                <br />
                <span className="text-gray-500 text-sm">
                  {item.location_name}
                </span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.barcode)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
