export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  floor: number;
  zone: string;
  // Add other fields as needed
}

export interface Database {
  public: {
    Tables: {
      barcode_logs: {
        Row: {
          action: string | null
          barcode: string | null
          created_at: string | null
          id: string
          scanned_by: string | null
        }
        Insert: {
          action?: string | null
          barcode?: string | null
          created_at?: string | null
          id?: string
          scanned_by?: string | null
        }
        Update: {
          action?: string | null
          barcode?: string | null
          created_at?: string | null
          id?: string
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barcode_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_box_items: {
        Row: {
          barcode: string | null
          box_id: string | null
          color: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          size: string | null
          status: string | null
        }
        Insert: {
          barcode?: string | null
          box_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
          status?: string | null
        }
        Update: {
          barcode?: string | null
          box_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          size?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_box_items_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "batch_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_box_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_boxes: {
        Row: {
          batch_id: string | null
          box_number: number
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          batch_id?: string | null
          box_number: number
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          batch_id?: string | null
          box_number?: number
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_boxes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_inventory_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          inventory_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          inventory_id: string | null
          quantity: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          quantity: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_operations: {
        Row: {
          batch_id: string | null
          created_at: string | null
          id: string
          operation: string | null
          performed_by: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          operation?: string | null
          performed_by?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          id?: string
          operation?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_operations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_operations_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          barcode: string | null
          created_at: string | null
          id: string
          location_id: string | null
          product_id: string | null
          quantity: number
          status: string | null
          warehouse_id: string | null
          warehouse_location_id: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity: number
          status?: string | null
          warehouse_id?: string | null
          warehouse_location_id?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          status?: string | null
          warehouse_id?: string | null
          warehouse_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          id: string
          source_warehouse_id: string
          source_location_id: string | null
          destination_warehouse_id: string
          destination_location_id: string | null
          status: 'pending' | 'completed' | 'in_transit' | 'cancelled'
          created_at: string
          updated_at: string
          created_by: string
          approved_by: string | null
          received_by: string | null
          approved_at: string | null
          received_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          source_warehouse_id: string
          source_location_id?: string | null
          destination_warehouse_id: string
          destination_location_id?: string | null
          status?: 'pending' | 'completed' | 'in_transit' | 'cancelled'
          created_at?: string
          updated_at?: string
          created_by: string
          approved_by?: string | null
          received_by?: string | null
          approved_at?: string | null
          received_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          source_warehouse_id?: string
          source_location_id?: string | null
          destination_warehouse_id?: string
          destination_location_id?: string | null
          status?: 'pending' | 'completed' | 'in_transit' | 'cancelled'
          created_at?: string
          updated_at?: string
          created_by?: string
          approved_by?: string | null
          received_by?: string | null
          approved_at?: string | null
          received_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_warehouse_id_fkey"
            columns: ["destination_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pricing_inquiries: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          product_id: string | null
          requested_price: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          product_id?: string | null
          requested_price?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          product_id?: string | null
          requested_price?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_batches: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          product_id: string | null
          source: string | null
          status: string | null
          submitted_by: string | null
          total_boxes: number | null
          total_quantity: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          source?: string | null
          status?: string | null
          submitted_by?: string | null
          total_boxes?: number | null
          total_quantity?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string | null
          source?: string | null
          status?: string | null
          submitted_by?: string | null
          total_boxes?: number | null
          total_quantity?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_batches_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string;
          name: string;
          sku: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      }
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'admin' | 'warehouse_manager' | 'user';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      }
      sales_inquiries: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_inquiry_items: {
        Row: {
          id: string
          inquiry_id: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          product_id?: string | null
          quantity: number
        }
        Update: {
          id?: string
          inquiry_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_inquiry_responses: {
        Row: {
          created_at: string | null
          id: string
          inquiry_id: string | null
          responder_id: string | null
          response_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          responder_id?: string | null
          response_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          responder_id?: string | null
          response_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_inquiry_responses_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "sales_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_in: {
        Row: {
          batch_id: string | null
          boxes: Json | null
          created_at: string | null
          id: string
          notes: string | null
          number_of_boxes: number | null
          processed_by: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          product_id: string | null
          quantity: number | null
          rejection_reason: string | null
          source: string
          status: string | null
          submitted_by: string
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          batch_id?: string | null
          boxes?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          number_of_boxes?: number | null
          processed_by?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          product_id?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          source: string
          status?: string | null
          submitted_by: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          batch_id?: string | null
          boxes?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          number_of_boxes?: number | null
          processed_by?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          product_id?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          source?: string
          status?: string | null
          submitted_by?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_in_details: {
        Row: {
          barcode: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          stock_in_id: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity: number
          stock_in_id?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          stock_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_details_stock_in_id_fkey"
            columns: ["stock_in_id"]
            isOneToOne: false
            referencedRelation: "stock_in"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movement_audit: {
        Row: {
          action: string | null
          created_at: string | null
          id: string
          inventory_id: string | null
          performed_by: string | null
          quantity: number | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          performed_by?: string | null
          quantity?: number | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          performed_by?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_audit_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movement_audit_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out: {
        Row: {
          created_at: string | null
          id: string
          requested_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_out_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out_details: {
        Row: {
          barcode: string | null
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          processed_quantity: number | null
          stock_out_id: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity: number
          processed_quantity?: number | null
          stock_out_id?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          processed_quantity?: number | null
          stock_out_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_out_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_details_stock_out_id_fkey"
            columns: ["stock_out_id"]
            isOneToOne: false
            referencedRelation: "stock_out"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          id: string
          warehouse_id: string
          floor: number
          zone: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          warehouse_id: string
          floor: number
          zone: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          warehouse_id?: string
          floor?: number
          zone?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['warehouses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['warehouses']['Row']>;
      }
      stock_out_requests: {
        Row: {
          id: string;
          created_at: string;
          created_by: string;
          approved_by: string | null;
          approved_at: string | null;
          approved_quantity: number | null;
          product_id: string;
          warehouse_id: string;
          customer_id: string | null;
          quantity: number;
          destination: string;
          notes: string | null;
          status: 'pending' | 'approved' | 'completed' | 'rejected';
        };
        Insert: Omit<Database['public']['Tables']['stock_out_requests']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stock_out_requests']['Row']>;
      }
      customers: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Row']>;
      }
      reserve_stock: {
        Row: {
          id: string;
          product_id: string;
          warehouse_id: string;
          customer_id: string | null;
          customer_name: string;
          quantity: number;
          start_date: string;
          end_date: string;
          status: 'pending' | 'active' | 'completed' | 'cancelled' | 'converted_to_stockout';
          created_by: string;
          created_at: string;
          updated_at: string;
          notes: string | null;
          stock_out_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['reserve_stock']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reserve_stock']['Row']>;
      };
      reserved_inventory: {
        Row: {
          id: string;
          reserve_stock_id: string;
          product_id: string;
          warehouse_id: string;
          quantity: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reserved_inventory']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['reserved_inventory']['Row']>;
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_items_to_box: {
        Args: {
          p_box_id: string
          p_product_id: string
          p_quantity: number
          p_color?: string
          p_size?: string
        }
        Returns: string
      }
      check_inventory_levels: {
        Args: { p_product_id: string; p_warehouse_id?: string }
        Returns: {
          warehouse_id: string
          warehouse_name: string
          location_id: string
          location_code: string
          quantity: number
          status: string
        }[]
      }
      create_batch_with_boxes: {
        Args: {
          p_warehouse_id: string
          p_product_id: string
          p_total_boxes: number
          p_submitted_by: string
        }
        Returns: string
      }
      generate_batch_barcode_prefix: {
        Args: { warehouse_code: string; batch_id: string }
        Returns: string
      }
      generate_batch_barcodes_pdf: {
        Args: { p_batch_id: string }
        Returns: string
      }
      generate_box_barcode: {
        Args: { batch_prefix: string; box_number: number }
        Returns: string
      }
    }
    Enums: {
      inquiry_status: "pending" | "in_progress" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type DatabaseTables = Database['public']['Tables'];
export type TableName = keyof DatabaseTables;

