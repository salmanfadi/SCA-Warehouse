-- Fix permissions for customer_inquiries table to allow anonymous access
-- This migration adds policies to allow anonymous users to read and update customer inquiries

-- Enable RLS on the table (in case it's not already enabled)
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;

-- Add policy for anonymous users to read customer inquiries
CREATE POLICY "Allow anonymous read access to customer inquiries" 
ON public.customer_inquiries
FOR SELECT 
TO anon
USING (true);

-- Add policy for anonymous users to update customer inquiries
CREATE POLICY "Allow anonymous update access to customer inquiries" 
ON public.customer_inquiries
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Also check and fix permissions for customer_inquiry_items table
ALTER TABLE IF EXISTS public.customer_inquiry_items ENABLE ROW LEVEL SECURITY;

-- Add policy for anonymous users to read customer inquiry items
CREATE POLICY "Allow anonymous read access to customer inquiry items" 
ON public.customer_inquiry_items
FOR SELECT 
TO anon
USING (true);

-- Add policy for anonymous users to update customer inquiry items
CREATE POLICY "Allow anonymous update access to customer inquiry items" 
ON public.customer_inquiry_items
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
