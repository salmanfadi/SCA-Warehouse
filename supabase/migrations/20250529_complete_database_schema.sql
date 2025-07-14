-- Migration: Complete Database Schema
-- Created: 2025-05-29
-- Description: This migration contains the complete schema of all tables, constraints, indexes, and policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: barcodes
CREATE TABLE IF NOT EXISTS public.barcodes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    barcode text NOT NULL,
    batch_id uuid,
    box_id uuid,
    product_id uuid,
    warehouse_id uuid,
    location_id uuid,
    quantity integer NOT NULL,
    created_by uuid,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT barcodes_pkey PRIMARY KEY (id),
    CONSTRAINT barcodes_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES processed_batches(id),
    CONSTRAINT barcodes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT barcodes_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT barcodes_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT barcodes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
CREATE INDEX idx_barcodes_barcode ON public.barcodes USING btree (barcode);
CREATE INDEX idx_barcodes_batch_id ON public.barcodes USING btree (batch_id);
CREATE INDEX idx_barcodes_product_id ON public.barcodes USING btree (product_id);
CREATE INDEX idx_barcodes_warehouse_id ON public.barcodes USING btree (warehouse_id);
CREATE INDEX idx_barcodes_location_id ON public.barcodes USING btree (location_id);

-- Table: batch_inventory_items
CREATE TABLE IF NOT EXISTS public.batch_inventory_items (
    batch_id uuid NOT NULL,
    inventory_id uuid NOT NULL,
    product_id uuid NOT NULL,
    warehouse_location_id uuid NOT NULL,
    stock_in_detail_id uuid NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT batch_inventory_items_pkey PRIMARY KEY (batch_id, inventory_id, product_id, warehouse_location_id, stock_in_detail_id),
    CONSTRAINT batch_inventory_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_operations(id),
    CONSTRAINT batch_inventory_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Table: batch_items
CREATE TABLE IF NOT EXISTS public.batch_items (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    batch_id uuid,
    product_id uuid,
    warehouse_id uuid,
    location_id uuid,
    barcode_id uuid,
    color text,
    size text,
    quantity integer,
    status text DEFAULT 'available'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT batch_items_pkey PRIMARY KEY (id),
    CONSTRAINT fk_batch_id FOREIGN KEY (batch_id) REFERENCES processed_batches(id),
    CONSTRAINT fk_location_id FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT fk_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
CREATE INDEX idx_batch_items_batch_id ON public.batch_items USING btree (batch_id);
CREATE INDEX idx_batch_items_warehouse_id ON public.batch_items USING btree (warehouse_id);
CREATE INDEX idx_batch_items_location_id ON public.batch_items USING btree (location_id);

-- Table: batch_operations
CREATE TABLE IF NOT EXISTS public.batch_operations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    operation_type text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT batch_operations_pkey PRIMARY KEY (id),
    CONSTRAINT batch_operations_operation_type_check CHECK ((operation_type = ANY (ARRAY['stock_in'::text, 'stock_out'::text, 'transfer'::text, 'adjustment'::text]))),
    CONSTRAINT batch_operations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);

-- Table: inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    quantity integer NOT NULL,
    status varchar(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_product_id_warehouse_id_location_id_key UNIQUE (product_id, warehouse_id, location_id),
    CONSTRAINT inventory_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
CREATE INDEX idx_inventory_product_id ON public.inventory USING btree (product_id);
CREATE INDEX idx_inventory_warehouse_id ON public.inventory USING btree (warehouse_id);
CREATE INDEX idx_inventory_location_id ON public.inventory USING btree (location_id);

-- Table: inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    source_warehouse_id uuid,
    source_location_id uuid,
    destination_warehouse_id uuid,
    destination_location_id uuid,
    quantity integer NOT NULL,
    movement_type text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT inventory_movements_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT inventory_movements_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_movements_destination_warehouse_id_fkey FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT inventory_movements_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_movements_source_warehouse_id_fkey FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id)
);

-- Table: inventory_transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    quantity integer NOT NULL,
    transaction_type text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT inventory_transactions_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT inventory_transactions_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: inventory_transfer_details
