-- Migration to update the customer inquiries status flow
-- This migration ensures proper permissions and adds any necessary indexes for the customer inquiries status flow

-- Make sure RLS is enabled on customer_inquiries table
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read access to customer inquiries" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow anonymous update access to customer inquiries" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow all access to customer inquiries" ON public.customer_inquiries;

-- Create policies for customer_inquiries table
CREATE POLICY "Allow read access to customer inquiries" 
ON public.customer_inquiries
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Allow update access to customer inquiries" 
ON public.customer_inquiries
FOR UPDATE 
TO public
USING (true)
WITH CHECK (true);

-- Make sure RLS is enabled on customer_inquiry_items table
ALTER TABLE public.customer_inquiry_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous read access to customer inquiry items" ON public.customer_inquiry_items;
DROP POLICY IF EXISTS "Allow anonymous update access to customer inquiry items" ON public.customer_inquiry_items;
DROP POLICY IF EXISTS "Allow all access to customer inquiry items" ON public.customer_inquiry_items;

-- Create policies for customer_inquiry_items table
CREATE POLICY "Allow read access to customer inquiry items" 
ON public.customer_inquiry_items
FOR SELECT 
TO public
USING (true);

CREATE POLICY "Allow update access to customer inquiry items" 
ON public.customer_inquiry_items
FOR UPDATE 
TO public
USING (true)
WITH CHECK (true);

-- Add an index on the status column for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_inquiries_status ON public.customer_inquiries (status);

-- Add an index on the inquiry_id column in customer_inquiry_items for better join performance
CREATE INDEX IF NOT EXISTS idx_customer_inquiry_items_inquiry_id ON public.customer_inquiry_items (inquiry_id);

-- Make sure we have all the necessary status values in the check constraint
DO $$
BEGIN
  -- Check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_inquiries_status_check' 
    AND conrelid = 'public.customer_inquiries'::regclass
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE public.customer_inquiries DROP CONSTRAINT IF EXISTS customer_inquiries_status_check;
  END IF;
  
  -- Add the constraint with all required status values
  ALTER TABLE public.customer_inquiries 
    ADD CONSTRAINT customer_inquiries_status_check 
    CHECK (status IN ('pending', 'in_progress', 'finalizing', 'completed'));
END $$;

-- Comment on columns to document the status flow
COMMENT ON COLUMN public.customer_inquiries.status IS 'Status flow: pending (initial inquiry) -> in_progress (moved to orders) -> finalizing (pushed to stock-out) -> completed';
