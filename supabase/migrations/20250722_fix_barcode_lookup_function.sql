-- Create comprehensive barcode lookup function to fix duplication issues
-- This function searches across all barcode storage tables with proper priority

CREATE OR REPLACE FUNCTION public.find_inventory_by_barcode(search_barcode TEXT)
RETURNS TABLE (
    inventory_id UUID,
    barcode TEXT,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    quantity INTEGER,
    status TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    location_id UUID,
    floor TEXT,
    zone TEXT,
    color TEXT,
    size TEXT,
    batch_id UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First priority: Look in inventory table (most current state)
    RETURN QUERY
    SELECT 
        i.id as inventory_id,
        i.barcode,
        i.product_id,
        p.name as product_name,
        p.sku as product_sku,
        i.quantity,
        i.status,
        i.warehouse_id,
        w.name as warehouse_name,
        i.location_id,
        wl.floor::TEXT,
        wl.zone,
        i.color,
        i.size,
        i.batch_id,
        i.created_at
    FROM 
        public.inventory i
        LEFT JOIN public.products p ON i.product_id = p.id
        LEFT JOIN public.warehouses w ON i.warehouse_id = w.id
        LEFT JOIN public.warehouse_locations wl ON i.location_id = wl.id
    WHERE 
        i.barcode = search_barcode
        AND i.status != 'deleted'
    LIMIT 1;

    -- If found in inventory, return immediately
    IF FOUND THEN
        RETURN;
    END IF;

    -- Second priority: Look in barcodes table (processed items)
    RETURN QUERY
    SELECT 
        b.id as inventory_id,
        b.barcode,
        b.product_id,
        p.name as product_name,
        p.sku as product_sku,
        b.quantity,
        b.status,
        b.warehouse_id,
        w.name as warehouse_name,
        b.location_id,
        wl.floor::TEXT,
        wl.zone,
        NULL::TEXT as color,
        NULL::TEXT as size,
        b.batch_id,
        b.created_at
    FROM 
        public.barcodes b
        LEFT JOIN public.products p ON b.product_id = p.id
        LEFT JOIN public.warehouses w ON b.warehouse_id = w.id
        LEFT JOIN public.warehouse_locations wl ON b.location_id = wl.id
    WHERE 
        b.barcode = search_barcode
        AND b.status = 'active'
    LIMIT 1;

    -- If found in barcodes, return immediately
    IF FOUND THEN
        RETURN;
    END IF;

    -- Third priority: Look in batch_items table with barcode field
    RETURN QUERY
    SELECT 
        bi.id as inventory_id,
        bi.barcode,
        bi.product_id,
        p.name as product_name,
        p.sku as product_sku,
        bi.quantity,
        bi.status,
        bi.warehouse_id,
        w.name as warehouse_name,
        bi.location_id,
        wl.floor::TEXT,
        wl.zone,
        bi.color,
        bi.size,
        bi.batch_id,
        bi.created_at
    FROM 
        public.batch_items bi
        LEFT JOIN public.products p ON bi.product_id = p.id
        LEFT JOIN public.warehouses w ON bi.warehouse_id = w.id
        LEFT JOIN public.warehouse_locations wl ON bi.location_id = wl.id
    WHERE 
        bi.barcode = search_barcode
        AND bi.status != 'deleted'
    LIMIT 1;

    RETURN;
END;
$$;

-- Create an index on barcode fields for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_barcode_lookup ON public.inventory (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_batch_items_barcode_lookup ON public.batch_items (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_barcodes_barcode_lookup ON public.barcodes (barcode) WHERE barcode IS NOT NULL;

-- Create a function to fix any barcode data inconsistencies
CREATE OR REPLACE FUNCTION public.fix_barcode_consistency()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    fixed_count INTEGER := 0;
    inconsistent_record RECORD;
BEGIN
    -- Find and fix cases where batch_items have barcode but no barcode_id reference
    FOR inconsistent_record IN 
        SELECT bi.id, bi.barcode, b.id as barcode_table_id
        FROM public.batch_items bi
        LEFT JOIN public.barcodes b ON bi.barcode = b.barcode
        WHERE bi.barcode IS NOT NULL 
        AND bi.barcode_id IS NULL
        AND b.id IS NOT NULL
    LOOP
        UPDATE public.batch_items 
        SET barcode_id = inconsistent_record.barcode_table_id
        WHERE id = inconsistent_record.id;
        fixed_count := fixed_count + 1;
    END LOOP;

    RETURN 'Fixed ' || fixed_count || ' inconsistent barcode references';
END;
$$; 