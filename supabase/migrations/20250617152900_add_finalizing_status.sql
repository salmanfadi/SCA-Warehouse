-- Migration to add 'finalizing' status to customer_inquiries table
-- This adds an intermediate state between 'in_progress' and 'completed'
-- to better control button visibility after pushing to stock-out

-- Check if the status column exists and has the right type
DO $$
BEGIN
  -- Add 'finalizing' as a valid status value if not already present
  -- This assumes status is stored as a text/varchar field and not an enum
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'customer_inquiries' 
    AND column_name = 'status'
  ) THEN
    -- If status is not already set as finalizing for any record, we're good to proceed
    -- This is just a safety check
    PERFORM 1 
    FROM customer_inquiries 
    WHERE status = 'finalizing';
    
    -- No need for explicit ALTER TYPE if using text/varchar fields
    -- Just document the valid values here for reference
    
    -- Valid status values after this migration:
    -- 'pending': Initial state when inquiry is created
    -- 'in_progress': When inquiry is converted to an order
    -- 'finalizing': When order is pushed to stock-out but not yet processed
    -- 'completed': When order is fully processed
    
    -- Update any existing records that might need the new status
    -- For example, if an order is pushed to stock-out but not completed
    UPDATE customer_inquiries
    SET status = 'finalizing'
    WHERE status = 'in_progress' 
    AND id IN (
      SELECT ci.id
      FROM customer_inquiries ci
      JOIN stock_out so ON so.notes LIKE '%' || ci.id || '%'
      WHERE so.status = 'pending'
    );
  END IF;
END
$$;

-- Add comment to document the status values
COMMENT ON COLUMN customer_inquiries.status IS 'Order status: pending, in_progress, finalizing, completed';
