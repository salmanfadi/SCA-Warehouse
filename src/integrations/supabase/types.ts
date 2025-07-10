export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      barcodes: {
        Row: {
          barcode: string
          batch_id: string | null
          box_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string | null
          product_id: string | null
          quantity: number
          status: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          barcode: string
          batch_id?: string | null
          box_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity: number
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string
          batch_id?: string | null
          box_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity?: number
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barcodes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "barcodes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_inventory_items: {
        Row: {
          batch_id: string
          inventory_id: string
          product_id: string
          quantity: number
          stock_in_detail_id: string
          warehouse_location_id: string
        }
        Insert: {
          batch_id: string
          inventory_id: string
          product_id: string
          quantity: number
          stock_in_detail_id: string
          warehouse_location_id: string
        }
        Update: {
          batch_id?: string
          inventory_id?: string
          product_id?: string
          quantity?: number
          stock_in_detail_id?: string
          warehouse_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_inventory_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "batch_inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_items_stock_in_detail_id_fkey"
            columns: ["stock_in_detail_id"]
            isOneToOne: false
            referencedRelation: "stock_in_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_inventory_items_warehouse_location_id_fkey"
            columns: ["warehouse_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_items: {
        Row: {
          barcode: string
          barcode_id: string | null
          batch_id: string
          color: string | null
          created_at: string | null
          id: string
          location_id: string | null
          quantity: number
          size: string | null
          status: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          barcode: string
          barcode_id?: string | null
          batch_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          quantity: number
          size?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string
          barcode_id?: string | null
          batch_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          quantity?: number
          size?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_batch_id"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "processed_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batch_items_barcode_id"
            columns: ["barcode_id"]
            isOneToOne: false
            referencedRelation: "barcodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_location_id"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_warehouse_id"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_operations: {
        Row: {
          batch_number: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          destination_warehouse_id: string | null
          id: string
          notes: string | null
          operation_type: Database["public"]["Enums"]["movement_type"]
          source_warehouse_id: string | null
          status: Database["public"]["Enums"]["batch_status"] | null
        }
        Insert: {
          batch_number: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_warehouse_id?: string | null
          id?: string
          notes?: string | null
          operation_type: Database["public"]["Enums"]["movement_type"]
          source_warehouse_id?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
        }
        Update: {
          batch_number?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_warehouse_id?: string | null
          id?: string
          notes?: string | null
          operation_type?: Database["public"]["Enums"]["movement_type"]
          source_warehouse_id?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_operations_destination_warehouse_id_fkey"
            columns: ["destination_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_operations_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_inquiries: {
        Row: {
          converted_to_order: boolean | null
          created_at: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          message: string | null
          notes: string | null
          order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          converted_to_order?: boolean | null
          created_at?: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          converted_to_order?: boolean | null
          created_at?: string
          customer_company?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_inquiry_items: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          price: number | null
          product_id: string | null
          quantity: number
          specific_requirements: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          price?: number | null
          product_id?: string | null
          quantity: number
          specific_requirements?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          price?: number | null
          product_id?: string | null
          quantity?: number
          specific_requirements?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_inquiry_items_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "customer_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_inquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          barcode: string | null
          batch_id: string | null
          color: string | null
          created_at: string | null
          id: string
          last_updated_by: string | null
          location_id: string | null
          product_id: string
          quantity: number
          size: string | null
          status: string | null
          stock_in_detail_id: string | null
          stock_in_id: string | null
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          barcode?: string | null
          batch_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          location_id?: string | null
          product_id: string
          quantity?: number
          size?: string | null
          status?: string | null
          stock_in_detail_id?: string | null
          stock_in_id?: string | null
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          barcode?: string | null
          batch_id?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          location_id?: string | null
          product_id?: string
          quantity?: number
          size?: string | null
          status?: string | null
          stock_in_detail_id?: string | null
          stock_in_id?: string | null
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_inventory_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_updated_by"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_in_detail_id_fkey"
            columns: ["stock_in_detail_id"]
            isOneToOne: false
            referencedRelation: "stock_in_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_in_id_fkey"
            columns: ["stock_in_id"]
            isOneToOne: false
            referencedRelation: "stock_in"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: string
          inventory_id: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          quantity: number
          reference_id: string | null
          transfer_reference_id: string | null
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          quantity: number
          reference_id?: string | null
          transfer_reference_id?: string | null
        }
        Update: {
          id?: string
          inventory_id?: string | null
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          quantity?: number
          reference_id?: string | null
          transfer_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_summary: {
        Row: {
          last_updated: string | null
          product_category: string | null
          product_id: string
          product_name: string | null
          product_sku: string | null
          total_quantity: number
          updated_at: string | null
        }
        Insert: {
          last_updated?: string | null
          product_category?: string | null
          product_id: string
          product_name?: string | null
          product_sku?: string | null
          total_quantity?: number
          updated_at?: string | null
        }
        Update: {
          last_updated?: string | null
          product_category?: string | null
          product_id?: string
          product_name?: string | null
          product_sku?: string | null
          total_quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          reference: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          reference?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          reference?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transaction_inventory"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_details: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transfer_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_details_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_details_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          created_at: string | null
          destination_warehouse_id: string | null
          id: string
          initiated_by: string | null
          source_warehouse_id: string | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination_warehouse_id?: string | null
          id?: string
          initiated_by?: string | null
          source_warehouse_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination_warehouse_id?: string | null
          id?: string
          initiated_by?: string | null
          source_warehouse_id?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_destination_warehouse_id_fkey"
            columns: ["destination_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          inquiry_id: string | null
          items: Json | null
          order_date: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          inquiry_id?: string | null
          items?: Json | null
          order_date?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_company?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          inquiry_id?: string | null
          items?: Json | null
          order_date?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "customer_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_batches: {
        Row: {
          batch_number: string | null
          completed_at: string | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          processed_at: string
          processed_by: string
          product_id: string
          quantity_processed: number | null
          source: string | null
          status: string
          stock_in_id: string | null
          total_boxes: number
          total_items: number | null
          total_quantity: number
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          processed_at?: string
          processed_by: string
          product_id: string
          quantity_processed?: number | null
          source?: string | null
          status?: string
          stock_in_id?: string | null
          total_boxes?: number
          total_items?: number | null
          total_quantity?: number
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          processed_at?: string
          processed_by?: string
          product_id?: string
          quantity_processed?: number | null
          source?: string | null
          status?: string
          stock_in_id?: string | null
          total_boxes?: number
          total_items?: number | null
          total_quantity?: number
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_location_id"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_processed_batches_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_processed_batches_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_processed_by"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_warehouse_id"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_batches_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processed_batches_stock_in_id_fkey"
            columns: ["stock_in_id"]
            isOneToOne: false
            referencedRelation: "stock_in"
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
          active: boolean | null
          barcode: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          gst_category: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          sku: string | null
          specifications: Json | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gst_category?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          sku?: string | null
          specifications?: Json | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gst_category?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          sku?: string | null
          specifications?: Json | null
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          quantity: number
          requirements: string | null
          sales_order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          product_id: string
          quantity: number
          requirements?: string | null
          sales_order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          quantity?: number
          requirements?: string | null
          sales_order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          inquiry_id: string | null
          order_date: string
          pushed_to_stockout: boolean | null
          sales_order_number: string
          status: string
          stockout_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_company: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          inquiry_id?: string | null
          order_date?: string
          pushed_to_stockout?: boolean | null
          sales_order_number: string
          status?: string
          stockout_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_company?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          inquiry_id?: string | null
          order_date?: string
          pushed_to_stockout?: boolean | null
          sales_order_number?: string
          status?: string
          stockout_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "customer_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_stockout_id_fkey"
            columns: ["stockout_id"]
            isOneToOne: false
            referencedRelation: "stock_out"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_stockout_id_fkey"
            columns: ["stockout_id"]
            isOneToOne: false
            referencedRelation: "stock_out_with_products"
            referencedColumns: ["id"]
          },
        ]
      }
      serial_numbers: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string
          id: string
          operation_type: string
          reference_id: string
          reference_table: string
          serial_number: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          operation_type: string
          reference_id: string
          reference_table: string
          serial_number: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          operation_type?: string
          reference_id?: string
          reference_table?: string
          serial_number?: string
        }
        Relationships: []
      }
      stock_in: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          boxes: number | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          notes: string | null
          processed_by: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          product_id: string | null
          quantity: number | null
          rejection_reason: string | null
          source: string | null
          status: Database["public"]["Enums"]["stock_in_status"] | null
          submitted_by: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          boxes?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          product_id?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["stock_in_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          boxes?: number | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          product_id?: string | null
          quantity?: number | null
          rejection_reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["stock_in_status"] | null
          submitted_by?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
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
          batch_number: string | null
          color: string | null
          created_at: string | null
          error_message: string | null
          id: string
          location_id: string | null
          processed_at: string | null
          processing_order: number | null
          product_id: string | null
          quantity: number
          size: string | null
          status: Database["public"]["Enums"]["stock_in_detail_status"] | null
          stock_in_id: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          barcode?: string | null
          batch_number?: string | null
          color?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          location_id?: string | null
          processed_at?: string | null
          processing_order?: number | null
          product_id?: string | null
          quantity: number
          size?: string | null
          status?: Database["public"]["Enums"]["stock_in_detail_status"] | null
          stock_in_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string | null
          batch_number?: string | null
          color?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          location_id?: string | null
          processed_at?: string | null
          processing_order?: number | null
          product_id?: string | null
          quantity?: number
          size?: string | null
          status?: Database["public"]["Enums"]["stock_in_detail_status"] | null
          stock_in_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_details_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
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
          {
            foreignKeyName: "stock_in_details_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movement_audit: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          performed_at: string
          performed_by: string
          previous_quantity: number
          quantity: number
          reference_id: string | null
          reference_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          performed_at?: string
          performed_by: string
          previous_quantity: number
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          performed_at?: string
          performed_by?: string
          previous_quantity?: number
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movement_audit_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "stock_in_details"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          destination: string | null
          id: string
          notes: string | null
          requested_by: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["stock_status"] | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["stock_status"] | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          requested_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["stock_status"] | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_out_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out_details: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string | null
          product_id: string | null
          quantity: number
          stock_out_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          product_id?: string | null
          quantity: number
          stock_out_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          product_id?: string | null
          quantity?: number
          stock_out_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_out_details_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
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
          {
            foreignKeyName: "stock_out_details_stock_out_id_fkey"
            columns: ["stock_out_id"]
            isOneToOne: false
            referencedRelation: "stock_out_with_products"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          created_at: string | null
          floor: string | null
          id: string
          updated_at: string | null
          warehouse_id: string | null
          zone: string
        }
        Insert: {
          created_at?: string | null
          floor?: string | null
          id?: string
          updated_at?: string | null
          warehouse_id?: string | null
          zone: string
        }
        Update: {
          created_at?: string | null
          floor?: string | null
          id?: string
          updated_at?: string | null
          warehouse_id?: string | null
          zone?: string
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
          address: string | null
          code: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      inventory_details: {
        Row: {
          location_details: Json | null
          product_category: string | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          total_quantity: number | null
        }
        Relationships: []
      }
      inventory_transfers_with_details: {
        Row: {
          created_at: string | null
          destination_warehouse_id: string | null
          destination_warehouse_name: string | null
          id: string | null
          initiated_by: string | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number | null
          source_warehouse_id: string | null
          source_warehouse_name: string | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transfer_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            foreignKeyName: "inventory_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_locations: {
        Row: {
          floor: string | null
          product_id: string | null
          quantity: number | null
          warehouse_name: string | null
          zone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "fk_inventory_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out_with_products: {
        Row: {
          approved_by: string | null
          created_at: string | null
          destination: string | null
          id: string | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          requested_by: string | null
          status: Database["public"]["Enums"]["stock_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_out_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_details"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_out_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_out_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      export_table_data: {
        Args: { target_table: string }
        Returns: {
          insert_statement: string
        }[]
      }
      generate_table_sql: {
        Args: { p_table_name: string }
        Returns: string
      }
      get_inventory_quantity: {
        Args: { p_inventory_id: string; p_quantity: number }
        Returns: number
      }
      get_inventory_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          product_id: string
          total_quantity: number
          last_updated: string
          product_name: string
          product_sku: string
          product_category: string
        }[]
      }
      get_product_locations: {
        Args: { p_product_id: string }
        Returns: {
          product_id: string
          warehouse_name: string
          floor: number
          zone: string
          quantity: number
        }[]
      }
      list_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
        }[]
      }
      process_batch_transaction: {
        Args: {
          p_batch_id: string
          p_status: string
          p_processed_by: string
          p_warehouse_id: string
          p_location_id: string
          p_quantity: number
          p_notes?: string
        }
        Returns: string
      }
      transaction_create_batch_with_items: {
        Args: { batch_data: Json }
        Returns: Json
      }
    }
    Enums: {
      batch_status: "pending" | "processing" | "completed" | "failed"
      movement_status:
        | "pending"
        | "approved"
        | "rejected"
        | "in_transit"
        | "completed"
      movement_type:
        | "in"
        | "out"
        | "transfer"
        | "adjustment"
        | "reserve"
        | "release"
      stock_in_detail_status: "pending" | "processing" | "completed" | "failed"
      stock_in_status:
        | "pending"
        | "processing"
        | "completed"
        | "approved"
        | "rejected"
        | "failed"
      stock_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "from_sales_order"
      transfer_status: "pending" | "in_transit" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      batch_status: ["pending", "processing", "completed", "failed"],
      movement_status: [
        "pending",
        "approved",
        "rejected",
        "in_transit",
        "completed",
      ],
      movement_type: [
        "in",
        "out",
        "transfer",
        "adjustment",
        "reserve",
        "release",
      ],
      stock_in_detail_status: ["pending", "processing", "completed", "failed"],
      stock_in_status: [
        "pending",
        "processing",
        "completed",
        "approved",
        "rejected",
        "failed",
      ],
      stock_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "from_sales_order",
      ],
      transfer_status: ["pending", "in_transit", "completed", "cancelled"],
    },
  },
} as const
