-- get_stock_out_history.sql
-- Function to retrieve stock-out history with detailed processed items information

CREATE OR REPLACE FUNCTION get_stock_out_history(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10,
  p_search_term TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT;
  v_result JSONB;
  v_total_count INT;
  v_stock_outs JSONB;
BEGIN
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count for pagination
  SELECT COUNT(*)
  INTO v_total_count
  FROM stock_outs so
  LEFT JOIN customer_inquiries ci ON so.customer_inquiry_id = ci.id
  LEFT JOIN profiles p ON so.processed_by = p.id
  WHERE (
    p_search_term IS NULL 
    OR so.reference_number ILIKE '%' || p_search_term || '%'
    OR ci.customer_name ILIKE '%' || p_search_term || '%'
  )
  AND (p_start_date IS NULL OR so.created_at >= p_start_date)
  AND (p_end_date IS NULL OR so.created_at <= p_end_date)
  AND (p_status IS NULL OR so.status = p_status);
  
  -- Get stock-outs with processed items
  WITH stock_out_data AS (
    SELECT 
      so.id,
      so.reference_number,
      so.customer_inquiry_id,
      so.status,
      so.created_at,
      so.processed_at,
      so.processed_by,
      ci.customer_name,
      p.display_name AS user_name
    FROM stock_outs so
    LEFT JOIN customer_inquiries ci ON so.customer_inquiry_id = ci.id
    LEFT JOIN profiles p ON so.processed_by = p.id
    WHERE (
      p_search_term IS NULL 
      OR so.reference_number ILIKE '%' || p_search_term || '%'
      OR ci.customer_name ILIKE '%' || p_search_term || '%'
    )
    AND (p_start_date IS NULL OR so.created_at >= p_start_date)
    AND (p_end_date IS NULL OR so.created_at <= p_end_date)
    AND (p_status IS NULL OR so.status = p_status)
    ORDER BY so.created_at DESC
    LIMIT p_page_size
    OFFSET v_offset
  ),
  processed_items_data AS (
    SELECT
      pi.id,
      pi.stock_out_detail_id,
      pi.batch_item_id,
      pi.quantity,
      pi.processed_by,
      pi.processed_at,
      pi.notes,
      pi.location_data,
      bi.barcode,
      sod.stock_out_id,
      p.name AS product_name,
      p.sku AS product_sku,
      pr.display_name AS user_name
    FROM processed_items pi
    JOIN stock_out_details sod ON pi.stock_out_detail_id = sod.id
    JOIN batch_items bi ON pi.batch_item_id = bi.id
    JOIN products p ON bi.product_id = p.id
    LEFT JOIN profiles pr ON pi.processed_by = pr.id
    WHERE sod.stock_out_id IN (SELECT id FROM stock_out_data)
  )
  SELECT 
    jsonb_build_object(
      'stock_outs', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sod.id,
            'reference_number', sod.reference_number,
            'customer_inquiry_id', sod.customer_inquiry_id,
            'status', sod.status,
            'created_at', sod.created_at,
            'processed_at', sod.processed_at,
            'processed_by', sod.processed_by,
            'customer_name', sod.customer_name,
            'user_name', sod.user_name,
            'processed_items', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', pid.id,
                  'stock_out_detail_id', pid.stock_out_detail_id,
                  'batch_item_id', pid.batch_item_id,
                  'quantity', pid.quantity,
                  'processed_by', pid.processed_by,
                  'processed_at', pid.processed_at,
                  'notes', pid.notes,
                  'location_data', pid.location_data,
                  'barcode', pid.barcode,
                  'product_name', pid.product_name,
                  'product_sku', pid.product_sku,
                  'user_name', pid.user_name
                )
              ), '[]'::jsonb)
              FROM processed_items_data pid
              WHERE pid.stock_out_id = sod.id
            )
          )
        )
        FROM stock_out_data sod
      ),
      'total_count', v_total_count
    )
  INTO v_result;
  
  RETURN v_result;
END;
$$;
