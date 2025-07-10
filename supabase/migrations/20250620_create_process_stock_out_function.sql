-- Create a function to process stock out in a single transaction
CREATE OR REPLACE FUNCTION public.process_stock_out(
  p_user_id UUID,
  p_barcode TEXT,
  p_product_id UUID,
  p_batch_id UUID,
  p_quantity INTEGER,
  p_location_id UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stock_out_id UUID;
  result JSONB;
BEGIN
  -- Create stock out record
  INSERT INTO public.stock_out (
    requested_by,
    status,
    notes,
    processed_at
  )
  VALUES (
    p_user_id,
    'completed',
    p_notes,
    now()
  )
  RETURNING id INTO v_stock_out_id;
  
  -- Add stock out details
  INSERT INTO public.stock_out_details (
    stock_out_id,
    product_id,
    quantity,
    batch_id
  )
  VALUES (
    v_stock_out_id,
    p_product_id,
    p_quantity,
    p_batch_id
  );
  
  -- Update inventory (call existing function)
  PERFORM public.decrement_inventory(
    p_product_id,
    p_quantity,
    p_location_id
  );
  
  -- Update barcode quantity
  UPDATE public.barcodes
  SET quantity = quantity - p_quantity
  WHERE barcode = p_barcode;
  
  -- Return result
  result := jsonb_build_object(
    'id', v_stock_out_id,
    'status', 'success'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  result := jsonb_build_object(
    'status', 'error',
    'message', SQLERRM
  );
  
  RETURN result;
END;
$$;
