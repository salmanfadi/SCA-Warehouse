-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    contact_person TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    location TEXT
);

-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    unit TEXT,
    price NUMERIC(10,2),
    cost NUMERIC(10,2),
    min_stock_level INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    is_active BOOLEAN DEFAULT true
);

-- Create stock_in table
CREATE TABLE IF NOT EXISTS public.stock_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    boxes INTEGER,
    submitter_id UUID,
    submitter_name TEXT,
    submitter_username TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    source TEXT,
    warehouse_id UUID REFERENCES public.warehouses(id),
    location_id UUID,
    notes TEXT
);

-- Create processed_batches table
CREATE TABLE IF NOT EXISTS public.processed_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number TEXT NOT NULL,
    stock_in_id UUID,
    product_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    quantity_per_box INTEGER NOT NULL,
    total_boxes INTEGER NOT NULL,
    color TEXT,
    size TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    processed_by UUID,
    notes TEXT
);

-- Create barcodes table
CREATE TABLE IF NOT EXISTS public.barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT NOT NULL,
    batch_id UUID REFERENCES public.processed_batches(id),
    box_id UUID,
    product_id UUID REFERENCES public.products(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    quantity INTEGER NOT NULL,
    created_by UUID,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create batch_items table (for tracking individual items in a batch)
CREATE TABLE IF NOT EXISTS public.batch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES public.processed_batches(id),
    product_id UUID,
    warehouse_id UUID REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    barcode_id UUID,
    color TEXT,
    size TEXT,
    quantity INTEGER,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Row Level Security (RLS) policies

-- Enable RLS on tables
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;

-- Warehouses policies
CREATE POLICY "Enable all operations for admins" ON public.warehouses
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Enable read access for all authenticated users" ON public.warehouses
    FOR SELECT TO authenticated
    USING (true);

-- Warehouse locations policies
CREATE POLICY "Enable all operations for warehouse staff" ON public.warehouse_locations
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin')));

CREATE POLICY "Enable read access for all authenticated users" ON public.warehouse_locations
    FOR SELECT TO authenticated
    USING (true);

-- Products policies
CREATE POLICY "Enable all operations for admins" ON public.products
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Enable read access for all authenticated users" ON public.products
    FOR SELECT TO authenticated
    USING (true);

-- Stock_in policies
CREATE POLICY "Enable all operations for warehouse staff" ON public.stock_in
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')));

CREATE POLICY "Allow read access to all authenticated users" ON public.stock_in
    FOR SELECT TO authenticated
    USING (true);

-- Processed_batches policies
CREATE POLICY "Enable all operations for warehouse staff" ON public.processed_batches
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')));

CREATE POLICY "Enable read access for all authenticated users" ON public.processed_batches
    FOR SELECT TO authenticated
    USING (true);

-- Barcodes policies
CREATE POLICY "Enable all operations for warehouse staff" ON public.barcodes
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')));

CREATE POLICY "Enable read access for all authenticated users" ON public.barcodes
    FOR SELECT TO authenticated
    USING (true);

-- Batch_items policies
CREATE POLICY "Enable all operations for warehouse staff" ON public.batch_items
    FOR ALL TO public
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('warehouse_manager', 'admin', 'field_operator')));

CREATE POLICY "Enable read access for all authenticated users" ON public.batch_items
    FOR SELECT TO authenticated
    USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_barcodes_batch_id ON public.barcodes(batch_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_product_id ON public.barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_warehouse_id ON public.barcodes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_location_id ON public.barcodes(location_id);
CREATE INDEX IF NOT EXISTS idx_processed_batches_stock_in_id ON public.processed_batches(stock_in_id);
CREATE INDEX IF NOT EXISTS idx_processed_batches_product_id ON public.processed_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_processed_batches_warehouse_id ON public.processed_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_processed_batches_location_id ON public.processed_batches(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_product_id ON public.stock_in(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_warehouse_id ON public.stock_in(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON public.batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_warehouse_id ON public.batch_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_location_id ON public.batch_items(location_id);