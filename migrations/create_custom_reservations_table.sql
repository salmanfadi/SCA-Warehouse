-- Create custom_reservations table
CREATE TABLE IF NOT EXISTS public.custom_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending',
    
    -- Add JSONB column for reservation details
    reservation_details JSONB,
    
    FOREIGN KEY (order_id) REFERENCES public.customer_orders(id) ON DELETE CASCADE
);

-- Add comment on the JSONB column
COMMENT ON COLUMN public.custom_reservations.reservation_details IS 'JSON structure containing product details, required quantities, and box reservations';

-- Enable RLS
ALTER TABLE public.custom_reservations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" 
ON public.custom_reservations
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);
