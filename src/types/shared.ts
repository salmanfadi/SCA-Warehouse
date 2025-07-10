// Shared types used across the warehouse components

export interface BoxData {
  id: string;
  barcode: string;
  warehouse_id: string;
  warehouse: string;
  warehouse_name?: string;
  location_id: string;
  location: string;
  location_name?: string;
  quantity: number;
  color: string;
  size: string;
}

export type StepType = 'review' | 'batches' | 'finalize';

export const LOCATION_SEPARATOR = '||';
