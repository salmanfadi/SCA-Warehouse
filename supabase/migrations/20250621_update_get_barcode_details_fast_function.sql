-- Update function to return all names in a single query
CREATE OR REPLACE FUNCTION public.get_barcode_details_fast(p_barcode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', b.id,
      'barcode', b.barcode,
      'product_id', b.product_id,
      'product_name', p.name,
      'batch_id', b.batch_id,
      'quantity', b.quantity,
      'location_id', b.location_id,
      'location_name', l.name,
      'warehouse_id', b.warehouse_id,
      'warehouse_name', w.name
    ) INTO result
  FROM 
    public.barcodes b
    LEFT JOIN public.products p ON b.product_id = p.id
    LEFT JOIN public.warehouses w ON b.warehouse_id = w.id
    LEFT JOIN public.locations l ON b.location_id = l.id
  WHERE 
    b.barcode = p_barcode;

  RETURN result;
END;
$$;
