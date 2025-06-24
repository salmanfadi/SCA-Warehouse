-- This migration fixes the RLS policies for customer_inquiries table
-- First, let's disable RLS temporarily to check if that's the issue
ALTER TABLE public.customer_inquiries DISABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow anonymous read access to customer inquiries" ON public.customer_inquiries;
DROP POLICY IF EXISTS "Allow anonymous update access to customer inquiries" ON public.customer_inquiries;

-- Re-enable RLS with proper policies
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all operations for both authenticated and anonymous users
CREATE POLICY "Allow all access to customer inquiries" 
ON public.customer_inquiries
FOR ALL 
TO public
USING (true)
WITH CHECK (true);

-- Do the same for customer_inquiry_items table
ALTER TABLE IF EXISTS public.customer_inquiry_items DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to customer inquiry items" ON public.customer_inquiry_items;
DROP POLICY IF EXISTS "Allow anonymous update access to customer inquiry items" ON public.customer_inquiry_items;

ALTER TABLE IF EXISTS public.customer_inquiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customer inquiry items" 
ON public.customer_inquiry_items
FOR ALL 
TO public
USING (true)
WITH CHECK (true);
