
-- Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_company TEXT NOT NULL,
  customer_phone TEXT,
  sales_order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'dispatched', 'completed', 'cancelled')),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  inquiry_id UUID REFERENCES public.customer_inquiries(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_order_items table
CREATE TABLE public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create serial_numbers table
CREATE TABLE public.serial_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('stock_in', 'stock_out', 'transfer')),
  reference_id UUID NOT NULL,
  reference_table TEXT NOT NULL,
  batch_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Add indexes for better performance
CREATE INDEX idx_sales_orders_customer_email ON public.sales_orders(customer_email);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_order_items_sales_order_id ON public.sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product_id ON public.sales_order_items(product_id);
CREATE INDEX idx_serial_numbers_operation_type ON public.serial_numbers(operation_type);
CREATE INDEX idx_serial_numbers_reference_id ON public.serial_numbers(reference_id);

-- Add updated_at triggers
CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_order_items_updated_at
    BEFORE UPDATE ON public.sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (optional, can be enabled later when auth is implemented)
-- ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.serial_numbers ENABLE ROW LEVEL SECURITY;
