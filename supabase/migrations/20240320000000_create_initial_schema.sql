-- Create custom types
DO $$ 
BEGIN
    -- Create custom types if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_status') THEN
        CREATE TYPE inquiry_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_out_status') THEN
        CREATE TYPE stock_out_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reserve_stock_status') THEN
        CREATE TYPE reserve_stock_status AS ENUM ('pending', 'cancelled', 'pushed_to_stock_out', 'returned_to_inventory');
    END IF;
END $$;

-- Create ENUM types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_status') THEN
    CREATE TYPE stock_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_out_status') THEN
    CREATE TYPE stock_out_status AS ENUM ('pending', 'approved', 'completed', 'rejected');
  END IF;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'warehouse_manager'::text, 'field_operator'::text, 'sales_operator'::text])),
    created_at timestamptz DEFAULT now(),
    active boolean DEFAULT true,
    username text NOT NULL UNIQUE,
    name text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    location text,
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    updated_at timestamptz DEFAULT now(),
    code varchar
);

CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    sku text UNIQUE,
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    updated_by uuid REFERENCES public.profiles(id),
    updated_at timestamptz DEFAULT now(),
    category text
);

CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
    zone text NOT NULL,
    floor text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id),
    warehouse_id uuid REFERENCES public.warehouses(id),
    location_id uuid,
    barcode text UNIQUE,
    quantity integer NOT NULL,
    status text DEFAULT 'available',
    created_at timestamptz DEFAULT now(),
    warehouse_location_id uuid REFERENCES public.warehouse_locations(id),
    color text,
    size text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_in (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    boxes jsonb DEFAULT '[]'::jsonb,
    notes text,
    product_id uuid REFERENCES public.products(id),
    source text NOT NULL,
    processed_by uuid REFERENCES auth.users(id),
    batch_id uuid,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    updated_at timestamptz DEFAULT now(),
    rejection_reason text,
    number_of_boxes integer DEFAULT 0,
    warehouse_id uuid REFERENCES public.warehouses(id),
    quantity integer DEFAULT 0,
    submitted_by uuid NOT NULL REFERENCES public.profiles(id),
    batch_barcode text,
    box_barcodes text[],
    quantity_per_box integer,
    color text,
    size text
);

CREATE TABLE IF NOT EXISTS public.stock_in_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_in_id uuid REFERENCES public.stock_in(id),
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL,
    barcode text,
    created_at timestamptz DEFAULT now(),
    color text,
    size text,
    batch_number text
);

CREATE TABLE IF NOT EXISTS public.processed_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id uuid REFERENCES public.warehouses(id),
    product_id uuid REFERENCES public.products(id),
    processed_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    status text DEFAULT 'completed',
    total_boxes integer DEFAULT 0,
    total_quantity integer DEFAULT 0,
    source text,
    notes text,
    processed_at timestamptz DEFAULT now(),
    submitted_by uuid REFERENCES auth.users(id),
    batch_number text,
    location_id uuid REFERENCES public.warehouse_locations(id),
    quantity_processed integer NOT NULL DEFAULT 0,
    stock_in_id uuid REFERENCES public.stock_in(id),
    code text,
    barcode_prefix varchar,
    color text,
    size text
);

