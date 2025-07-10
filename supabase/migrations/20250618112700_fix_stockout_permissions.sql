-- This migration ensures that finalizing status orders are displayed in stockout requests
-- for both admin and warehouse manager roles

-- First, create a view that joins customer_inquiries with finalizing status to stock_out
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
  so.created_at as stock_out_created_at
FROM 
  customer_inquiries ci
LEFT JOIN 
  stock_out so ON so.notes LIKE '%' || ci.id || '%'
WHERE 
  ci.status = 'finalizing';

-- Add policy to ensure admin and warehouse manager can see all finalizing orders
DROP POLICY IF EXISTS "Admin and warehouse manager can see all finalizing orders" ON customer_inquiries;
CREATE POLICY "Admin and warehouse manager can see all finalizing orders" 
ON customer_inquiries
FOR SELECT
TO public
USING (
  (status = 'finalizing' AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'warehouse_manager')
  ))
  OR (auth.role() = 'authenticated')
);

-- Fix the stock_out table permissions to ensure proper access
DROP POLICY IF EXISTS "Users can view their own stock out requests" ON stock_out;
CREATE POLICY "Users can view their own stock out requests" 
ON stock_out
FOR SELECT
TO public
USING (
  requested_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'warehouse_manager')
  )
  OR EXISTS (
    SELECT 1 FROM customer_inquiries
    WHERE customer_inquiries.status = 'finalizing'
    AND stock_out.notes LIKE '%' || customer_inquiries.id || '%'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'warehouse_manager')
    )
  )
);

-- Ensure the inventory query works correctly
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON inventory;
CREATE POLICY "Enable read access for all authenticated users" 
ON inventory
FOR SELECT
TO public
USING (auth.role() = 'authenticated');
