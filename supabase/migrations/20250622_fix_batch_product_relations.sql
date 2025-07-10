-- Migration to fix batch items, products, and locations relations
-- This ensures proper foreign key relationships for barcode scanning

-- First, make sure the products table has the right structure
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Make sure warehouses table exists
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Make sure locations table exists with proper foreign keys
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Make sure batches table exists with proper foreign keys
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Make sure batch_items table exists with proper foreign keys
CREATE TABLE IF NOT EXISTS public.batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE NOT NULL,
  batch_id UUID REFERENCES public.batches(id),
  product_id UUID REFERENCES public.products(id),
  location_id UUID REFERENCES public.locations(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_batch_items_barcode ON public.batch_items(barcode);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON public.batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_items_product_id ON public.batch_items(product_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_location_id ON public.batch_items(location_id);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;

-- Handle policies for products table
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.products;
CREATE POLICY "Allow authenticated read access" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.products FOR UPDATE USING (auth.role() = 'authenticated');

-- Handle policies for warehouses table
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.warehouses;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.warehouses;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.warehouses;
CREATE POLICY "Allow authenticated read access" ON public.warehouses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.warehouses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.warehouses FOR UPDATE USING (auth.role() = 'authenticated');

-- Handle policies for locations table
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.locations;
CREATE POLICY "Allow authenticated read access" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.locations FOR UPDATE USING (auth.role() = 'authenticated');

-- Handle policies for batches table
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.batches;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.batches;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.batches;
CREATE POLICY "Allow authenticated read access" ON public.batches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.batches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.batches FOR UPDATE USING (auth.role() = 'authenticated');

-- Handle policies for batch_items table
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.batch_items;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.batch_items;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.batch_items;
CREATE POLICY "Allow authenticated read access" ON public.batch_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert access" ON public.batch_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update access" ON public.batch_items FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert sample data for testing if tables are empty
INSERT INTO public.products (name, description)
SELECT 'Sample Product 1', 'This is a sample product for testing'
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1);

INSERT INTO public.warehouses (name, location)
SELECT 'Main Warehouse', 'Building A'
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses LIMIT 1);

-- Get the IDs of the sample data
DO $$
DECLARE
  product_id UUID;
  warehouse_id UUID;
  location_id UUID;
  batch_id UUID;
BEGIN
  -- Get or create product
  SELECT id INTO product_id FROM public.products LIMIT 1;
  
  -- Get or create warehouse
  SELECT id INTO warehouse_id FROM public.warehouses LIMIT 1;
  
  -- Create location if needed
  IF NOT EXISTS (SELECT 1 FROM public.locations LIMIT 1) THEN
    INSERT INTO public.locations (name, warehouse_id)
    VALUES ('Section A1', warehouse_id)
    RETURNING id INTO location_id;
  ELSE
    SELECT id INTO location_id FROM public.locations LIMIT 1;
  END IF;
  
  -- Create batch if needed
  IF NOT EXISTS (SELECT 1 FROM public.batches LIMIT 1) THEN
    INSERT INTO public.batches (batch_number, product_id, warehouse_id)
    VALUES ('BATCH001', product_id, warehouse_id)
    RETURNING id INTO batch_id;
  ELSE
    SELECT id INTO batch_id FROM public.batches LIMIT 1;
  END IF;
  
  -- Create batch item if needed
  IF NOT EXISTS (SELECT 1 FROM public.batch_items LIMIT 1) THEN
    INSERT INTO public.batch_items (barcode, batch_id, product_id, location_id, quantity)
    VALUES ('4893781750413368396001', batch_id, product_id, location_id, 10);
  END IF;
END;
$$;