CREATE TABLE IF NOT EXISTS public.batch_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid REFERENCES public.processed_batches(id),
    inventory_id uuid REFERENCES public.inventory(id),
    quantity integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_inquiry_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id uuid,
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.barcode_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scanned_by uuid REFERENCES public.profiles(id),
    barcode text,
    action text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name text,
    customer_email text,
    product_id uuid REFERENCES public.products(id),
    requested_price numeric,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movement_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id uuid REFERENCES public.inventory(id),
    action text,
    quantity integer,
    performed_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid REFERENCES public.processed_batches(id),
    operation text,
    performed_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_inventory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid REFERENCES public.processed_batches(id),
    inventory_id uuid REFERENCES public.inventory(id),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_boxes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id uuid REFERENCES public.processed_batches(id),
    box_number integer NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_box_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    box_id uuid REFERENCES public.batch_boxes(id),
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL DEFAULT 0,
    color text,
    size text,
    barcode text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_inquiries (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL,
    status inquiry_status DEFAULT 'pending',
    notes text,
    customer_name text,
    customer_email text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.sales_inquiry_responses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id uuid REFERENCES public.sales_inquiries(id),
    responder_id uuid REFERENCES auth.users(id),
    response_text text NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiated_by uuid REFERENCES auth.users(id),
    source_warehouse_id uuid REFERENCES public.warehouses(id),
    destination_warehouse_id uuid REFERENCES public.warehouses(id),
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL,
    status text DEFAULT 'pending',
    transfer_reason text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    email text,
    created_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    warehouse text NOT NULL,
    zone text NOT NULL,
    floor text NOT NULL,
    rack text,
    shelf text,
    status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    batch_number text NOT NULL UNIQUE,
    product_id uuid NOT NULL REFERENCES public.products(id),
    manufacture_date date,
    expiry_date date,
    quantity integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.boxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    barcode text NOT NULL UNIQUE,
    batch_id uuid NOT NULL REFERENCES public.batches(id),
    quantity integer NOT NULL DEFAULT 0,
    location_id uuid REFERENCES public.locations(id),
    status text NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS public.stock_out_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    product_id uuid NOT NULL REFERENCES public.products(id),
    requester_id uuid NOT NULL REFERENCES auth.users(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    status stock_out_status DEFAULT 'pending',
    destination text NOT NULL,
    approved_by uuid REFERENCES auth.users(id),
    invoice_number text,
    packing_slip_number text,
    reservation_id uuid,
    notes text
);

CREATE TABLE IF NOT EXISTS public.stock_out_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.stock_out_requests(id),
    product_id uuid NOT NULL REFERENCES public.products(id),
    batch_id uuid NOT NULL REFERENCES public.batches(id),
    box_id uuid NOT NULL REFERENCES public.boxes(id),
    requested_quantity integer NOT NULL CHECK (requested_quantity > 0),
    processed_quantity integer CHECK (processed_quantity >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_out (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id),
    requested_by uuid REFERENCES public.user_profiles(id),
    approved_by uuid REFERENCES public.user_profiles(id),
    rejected_by uuid REFERENCES public.user_profiles(id),
    completed_by uuid REFERENCES public.user_profiles(id),
    quantity integer NOT NULL,
    approved_quantity integer,
    status text NOT NULL DEFAULT 'pending',
    destination text NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now(),
    approved_at timestamptz,
    rejected_at timestamptz,
    completed_at timestamptz,
    invoice_number text,
    packing_slip_number text,
    reservation_id uuid REFERENCES public.reserve_stock(id)
);

CREATE TABLE IF NOT EXISTS public.stock_out_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_out_id uuid REFERENCES public.stock_out(id),
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL,
    processed_quantity integer DEFAULT 0,
    status text DEFAULT 'pending',
    barcode text,
    batch_id text,
    processed_by uuid REFERENCES public.user_profiles(id),
    processed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reserve_stock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id),
    warehouse_id uuid REFERENCES public.warehouses(id),
    location_id uuid REFERENCES public.warehouse_locations(id),
    quantity integer NOT NULL,
    requested_by uuid NOT NULL REFERENCES public.user_profiles(id),
    requested_at timestamptz DEFAULT now(),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    duration_days integer NOT NULL DEFAULT 7,
    return_date timestamptz NOT NULL DEFAULT (now() + '7 days'::interval),
    status reserve_stock_status NOT NULL DEFAULT 'pending',
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    end_date date NOT NULL DEFAULT (CURRENT_DATE + '7 days'::interval),
    stock_out_id uuid REFERENCES public.stock_out(id)
);

-- Add comments
COMMENT ON COLUMN public.products.created_at IS 'When the product was created';
COMMENT ON COLUMN public.products.is_active IS 'Whether the product is active and visible';
COMMENT ON COLUMN public.products.created_by IS 'The user who created this product';
COMMENT ON COLUMN public.products.updated_by IS 'The user who last updated this product';
COMMENT ON COLUMN public.products.updated_at IS 'When the product was last updated';

COMMENT ON COLUMN public.stock_in.boxes IS 'JSON array containing box information for this stock-in request';
COMMENT ON COLUMN public.stock_in.notes IS 'Additional notes or comments for the stock-in request';
COMMENT ON COLUMN public.stock_in.product_id IS 'Reference to the product being stocked in';
COMMENT ON COLUMN public.stock_in.source IS 'Source of the stock (e.g., supplier name)';
COMMENT ON COLUMN public.stock_in.processed_by IS 'User who processed the stock-in request';
COMMENT ON COLUMN public.stock_in.batch_id IS 'Reference to the batch if part of batch processing';
COMMENT ON COLUMN public.stock_in.processing_started_at IS 'When processing of this stock-in request began';
COMMENT ON COLUMN public.stock_in.processing_completed_at IS 'When processing of this stock-in request completed';
COMMENT ON COLUMN public.stock_in.updated_at IS 'Last update timestamp';
COMMENT ON COLUMN public.stock_in.rejection_reason IS 'Reason if the stock-in request was rejected';
COMMENT ON COLUMN public.stock_in.number_of_boxes IS 'Number of boxes in this stock-in request'; 