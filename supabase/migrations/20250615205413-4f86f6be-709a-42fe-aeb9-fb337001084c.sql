
-- Enable RLS on products table if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserting products (for test data creation)
CREATE POLICY "Allow insert products" ON public.products
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow selecting products
CREATE POLICY "Allow select products" ON public.products
FOR SELECT 
USING (true);

-- Create policy to allow updating products
CREATE POLICY "Allow update products" ON public.products
FOR UPDATE 
USING (true);

-- Create policy to allow deleting products (for test data cleanup)
CREATE POLICY "Allow delete products" ON public.products
FOR DELETE 
USING (true);
