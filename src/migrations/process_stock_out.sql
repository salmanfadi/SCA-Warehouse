-- process_stock_out.sql
-- RPC function to process stock out requests in a single transaction

CREATE OR REPLACE FUNCTION process_stock_out(
  p_stock_out_id UUID,
  p_user_id UUID,
  p_processed_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_is_reserved BOOLEAN;
  v_customer_inquiry_id UUID;
  v_reservation_id UUID;
  v_item JSONB;
  v_detail_id UUID;
  v_batch_item_id UUID;
  v_quantity INT;
  v_notes TEXT;
  v_location_data JSONB;
  v_remaining_qty INT;
  v_status TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get stock out information
    SELECT is_reserved, customer_inquiry_id 
    INTO v_is_reserved, v_customer_inquiry_id
    FROM stock_outs 
    WHERE id = p_stock_out_id;
    
    -- Process each item in the processed_items array
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_processed_items)
    LOOP
      -- Extract values from the item
      v_detail_id := (v_item->>'detail_id')::UUID;
      v_batch_item_id := (v_item->>'batch_item_id')::UUID;
      v_quantity := (v_item->>'quantity')::INT;
      v_notes := v_item->>'notes';
      v_location_data := v_item->'location_data';
      
      -- Insert into processed_items
      INSERT INTO processed_items (
        stock_out_detail_id,
        batch_item_id,
        quantity,
        processed_by,
        processed_at,
        notes,
        location_data
      ) VALUES (
        v_detail_id,
        v_batch_item_id,
        v_quantity,
        p_user_id,
        NOW(),
        v_notes,
        v_location_data
      );
      
      -- Update batch_items
      SELECT quantity INTO v_remaining_qty 
      FROM batch_items 
      WHERE id = v_batch_item_id;
      
      v_remaining_qty := GREATEST(0, v_remaining_qty - v_quantity);
      v_status := CASE WHEN v_remaining_qty = 0 THEN 'out' ELSE 'active' END;
      
      UPDATE batch_items
      SET 
        status = v_status,
        quantity = v_remaining_qty,
        last_updated_by = p_user_id,
        last_updated_at = NOW()
      WHERE id = v_batch_item_id;
      
      -- Update stock_out_details with processed quantity
      UPDATE stock_out_details
      SET
        processed_quantity = COALESCE(processed_quantity, 0) + v_quantity,
        notes = v_notes,
        processed_by = p_user_id,
        processed_at = NOW()
      WHERE id = v_detail_id;
    END LOOP;
    
    -- Update stock_out status
    UPDATE stock_outs
    SET
      status = 'completed',
      processed_by = p_user_id,
      processed_at = NOW()
    WHERE id = p_stock_out_id;
    
    -- If this was a reserved order, update reservation status
    IF v_is_reserved AND v_customer_inquiry_id IS NOT NULL THEN
      -- Update customer inquiry status
      UPDATE customer_inquiries
      SET
        status = 'fulfilled',
        last_updated_by = p_user_id,
        last_updated_at = NOW()
      WHERE id = v_customer_inquiry_id;
      
      -- Get reservation ID
      SELECT id INTO v_reservation_id
      FROM custom_reservations
      WHERE customer_inquiry_id = v_customer_inquiry_id;
      
      IF v_reservation_id IS NOT NULL THEN
        -- Clear reserved quantities
        UPDATE custom_reservation_boxes
        SET reserved_quantity = 0
        WHERE custom_reservation_id = v_reservation_id;
        
        -- Mark reservation as fulfilled
        UPDATE custom_reservations
        SET
          status = 'fulfilled',
          fulfilled_at = NOW(),
          fulfilled_by = p_user_id
        WHERE id = v_reservation_id;
      END IF;
    END IF;
    
    -- Refresh inventory materialized view
    PERFORM refresh_materialized_view('inventory');
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Stock out processed successfully'
    );
    
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- Roll back transaction on error
    RAISE;
  END;
END;
$$;
