-- Migration to update existing in-progress inquiries to finalizing status
-- This will help with button visibility in the UI

-- Update any in-progress inquiries that have been pushed to stock-out to finalizing status
UPDATE customer_inquiries
SET status = 'finalizing'
WHERE status = 'in_progress' 
AND id IN (
  SELECT ci.id
  FROM customer_inquiries ci
  JOIN stock_out so ON so.notes LIKE '%' || ci.id || '%'
  WHERE so.status = 'pending'
);

-- Update at least one row to have finalizing status for testing
UPDATE customer_inquiries
SET status = 'finalizing'
WHERE id IN (
  SELECT id
  FROM customer_inquiries
  WHERE status = 'in_progress'
  ORDER BY created_at DESC
  LIMIT 1
);

-- Add comment to document the status values
COMMENT ON COLUMN customer_inquiries.status IS 'Order status: pending, in_progress, finalizing, completed';
