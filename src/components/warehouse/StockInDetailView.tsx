
import React from 'react';
import { ProcessableStockIn } from '@/types/auth';

interface StockInDetailViewProps {
  stockIn: ProcessableStockIn;
  details: any[];
  isLoading: boolean;
}

export const StockInDetailView: React.FC<StockInDetailViewProps> = ({ 
  stockIn, 
  details, 
  isLoading 
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!stockIn) {
    return <div>No stock in data found.</div>;
  }

  return (
    <div className="border p-4 rounded-md mb-6">
      <h2 className="text-xl font-semibold mb-2">Stock In #{stockIn.id.substring(0, 8)}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p><strong>Product:</strong> {stockIn.product.name}</p>
          <p><strong>SKU:</strong> {stockIn.product.sku || 'N/A'}</p>
          <p><strong>Category:</strong> {stockIn.product.category || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Boxes:</strong> {stockIn.boxes}</p>
          <p><strong>Status:</strong> {stockIn.status}</p>
          <p><strong>Source:</strong> {stockIn.source}</p>
          <p><strong>Submitted by:</strong> {stockIn.submitter.name} ({stockIn.submitter.username})</p>
        </div>
      </div>
      <div>
        <p><strong>Notes:</strong></p>
        <p>{stockIn.notes || 'No notes provided.'}</p>
      </div>
      {details && details.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Details</h3>
          <ul>
            {details.map((detail, index) => (
              <li key={index} className="mb-1">
                {detail.barcode}: {detail.quantity} units
                {detail.color && ` (${detail.color})`}
                {detail.size && `, Size: ${detail.size}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
