-- Fix function to properly handle location data
CREATE OR REPLACE FUNCTION public.get_barcode_details_fast(p_barcode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_barcode_record RECORD;
  v_product_name TEXT;
  v_warehouse_name TEXT;
  v_location_name TEXT;
  result JSONB;
BEGIN
  -- First get the barcode record
  SELECT * INTO v_barcode_record
  FROM public.barcodes
  WHERE barcode = p_barcode;
  
  IF v_barcode_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get product name
  SELECT name INTO v_product_name
  FROM public.products
  WHERE id = v_barcode_record.product_id;
  
  -- Get warehouse name
  SELECT name INTO v_warehouse_name
  FROM public.warehouses
  WHERE id = v_barcode_record.warehouse_id;
  
  -- Get location name - make sure this query works
  IF v_barcode_record.location_id IS NOT NULL THEN
    SELECT name INTO v_location_name
    FROM public.locations
    WHERE id = v_barcode_record.location_id;
  END IF;
  
  -- Build the result
  result := jsonb_build_object(
    'id', v_barcode_record.id,
    'barcode', v_barcode_record.barcode,
    'product_id', v_barcode_record.product_id,
    'product_name', v_product_name,
    'batch_id', v_barcode_record.batch_id,
    'quantity', v_barcode_record.quantity,
    'location_id', v_barcode_record.location_id,
    'location_name', v_location_name,
    'warehouse_id', v_barcode_record.warehouse_id,
    'warehouse_name', v_warehouse_name
  );
  
  RETURN result;
END;
$$;
