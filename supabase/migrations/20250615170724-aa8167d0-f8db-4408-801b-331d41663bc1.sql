
-- Create customer_inquiries table
CREATE TABLE IF NOT EXISTS public.customer_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_company TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_to_order BOOLEAN DEFAULT false,
  order_id UUID,
  notes TEXT
);

-- Create customer_inquiry_items table
CREATE TABLE IF NOT EXISTS public.customer_inquiry_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID NOT NULL REFERENCES public.customer_inquiries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2),
  specific_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_company TEXT NOT NULL,
  customer_phone TEXT,
  inquiry_id UUID REFERENCES public.customer_inquiries(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount DECIMAL(10,2),
  items JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_inquiry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for customer_inquiries (accessible to all authenticated users)
CREATE POLICY "All users can view customer inquiries" ON public.customer_inquiries FOR SELECT USING (true);
CREATE POLICY "All users can insert customer inquiries" ON public.customer_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "All users can update customer inquiries" ON public.customer_inquiries FOR UPDATE USING (true);

-- Policies for customer_inquiry_items
CREATE POLICY "All users can view inquiry items" ON public.customer_inquiry_items FOR SELECT USING (true);
CREATE POLICY "All users can insert inquiry items" ON public.customer_inquiry_items FOR INSERT WITH CHECK (true);
CREATE POLICY "All users can update inquiry items" ON public.customer_inquiry_items FOR UPDATE USING (true);

-- Policies for orders
CREATE POLICY "All users can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "All users can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "All users can update orders" ON public.orders FOR UPDATE USING (true);

-- Add inventory_id column to stock_out_details if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_out_details' AND column_name = 'inventory_id') THEN
        ALTER TABLE public.stock_out_details ADD COLUMN inventory_id UUID REFERENCES public.inventory(id);
    END IF;
END $$;

-- Create get_inventory_quantity function
CREATE OR REPLACE FUNCTION public.get_inventory_quantity(p_inventory_id UUID, p_quantity INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_qty INTEGER;
BEGIN
    SELECT quantity INTO current_qty FROM public.inventory WHERE id = p_inventory_id;
    RETURN COALESCE(current_qty, 0) + p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
