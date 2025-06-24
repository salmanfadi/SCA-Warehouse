import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { DeductedBatch } from './BarcodeValidation';

interface DeductedBatchesTableProps {
  batches: DeductedBatch[];
}

export const DeductedBatchesTable: React.FC<DeductedBatchesTableProps> = ({ batches }) => {
  // Combine entries with the same barcode
  const combinedBatches = React.useMemo(() => {
    // Create a map to hold combined entries
    const barcodeMap = new Map();
    
    // Process each batch
    batches.forEach(batch => {
      // Use batch_item_id as the key if barcode is not available
      const key = batch.barcode || batch.batch_item_id || `batch-${Date.now()}-${Math.random()}`;
      
      if (barcodeMap.has(key)) {
        // Combine with existing entry
        const existingBatch = barcodeMap.get(key);
        existingBatch.quantity_deducted = (existingBatch.quantity_deducted || 0) + (batch.quantity_deducted || 0);
        // Update timestamp if the new one is more recent
        if (batch.timestamp > existingBatch.timestamp) {
          existingBatch.timestamp = batch.timestamp;
        }
      } else {
        // Create new entry in map
        barcodeMap.set(key, { ...batch });
      }
    });
    
    // Convert map back to array
    return Array.from(barcodeMap.values());
  }, [batches]);
  
  if (combinedBatches.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No boxes have been processed yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Barcode (Last 8 Digits)</TableHead>
            <TableHead>Batch #</TableHead>
            <TableHead>Quantity Deducted</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinedBatches.map((batch, index) => (
            <TableRow key={`${batch.barcode}-${index}`}>
              <TableCell className="font-mono">
                {batch.barcode ? (
                  `BC-${batch.barcode.substring(Math.max(0, batch.barcode.length - 8))}`
                ) : batch.batch_item_id ? (
                  `ID-${batch.batch_item_id.substring(0, 8)}`
                ) : (
                  `Item-${index + 1}`
                )}
              </TableCell>
              <TableCell>{batch.batch_number}</TableCell>
              <TableCell className="font-semibold text-base">{batch.quantity_deducted}</TableCell>
              <TableCell>{batch.location_name}</TableCell>
              <TableCell>
                {batch.timestamp ? format(new Date(batch.timestamp), 'HH:mm:ss') : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeductedBatchesTable;
