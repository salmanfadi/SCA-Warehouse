import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { StockOutRequest } from './BarcodeValidation';

interface StockOutItemsTableProps {
  stockOutRequest: StockOutRequest;
  isLoading: boolean;
  processedItems: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    batch_id?: string;
    batch_number?: string;
    location_name?: string;
  }>;
}

const StockOutItemsTable: React.FC<StockOutItemsTableProps> = ({
  stockOutRequest,
  isLoading,
  processedItems = []
}) => {
  // Calculate remaining quantity for each product
  const calculateRemaining = (productId: string) => {
    const totalRequested = stockOutRequest.quantity;
    const totalProcessed = processedItems
      .filter(item => item.product_id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    return totalRequested - totalProcessed;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Items to Process</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading items...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Processed</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{stockOutRequest.product_name}</TableCell>
                <TableCell className="text-right">{stockOutRequest.quantity}</TableCell>
                <TableCell className="text-right">
                  {stockOutRequest.quantity - stockOutRequest.remaining_quantity}
                </TableCell>
                <TableCell className="text-right">{stockOutRequest.remaining_quantity}</TableCell>
                <TableCell className="text-right">
                  {stockOutRequest.remaining_quantity === 0 ? (
                    <Badge variant="success" className="bg-green-500">Complete</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {processedItems.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Processed Batches</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{item.batch_number || 'N/A'}</TableCell>
                    <TableCell>{item.location_name || 'Unknown Location'}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockOutItemsTable;
