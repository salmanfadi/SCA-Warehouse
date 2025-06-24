
import { StockInWithDetails, Product, Submitter } from './types';

export const mapStockInWithDetails = (stockIn: any, details: any[]): StockInWithDetails => {
  const stockInData: StockInWithDetails = {
    id: stockIn.id,
    created_at: stockIn.created_at,
    updated_at: stockIn.updated_at,
    product_id: stockIn.product_id,
    boxes: stockIn.boxes || 0,
    quantity: stockIn.quantity || stockIn.boxes || 0,
    source: stockIn.source,
    notes: stockIn.notes,
    submitted_by: stockIn.submitted_by,
    processed_by: stockIn.processed_by,
    rejection_reason: stockIn.rejection_reason,
    status: stockIn.status,
    details: details || [],
    detailsTotalCount: 0,
  };
  
  // Fix product and submitter parsing
  if (stockIn.products) {
    stockInData.product = {
      id: stockIn.products.id,
      name: stockIn.products.name,
      sku: stockIn.products.sku,
      category: stockIn.products.category,
    };
  }

  if (stockIn.profiles) {
    stockInData.submitter = {
      id: stockIn.profiles.id,
      name: stockIn.profiles.full_name,
      username: stockIn.profiles.username,
    };
  }

  return stockInData;
};
