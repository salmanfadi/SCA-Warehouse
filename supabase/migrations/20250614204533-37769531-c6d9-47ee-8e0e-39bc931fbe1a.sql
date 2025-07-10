
-- Add HSN code field to products table
ALTER TABLE products 
ADD COLUMN hsn_code VARCHAR(8),
ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN gst_category VARCHAR(50);

-- Add index for faster HSN code lookups
CREATE INDEX idx_products_hsn_code ON products(hsn_code);

-- Add comments for clarity
COMMENT ON COLUMN products.hsn_code IS 'HSN (Harmonized System of Nomenclature) code for GST compliance';
COMMENT ON COLUMN products.gst_rate IS 'GST rate percentage applicable to this product';
COMMENT ON COLUMN products.gst_category IS 'GST category (e.g., standard, zero-rated, exempt)';
