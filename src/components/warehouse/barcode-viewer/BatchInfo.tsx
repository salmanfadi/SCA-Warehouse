
import React from 'react';
import { BatchData } from '@/types/warehouse';

interface BatchInfoProps {
  batch: BatchData;
  getQuantityPerBox: (batch: BatchData) => number;
}

export const BatchInfo: React.FC<BatchInfoProps> = ({ batch, getQuantityPerBox }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Product</p>
        <span>{batch.product_name || batch.product?.name || 'N/A'} ({batch.product_sku || 'N/A'})</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Warehouse</p>
        <p>{batch.warehouse_name || 'N/A'}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Location</p>
        <p>{batch.location_name || 'N/A'}</p>
      </div>
      {getQuantityPerBox(batch) > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Qty/Box</p>
          <span>{getQuantityPerBox(batch)}</span>
        </div>
      )}
      {batch.color && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Color</p>
          <p>{batch.color}</p>
        </div>
      )}
      {batch.size && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Size</p>
          <p>{batch.size}</p>
        </div>
      )}
    </div>
  );
};
