
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Truck } from 'lucide-react';
import { SalesOrder } from '@/hooks/useSalesOrders';

interface SalesOrderActionsProps {
  order: SalesOrder;
  canPushToStockOut: boolean;
  isPushPending: boolean;
  onViewOrder: () => void;
  onPushToStockOut: () => void;
}

export const SalesOrderActions: React.FC<SalesOrderActionsProps> = ({
  order,
  canPushToStockOut,
  isPushPending,
  onViewOrder,
  onPushToStockOut
}) => {
  console.log(`🎬 RENDERING ACTIONS for ${order.sales_order_number}`);
  console.log(`Can push: ${canPushToStockOut}, Pending: ${isPushPending}`);
  
  const isButtonDisabled = !canPushToStockOut || isPushPending;

  return (
    <div className="flex flex-col gap-2">
      <Button 
        size="sm" 
        variant="outline"
        onClick={onViewOrder}
        className="w-full"
      >
        <FileText className="h-4 w-4 mr-1" />
        View Details
      </Button>
      
      <Button 
        size="sm" 
        onClick={onPushToStockOut}
        disabled={isButtonDisabled}
        className={`w-full ${
          canPushToStockOut 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Truck className="h-4 w-4 mr-1" />
        {isPushPending ? 'Pushing...' : 'Push to Stock-Out'}
      </Button>
      
      {order.pushed_to_stockout && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
          In Stock-Out
        </Badge>
      )}
    </div>
  );
};
