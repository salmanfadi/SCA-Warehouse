import React from 'react';
import { Card, CardContent } from './card';
import { ProcessedItem } from '@/services/stockout/types';
import { Button } from './button';
import { Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface MobileStockOutCardProps {
  processedItems: ProcessedItem[];
  onDeleteItem?: (itemId: string) => void;
}

export const MobileStockOutCard: React.FC<MobileStockOutCardProps> = ({
  processedItems,
  onDeleteItem
}) => {
  if (processedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 md:hidden">
      <h4 className="text-sm font-medium">Processed Items</h4>
      {processedItems.map((item) => {
        // Extract notes data which contains additional info
        const notes = typeof item.notes === 'string'
          ? JSON.parse(item.notes || '{}')
          : (item.notes || {});

        return (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Barcode</div>
                  <div className="font-mono text-xs truncate">{item.barcode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Qty</div>
                  <div className="font-medium">{item.quantity}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Product</div>
                  <div className="truncate">{notes.product_name || item.product_name || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Location</div>
                  <div className="truncate">{notes.location_name || item.location_info?.location_name || 'Unknown'}</div>
                </div>
              </div>
              
              {onDeleteItem && (
                <div className="mt-2 flex justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove this item</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileStockOutCard;
