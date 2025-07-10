-- Update products table to match the current schema
ALTER TABLE public.products
  ALTER COLUMN sku SET NOT NULL,
  ALTER COLUMN is_active SET DEFAULT true,
  ADD COLUMN IF NOT EXISTS specifications text,
  ADD COLUMN IF NOT EXISTS image_url text; 