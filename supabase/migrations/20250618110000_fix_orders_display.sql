-- Migration to fix orders display issues
-- This ensures that all necessary permissions are in place for the customer inquiries status flow

-- Make sure RLS is enabled on customer_inquiries table
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to customer inquiries" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow update access to customer inquiries" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow all access to customer inquiries" ON public.customer_inquiries;

-- Create comprehensive policies for customer_inquiries table
CREATE POLICY "Allow full access to customer inquiries" 
ON public.customer_inquiries
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Make sure RLS is enabled on customer_inquiry_items table
ALTER TABLE public.customer_inquiry_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to customer inquiry items" ON public.customer_inquiry_items;
DROP POLICY IF EXISTS "Allow update access to customer inquiry items" ON public.customer_inquiry_items;
DROP POLICY IF EXISTS "Allow all access to customer inquiry items" ON public.customer_inquiry_items;

-- Create comprehensive policies for customer_inquiry_items table
CREATE POLICY "Allow full access to customer inquiry items" 
ON public.customer_inquiry_items
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Add INSERT policy explicitly
CREATE POLICY "Allow insert to customer inquiry items" 
ON public.customer_inquiry_items
FOR INSERT
TO public
WITH CHECK (true);

-- Add DELETE policy explicitly
CREATE POLICY "Allow delete from customer inquiry items" 
ON public.customer_inquiry_items
FOR DELETE
TO public
USING (true);

-- Ensure all required tables have RLS enabled with appropriate policies
DO $$
DECLARE
  tables TEXT[] := ARRAY['products', 'stock_out', 'stock_out_details'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    
    -- Drop any existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access to %I" ON public.%I', t, t);
    
    -- Create comprehensive policy
    EXECUTE format('CREATE POLICY "Allow full access to %I" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END
$$;
