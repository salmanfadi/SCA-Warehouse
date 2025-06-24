
import { StockIn, StockInDetail } from '@/types/stockIn';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string | null;
}

export interface Submitter {
  id: string;
  name: string | null;
  username: string;
}

export interface StockInWithDetails extends Omit<StockIn, 'boxes'> {
  boxes: number;
  quantity: number;
  details: StockInDetail[];
  product?: Product;
  submitter?: Submitter;
  detailsTotalCount: number;
}
