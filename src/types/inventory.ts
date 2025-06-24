
import type { Product } from './products';

export type MovementType = 'in' | 'out' | 'adjustment' | 'reserve' | 'release' | 'transfer';
export type MovementStatus = 'pending' | 'approved' | 'rejected' | 'in_transit';

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  barcode: string;
  color: string | null;
  size: string | null;
  batch_id: string | null;
  status: string;
  warehouse_id: string;
  location_id: string;
  created_at: string;
  updated_at: string | null;
}

export interface InventoryProduct {
  id: string;
  name: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  movement_type: MovementType;
  quantity: number;
  status: MovementStatus;
  reference_table?: string;
  reference_id?: string;
  performed_by: string;
  created_at: string;
  transfer_reference_id?: string;
  details?: {
    [key: string]: any;
    barcode?: string;
    color?: string;
    size?: string;
    source?: string;
    notes?: string;
    direction?: 'in' | 'out';
    from_warehouse_id?: string;
    from_location_id?: string;
    to_warehouse_id?: string;
    to_location_id?: string;
  };
  
  // Join fields
  products?: {
    name: string;
    sku?: string;
  };
  warehouses?: {
    name: string;
    location?: string;
  };
  warehouse_locations?: {
    floor: number;
    zone: string;
  };
  profiles?: {
    name: string;
    username: string;
  };
}

export interface InventoryLedgerItem {
  product_id: string;
  product_name: string;
  product_sku?: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string;
  location_name: string;
  stock_level: number;
  last_updated: string;
}

export interface InventoryMovementFilters {
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  movementType?: MovementType;
  status?: MovementStatus;
  dateFrom?: string;
  dateTo?: string;
  referenceId?: string;
  performedBy?: string;
}

export interface BarcodeLog {
  barcode: string;
  user_id: string;
  action: string;
  event_type?: string;
  timestamp?: string;
  details?: Record<string, any>;
}
