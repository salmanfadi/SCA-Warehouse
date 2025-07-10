
import React from 'react';
import { Button } from '@/components/ui/button';

interface ScannedItem {
  barcode: string;
  inventory_id: string;
  product_name: string;
  product_id: string;
  warehouse_name: string;
  warehouse_id: string;
  location_name: string;
  location_id: string;
  quantity: number;
}

interface ScannedItemsListProps {
  scannedItems: ScannedItem[];
  onRemoveItem: (index: number) => void;
}

export const ScannedItemsList: React.FC<ScannedItemsListProps> = ({
  scannedItems,
  onRemoveItem
}) => {
  // Group scanned items by warehouse
  const groupedItems = scannedItems.reduce<Record<string, ScannedItem[]>>((acc, item) => {
    if (!acc[item.warehouse_name]) {
      acc[item.warehouse_name] = [];
    }
    acc[item.warehouse_name].push(item);
    return acc;
  }, {});

  if (scannedItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Scanned Items: {scannedItems.length}</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {Object.entries(groupedItems).map(([warehouseName, items]) => (
          <div key={warehouseName} className="border rounded-md overflow-hidden">
            <div className="bg-muted p-2">
              <h4 className="text-sm font-medium">{warehouseName}</h4>
            </div>
            <div className="divide-y">
              {items.map((item, idx) => {
                const itemIndex = scannedItems.findIndex(si => si.barcode === item.barcode);
                return (
                  <div key={idx} className="p-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Location: {item.location_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Qty: {item.quantity} • Barcode: {item.barcode}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onRemoveItem(itemIndex)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      &times;
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
