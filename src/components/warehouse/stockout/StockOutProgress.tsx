import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProcessedItem, StockOutRequest } from '@/services/stockout/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/date-utils';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MobileStockOutCard from '@/components/ui/mobile-stock-out-card';

interface StockOutProgressProps {
  stockOutRequest: StockOutRequest;
  processedItems: ProcessedItem[];
  progress: number;
  isLoading?: boolean;
  onDeleteItem?: (itemId: string) => void;
}

const StockOutProgress: React.FC<StockOutProgressProps> = ({
  stockOutRequest,
  processedItems,
  progress,
  isLoading = false,
  onDeleteItem
}) => {
  // Calculate total processed quantity
  const totalProcessedQuantity = processedItems.reduce(
    (sum, item) => sum + item.quantity, 
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Stock Out Progress</CardTitle>
          {isLoading && (
            <div className="flex items-center text-sm text-amber-500 animate-pulse">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Processed: {totalProcessedQuantity} / {stockOutRequest.quantity}
              </span>
              <span>
                Remaining: {stockOutRequest.quantity - totalProcessedQuantity}
              </span>
            </div>
          </div>

          {/* Stock Out Request Details */}
          <div className="pt-2 space-y-2">
            <h4 className="text-sm font-medium">Request Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Product: </span>
                <span className="font-medium">{stockOutRequest.product_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Requested By: </span>
                <span className="font-medium">{stockOutRequest.requested_by}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Requested At: </span>
                <span className="font-medium">
                  {formatDate(stockOutRequest.requested_at)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium capitalize">{stockOutRequest.status}</span>
              </div>
            </div>
          </div>

          {/* Mobile Processed Items Cards */}
          {processedItems.length > 0 && (
            <MobileStockOutCard 
              processedItems={processedItems} 
              onDeleteItem={onDeleteItem} 
            />
          )}

          {/* Desktop Processed Items Table */}
          {processedItems.length > 0 && (
            <div className="pt-4 hidden md:block">
              <h4 className="text-sm font-medium mb-2">Processed Items</h4>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      {onDeleteItem && <TableHead className="w-[50px]">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedItems.map((item) => {
                      // Extract notes data which contains additional info
                      const notes = typeof item.notes === 'string' 
                        ? JSON.parse(item.notes || '{}') 
                        : (item.notes || {});
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                          <TableCell>{notes.product_name || item.product_name || 'Unknown'}</TableCell>
                          <TableCell>{notes.location_name || item.location_info?.location_name || 'Unknown'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          {onDeleteItem && (
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => onDeleteItem(item.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove this item</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={onDeleteItem ? 3 : 3} className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-medium">{totalProcessedQuantity}</TableCell>
                      {onDeleteItem && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockOutProgress;
