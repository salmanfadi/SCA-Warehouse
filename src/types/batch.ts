
import type { Product } from './products';

export interface ProcessedBatch {
  id: string;
  created_at: string;
  processed_at: string;
  processed_by: string;
  submitted_by: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  status: string;
  notes: string | null;
  warehouse_id: string;
  source: string | null;
  product_name: string;
  product?: {
    id: string;
    name: string;
  };
}

export interface ProcessedBatchType {
  id: string;
  created_at: string;
  processed_at: string;
  processed_by: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  totalBoxes: number;
  status: string;
  notes: string | null;
  warehouse_id: string;
  product: {
    id: string;
    name: string;
  };
}

export interface ProcessedBatchWithItems {
  id: string;
  product_id: string;
  total_quantity: number;
  total_boxes: number;
  totalBoxes: number;
  status: string;
  created_at: string;
  processed_at: string;
  warehouse_id: string;
  product: {
    id: string;
    name: string;
  };
}

export interface BatchItem {
  id: string;
  batch_id: string;
  inventory_id: string;
  barcode: string;
  color: string | null;
  size: string | null;
  created_at: string;
}
