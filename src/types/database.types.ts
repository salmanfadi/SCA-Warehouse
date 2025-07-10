export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      stock_in: {
        Row: {
          id: string;
          requested_by: string | null;
          status: string | null;
          created_at: string | null;
          boxes: Json | null;
          notes: string | null;
          product_id: string | null;
          source: string;
          processed_by: string | null;
          batch_id: string | null;
          processing_started_at: string | null;
          processing_completed_at: string | null;
          updated_at: string | null;
          rejection_reason: string | null;
          number_of_boxes: number | null;
          warehouse_id: string | null;
          quantity: number | null;
        };
        Insert: {
          id?: string;
          requested_by?: string | null;
          status?: string | null;
          created_at?: string | null;
          boxes?: Json | null;
          notes?: string | null;
          product_id?: string | null;
          source: string;
          processed_by?: string | null;
          batch_id?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          updated_at?: string | null;
          rejection_reason?: string | null;
          number_of_boxes?: number | null;
          warehouse_id?: string | null;
          quantity?: number | null;
        };
        Update: {
          id?: string;
          requested_by?: string | null;
          status?: string | null;
          created_at?: string | null;
          boxes?: Json | null;
          notes?: string | null;
          product_id?: string | null;
          source?: string;
          processed_by?: string | null;
          batch_id?: string | null;
          processing_started_at?: string | null;
          processing_completed_at?: string | null;
          updated_at?: string | null;
          rejection_reason?: string | null;
          number_of_boxes?: number | null;
          warehouse_id?: string | null;
          quantity?: number | null;
        };
      };
    };
  };
} 