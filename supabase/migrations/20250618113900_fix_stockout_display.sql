-- This migration ensures that only orders with finalizing status are displayed in stock out requests
-- and that the correct product and quantity information is shown

-- First, let's create stock_out entries for any finalizing orders that don't have them yet
INSERT INTO stock_out (
  customer_name, 
  customer_email, 
  destination, 
  notes, 
  status,
  created_at
)
SELECT 
  ci.customer_name,
  ci.customer_email,
  COALESCE(ci.customer_name, 'Unknown') as destination,
  'Stock-out request for Order: ' || COALESCE(ci.reference_number, 'SO-' || substring(ci.id::text, 1, 8)) || ' (ID: ' || ci.id || ')',
  'pending',
  now()
FROM 
  customer_inquiries ci
LEFT JOIN 
  stock_out so ON so.notes LIKE '%' || ci.id || '%'
WHERE 
  ci.status = 'finalizing' 
  AND so.id IS NULL;

-- Now create stock_out_details entries for the newly created stock_out records
INSERT INTO stock_out_details (
  stock_out_id,
  product_id,
  quantity,
  barcode
)
SELECT 
  so.id,
  ci.product_id,
  ci.quantity,
  ''
FROM 
  customer_inquiries ci
JOIN 
  stock_out so ON so.notes LIKE '%' || ci.id || '%'
LEFT JOIN 
  stock_out_details sd ON sd.stock_out_id = so.id AND sd.product_id = ci.product_id
WHERE 
  ci.status = 'finalizing'
  AND sd.id IS NULL;

-- Update the view to ensure it shows the correct information
DROP VIEW IF EXISTS finalizing_orders_view;
CREATE OR REPLACE VIEW finalizing_orders_view AS
SELECT 
  ci.id as inquiry_id,
  ci.customer_name,
  ci.customer_email,
  ci.product_id,
  ci.product_name,
  ci.quantity,
  ci.message,
  ci.status,
  ci.created_at as inquiry_created_at,
  ci.reference_number,
  so.id as stock_out_id,
  so.status as stock_out_status,
  so.notes,
  so.created_at as stock_out_created_at,
  p.name as product_name_from_products
FROM 
  customer_inquiries ci
LEFT JOIN 
  stock_out so ON so.notes LIKE '%' || ci.id || '%'
LEFT JOIN
  products p ON ci.product_id = p.id
WHERE 
  ci.status = 'finalizing';

-- Ensure only finalizing orders appear in stock out requests for admin and warehouse manager
DROP POLICY IF EXISTS "Only show stock out requests from finalizing orders" ON stock_out;
CREATE POLICY "Only show stock out requests from finalizing orders" 
ON stock_out
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM customer_inquiries
    WHERE customer_inquiries.status = 'finalizing'
    AND stock_out.notes LIKE '%' || customer_inquiries.id || '%'
  )
  OR requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'warehouse_manager')
  )
);
