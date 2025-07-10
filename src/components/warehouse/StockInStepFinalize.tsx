import React from 'react';
import { BatchData } from './StockInStepBatches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2, Box as BoxIcon } from 'lucide-react';
import { StockInRequestData } from '@/hooks/useStockInRequests';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface StockInStepFinalizeProps {
  batches: BatchData[];
  stockIn: StockInRequestData;
  isSubmitting: boolean;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  processingStatus?: {
    inProgress: boolean;
    currentBatch: number;
    totalBatches: number;
    message: string;
  };
}

const StockInStepFinalize: React.FC<StockInStepFinalizeProps> = ({ 
  batches, 
  stockIn, 
  isSubmitting, 
  onSubmit, 
  onBack,
  processingStatus 
}) => {
  // Function to render the boxes table for a batch
  const renderBoxesTable = (batch: BatchData) => {
    const boxes = Array.from({ length: batch.boxCount }, (_, i) => ({
      id: i + 1,
      quantity: batch.quantityPerBox,
      color: batch.color || 'N/A',
      size: batch.size || 'N/A',
      location: batch.location_name,
      warehouse: batch.warehouse_name
    }));

    return (
      <div className="mt-4 border rounded-md">
        <div className="p-4 border-b flex items-center gap-2 bg-muted/50">
          <BoxIcon className="h-4 w-4" />
          <span className="font-medium">Boxes ({batch.boxCount})</span>
        </div>
        <ScrollArea className="h-[300px] w-full">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead>Box #</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box, idx) => (
                <TableRow key={idx} className={cn(
                  'hover:bg-muted/50',
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                )}>
                  <TableCell className="font-medium">{box.id}</TableCell>
                  <TableCell>{box.quantity}</TableCell>
                  <TableCell>{box.color}</TableCell>
                  <TableCell>{box.size}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {box.location}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview & Submit</CardTitle>
          <CardDescription>
            Review the batches before finalizing the stock-in process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ready to Submit</AlertTitle>
            <AlertDescription>
              You are about to process {batches.reduce((sum, batch) => sum + batch.boxCount, 0)} boxes across {batches.length} batches.
              Once submitted, this action cannot be undone.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-6">
            {batches.map((batch, idx) => (
              <Card key={idx} className="border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Batch #{idx + 1}</CardTitle>
                      <CardDescription>
                        {batch.boxCount} boxes at {batch.warehouse_name} — {batch.location_name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Warehouse:</span>
                      <span className="font-medium">{batch.warehouse_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{batch.location_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Boxes:</span>
                      <span className="font-medium">{batch.boxCount}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Quantity per Box:</span>
                      <span className="font-medium">{batch.quantityPerBox}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">Total Items:</span>
                      <span className="font-medium">{batch.boxCount * batch.quantityPerBox}</span>
                    </div>
                    {batch.color && (
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Color:</span>
                        <span className="font-medium">{batch.color}</span>
                      </div>
                    )}
                    {batch.size && (
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium">{batch.size}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Boxes Table */}
                  {renderBoxesTable(batch)}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Processing status */}
      {processingStatus && processingStatus.inProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Processing</AlertTitle>
          <AlertDescription>
            Processing batch {processingStatus.currentBatch} of {processingStatus.totalBatches}.
            {processingStatus.message && <div className="mt-1">{processingStatus.message}</div>}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitting || batches.length === 0}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Stock-In
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StockInStepFinalize; 