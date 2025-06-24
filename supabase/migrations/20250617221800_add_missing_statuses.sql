-- Add missing statuses to customer_inquiries table
-- This migration adds 'in_progress' and 'completed' status values

-- First, update any existing records that should be in_progress
UPDATE customer_inquiries
SET status = 'in_progress'
WHERE status = 'pending' AND id IN (
  SELECT DISTINCT inquiry_id 
  FROM customer_inquiry_items
  WHERE quantity > 0
);

-- Then add completed status for any that might need it
-- For now, we're not setting any to completed, but the status will be available
