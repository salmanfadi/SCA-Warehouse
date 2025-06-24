-- Create a new table to track individual processed items for stock outs
CREATE TABLE IF NOT EXISTS public.stock_out_processed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_out_id UUID NOT NULL REFERENCES public.stock_out(id),
  batch_item_id UUID NOT NULL REFERENCES public.batch_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  barcode TEXT NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id),
  location_id UUID REFERENCES public.locations(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_out_processed_items_stock_out_id ON public.stock_out_processed_items(stock_out_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_processed_items_batch_item_id ON public.stock_out_processed_items(batch_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_processed_items_barcode ON public.stock_out_processed_items(barcode);

-- Enable RLS on the new table
ALTER TABLE public.stock_out_processed_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view stock out processed items they have access to"
  ON public.stock_out_processed_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stock_out so 
    WHERE so.id = stock_out_processed_items.stock_out_id
    AND (so.requested_by = auth.uid() OR 
         auth.uid() IN (
           SELECT id FROM auth.users 
           WHERE raw_user_meta_data->>'role' IN ('admin', 'warehouse_manager')
         ))
  ));

CREATE POLICY "Warehouse managers can insert stock out processed items"
  ON public.stock_out_processed_items FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'warehouse_manager')
  ));

-- Create a view to show stock out progress
CREATE OR REPLACE VIEW public.stock_out_progress_view AS
SELECT 
  so.id AS stock_out_id,
  so.product_id,
  p.name AS product_name,
  so.quantity AS requested_quantity,
  COALESCE(SUM(sopi.quantity), 0) AS processed_quantity,
  CASE 
    WHEN COALESCE(SUM(sopi.quantity), 0) >= so.quantity THEN 'completed'
    WHEN COALESCE(SUM(sopi.quantity), 0) > 0 THEN 'processing'
    ELSE so.status
  END AS effective_status
FROM 
  public.stock_out so
LEFT JOIN 
  public.stock_out_processed_items sopi ON so.id = sopi.stock_out_id
LEFT JOIN
  public.products p ON so.product_id = p.id
GROUP BY 
  so.id, so.product_id, p.name, so.quantity, so.status;

-- Create a function to get processed items for a stock out
CREATE OR REPLACE FUNCTION public.get_stock_out_processed_items(p_stock_out_id UUID)
RETURNS TABLE (
  id UUID,
  stock_out_id UUID,
  batch_item_id UUID,
  product_id UUID,
  product_name TEXT,
  barcode TEXT,
  warehouse_name TEXT,
  location_name TEXT,
  quantity INTEGER,
  processed_by TEXT,
  processed_at TIMESTAMPTZ
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    sopi.id,
    sopi.stock_out_id,
    sopi.batch_item_id,
    sopi.product_id,
    p.name AS product_name,
    sopi.barcode,
    w.name AS warehouse_name,
    l.name AS location_name,
    sopi.quantity,
    u.email AS processed_by,
    sopi.processed_at
  FROM 
    public.stock_out_processed_items sopi
  LEFT JOIN
    public.products p ON sopi.product_id = p.id
  LEFT JOIN
    public.warehouses w ON sopi.warehouse_id = w.id
  LEFT JOIN
    public.locations l ON sopi.location_id = l.id
  LEFT JOIN
    auth.users u ON sopi.processed_by = u.id
  WHERE
    sopi.stock_out_id = p_stock_out_id
  ORDER BY
    sopi.processed_at DESC;
$$;