CREATE TABLE IF NOT EXISTS public.inventory_transfer_details (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    transfer_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inventory_transfer_details_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_transfer_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT inventory_transfer_details_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id)
);

-- Table: inventory_transfers
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    source_warehouse_id uuid NOT NULL,
    source_location_id uuid,
    destination_warehouse_id uuid NOT NULL,
    destination_location_id uuid,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    approved_by uuid,
    received_by uuid,
    approved_at timestamp with time zone,
    received_at timestamp with time zone,
    notes text,
    CONSTRAINT inventory_transfers_pkey PRIMARY KEY (id),
    CONSTRAINT inventory_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id),
    CONSTRAINT inventory_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT inventory_transfers_destination_location_id_fkey FOREIGN KEY (destination_location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_transfers_destination_warehouse_id_fkey FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT inventory_transfers_received_by_fkey FOREIGN KEY (received_by) REFERENCES profiles(id),
    CONSTRAINT inventory_transfers_source_location_id_fkey FOREIGN KEY (source_location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT inventory_transfers_source_warehouse_id_fkey FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id)
);

-- Table: inventory_transfers_with_details
CREATE TABLE IF NOT EXISTS public.inventory_transfers_with_details (
    id uuid,
    source_warehouse_id uuid,
    source_warehouse_name text,
    source_location_id uuid,
    source_location_name text,
    destination_warehouse_id uuid,
    destination_warehouse_name text,
    destination_location_id uuid,
    destination_location_name text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by uuid,
    creator_name text,
    approved_by uuid,
    approver_name text,
    received_by uuid,
    receiver_name text,
    approved_at timestamp with time zone,
    received_at timestamp with time zone,
    notes text,
    products jsonb
);

-- Table: locations
CREATE TABLE IF NOT EXISTS public.locations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    warehouse_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT locations_pkey PRIMARY KEY (id),
    CONSTRAINT locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    link text,
    type text,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Table: processed_batches
CREATE TABLE IF NOT EXISTS public.processed_batches (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    batch_number text NOT NULL,
    stock_in_id uuid,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    quantity_per_box integer NOT NULL,
    total_boxes integer NOT NULL,
    color text,
    size text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    processed_by uuid,
    notes text,
    CONSTRAINT processed_batches_pkey PRIMARY KEY (id),
    CONSTRAINT fk_location_id FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT fk_product_id FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_stock_in_id FOREIGN KEY (stock_in_id) REFERENCES stock_in(id),
    CONSTRAINT fk_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
CREATE INDEX idx_processed_batches_stock_in_id ON public.processed_batches USING btree (stock_in_id);
CREATE INDEX idx_processed_batches_product_id ON public.processed_batches USING btree (product_id);
CREATE INDEX idx_processed_batches_warehouse_id ON public.processed_batches USING btree (warehouse_id);
CREATE INDEX idx_processed_batches_location_id ON public.processed_batches USING btree (location_id);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    sku text,
    description text,
    category text,
    subcategory text,
    unit text,
    price numeric(10,2),
    cost numeric(10,2),
    min_stock_level integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    is_active boolean DEFAULT true,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_sku_key UNIQUE (sku),
    CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    role text,
    name text,
    username text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'warehouse_manager'::text, 'field_operator'::text, 'sales_operator'::text, 'customer'::text])))
);

-- Table: stock_in
CREATE TABLE IF NOT EXISTS public.stock_in (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid,
    quantity integer NOT NULL,
    boxes integer,
    submitter_id uuid,
    submitter_name text,
    submitter_username text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source text,
    warehouse_id uuid,
    location_id uuid,
    notes text,
    CONSTRAINT stock_in_pkey PRIMARY KEY (id),
    CONSTRAINT stock_in_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT stock_in_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT stock_in_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES profiles(id),
    CONSTRAINT stock_in_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);
CREATE INDEX idx_stock_in_product_id ON public.stock_in USING btree (product_id);
CREATE INDEX idx_stock_in_warehouse_id ON public.stock_in USING btree (warehouse_id);

