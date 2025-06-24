
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BatchData } from '@/types/warehouse';

interface BarcodeListProps {
  batch: BatchData;
  getBarcodes: (batch: BatchData) => string[];
  getBatchNumber: (batch: BatchData) => string;
  hasMultipleBatches: boolean;
}

export const BarcodeList: React.FC<BarcodeListProps> = ({
  batch,
  getBarcodes,
  getBatchNumber,
  hasMultipleBatches,
}) => {
  return (
    <ScrollArea className="border rounded-md flex-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">#</TableHead>
            <TableHead>Barcode</TableHead>
            {hasMultipleBatches && (
              <TableHead className="text-right">Batch Number</TableHead>
            )}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getBarcodes(batch).length > 0 ? (
            getBarcodes(batch).map((barcode, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{barcode}</TableCell>
                {hasMultipleBatches && (
                  <TableCell className="text-right">
                    <span>{getBatchNumber(batch)}</span>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Active
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={hasMultipleBatches ? 4 : 3} className="text-center">
                No barcodes found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
