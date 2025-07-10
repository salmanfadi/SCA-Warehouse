
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Boxes } from 'lucide-react';
import { StockInData } from '@/hooks/useStockInData';

interface StockInRequestDetailsProps {
  stockInData: StockInData | null;
  source: string;
  setSource: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  remainingBoxes: number;
  isSubmitting: boolean;
  isProcessing: boolean;
  stockInId?: string;
}

export const StockInRequestDetails: React.FC<StockInRequestDetailsProps> = ({
  stockInData,
  source,
  setSource,
  notes,
  setNotes,
  remainingBoxes,
  isSubmitting,
  isProcessing,
  stockInId
}) => {
  return (
    <>
      {stockInData && (
        <Card className="apple-shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Stock-In Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <div className="p-2 bg-muted rounded-lg">
                  {stockInData.product?.name || 'Unknown Product'}
                  {stockInData.product?.sku && (
                    <span className="block text-sm text-muted-foreground mt-1">
                      SKU: {stockInData.product.sku}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total Boxes</Label>
                <div className="p-2 bg-muted rounded-lg flex justify-between items-center">
                  <span>{stockInData.boxes || 0}</span>
                  <span className={`text-sm font-medium ${remainingBoxes < 0 ? 'text-red-500' : remainingBoxes === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {remainingBoxes < 0 ? `Exceeded by ${Math.abs(remainingBoxes)}` : 
                     remainingBoxes === 0 ? 'All boxes allocated' : 
                     `${remainingBoxes} remaining`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input 
                id="source" 
                value={source} 
                onChange={(e) => setSource(e.target.value)} 
                placeholder="Supplier or source"
                readOnly={!!stockInId}
                className="apple-shadow-sm"
                disabled={isSubmitting || isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Optional notes about this batch"
                readOnly={!!stockInId}
                className="apple-shadow-sm min-h-[100px]"
                disabled={isSubmitting || isProcessing}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {remainingBoxes < 0 && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20 apple-shadow-sm">
          <CardContent className="p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            <span>Warning: You've allocated more boxes than are available in the original request.</span>
          </CardContent>
        </Card>
      )}
    </>
  );
};