-- Table: stock_in_details
CREATE TABLE IF NOT EXISTS public.stock_in_details (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_in_id uuid NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_in_details_pkey PRIMARY KEY (id),
    CONSTRAINT stock_in_details_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT stock_in_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT stock_in_details_stock_in_id_fkey FOREIGN KEY (stock_in_id) REFERENCES stock_in(id),
    CONSTRAINT stock_in_details_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: stock_movement_audit
CREATE TABLE IF NOT EXISTS public.stock_movement_audit (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    location_id uuid,
    quantity integer NOT NULL,
    movement_type text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT stock_movement_audit_pkey PRIMARY KEY (id),
    CONSTRAINT stock_movement_audit_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id),
    CONSTRAINT stock_movement_audit_location_id_fkey FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
    CONSTRAINT stock_movement_audit_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT stock_movement_audit_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: stock_out
CREATE TABLE IF NOT EXISTS public.stock_out (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    requester_id uuid,
    requester_name text,
    requester_username text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    warehouse_id uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    notes text,
    destination text,
    CONSTRAINT stock_out_pkey PRIMARY KEY (id),
    CONSTRAINT stock_out_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id),
    CONSTRAINT stock_out_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES profiles(id),
    CONSTRAINT stock_out_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: stock_out_details
CREATE TABLE IF NOT EXISTS public.stock_out_details (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stock_out_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_out_details_pkey PRIMARY KEY (id),
    CONSTRAINT stock_out_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT stock_out_details_stock_out_id_fkey FOREIGN KEY (stock_out_id) REFERENCES stock_out(id)
);

-- Table: stock_out_with_products
CREATE TABLE IF NOT EXISTS public.stock_out_with_products (
    id uuid,
    requester_id uuid,
    requester_name text,
    status text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    warehouse_id uuid,
    warehouse_name text,
    approved_by uuid,
    approver_name text,
    approved_at timestamp with time zone,
    notes text,
    destination text,
    products jsonb
);

-- Table: warehouse_locations
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    warehouse_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT warehouse_locations_pkey PRIMARY KEY (id),
    CONSTRAINT warehouse_locations_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Table: warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    code text,
    address text,
    contact_person text,
    contact_phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    location text,
    CONSTRAINT warehouses_pkey PRIMARY KEY (id),
    CONSTRAINT warehouses_code_key UNIQUE (code)
);

-- RLS Policies

-- Barcodes policies
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for warehouse staff" ON public.barcodes
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))));
CREATE POLICY "Enable read access for all authenticated users" ON public.barcodes
    FOR SELECT
    TO authenticated
    USING (true);

-- Batch items policies
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for warehouse staff" ON public.batch_items
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))));
CREATE POLICY "Enable read access for all authenticated users" ON public.batch_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Processed batches policies
ALTER TABLE public.processed_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for warehouse staff" ON public.processed_batches
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))));
CREATE POLICY "Enable read access for all authenticated users" ON public.processed_batches
    FOR SELECT
    TO authenticated
    USING (true);
CREATE POLICY "processed_batches_insert" ON public.processed_batches
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
CREATE POLICY "processed_batches_select" ON public.processed_batches
    FOR SELECT
    TO authenticated
    USING (true);
CREATE POLICY "processed_batches_update" ON public.processed_batches
    FOR UPDATE
    TO authenticated
    USING ((auth.uid() = processed_by));

-- Products policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for admins" ON public.products
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Enable read access for all authenticated users" ON public.products
    FOR SELECT
    TO authenticated
    USING (true);

-- Stock in policies
ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for warehouse staff" ON public.stock_in
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text, 'field_operator'::text]))))));
CREATE POLICY "Allow read access to all authenticated users" ON public.stock_in
    FOR SELECT
    TO authenticated
    USING (true);

-- Warehouse locations policies
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for warehouse staff" ON public.warehouse_locations
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['warehouse_manager'::text, 'admin'::text]))))));
CREATE POLICY "Enable read access for all authenticated users" ON public.warehouse_locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Warehouses policies
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for admins" ON public.warehouses
    FOR ALL
    TO public
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Enable read access for all authenticated users" ON public.warehouses
    FOR SELECT
    TO authenticated
    USING (true);
