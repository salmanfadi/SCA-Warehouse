-- Create a function to get barcode details with a single query
CREATE OR REPLACE FUNCTION public.get_barcode_details(p_barcode TEXT)
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
      'batch_id', b.batch_id,
      'quantity', b.quantity,
      'location_id', b.location_id,
      'warehouse_id', b.warehouse_id,
      'created_at', b.created_at,
      'status', b.status,
      'product', jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'sku', p.sku
      ),
      'warehouse', CASE WHEN w.id IS NOT NULL THEN
        jsonb_build_object(
          'id', w.id,
          'name', w.name
        )
        ELSE NULL
      END
    ) INTO result
  FROM 
    public.barcodes b
    LEFT JOIN public.products p ON b.product_id = p.id
    LEFT JOIN public.warehouses w ON b.warehouse_id = w.id
  WHERE 
    b.barcode = p_barcode;

  RETURN result;
END;
$$;
