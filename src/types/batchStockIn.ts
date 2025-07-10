import { Profile, Product, Warehouse } from '@/types/database';
import { Database } from '@/types/supabase';

type WarehouseLocationRow = Database['public']['Tables']['warehouse_locations']['Row'];

export interface BatchData {
  id?: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  boxes_count: number;
  quantity_per_box: number;
  color?: string;
  size?: string;
  created_by: string;
  barcodes?: string[];
}

export interface BatchFormData {
  product: Product | null;
  warehouse: Warehouse | null;
  location: WarehouseLocationRow | null;
  boxes_count: number | undefined;
  quantity_per_box: number;
  color: string;
  size: string;
}

export interface BoxMetadata {
  barcode: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  remarks?: string;
}

export interface ProcessedBatch {
  id?: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  boxes_count: number;
  quantity_per_box: number;
  color?: string;
  size?: string;
  created_by: string;
  barcodes?: string[];
  product?: Product;
  warehouse?: Warehouse;
  warehouseLocation?: WarehouseLocationRow;
  submitter?: Profile;
  created_at?: string;
  boxes?: BoxMetadata[];
}

export interface StockInBatchSubmission {
  stockInId?: string;
  productId: string;
  source: string;
  notes?: string;
  submittedBy: string;
  batches: BatchData[];
}

export type StockInProcessingStage = 'batch-creation' | 'barcode-assignment' | 'overview';
