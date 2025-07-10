
-- Add image_url column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
