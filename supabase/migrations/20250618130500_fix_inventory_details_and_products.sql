-- Fix the inventory_details table to better support the enhanced inventory view
-- and fix the products category issue

-- 1. First, let's modify the inventory_details table to include all fields needed for the enhanced view
ALTER TABLE inventory_details
ADD COLUMN IF NOT EXISTS zone TEXT,
ADD COLUMN IF NOT EXISTS floor TEXT,
ADD COLUMN IF NOT EXISTS shelf TEXT,
ADD COLUMN IF NOT EXISTS bin TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Create a view to extract the first category from the categories array
CREATE OR REPLACE VIEW product_with_category AS
SELECT 
  id,
  name,
  sku,
  description,
  unit,
  price,
  cost,
  min_stock_level,
  active,
  created_at,
  updated_at,
  created_by,
  updated_by,
  is_active,
  specifications,
  image_url,
  image_url_2,
  image_url_3,
  image_url_4,
  image_url_5,
  hsn_code,
  CASE 
    WHEN categories IS NULL OR categories = '{}' THEN 'Uncategorized'
    ELSE categories[1]
  END AS category,
  categories
FROM products;

-- 3. Drop the existing view first to avoid column renaming issues
DROP VIEW IF EXISTS enhanced_inventory_view;

-- 4. Create the enhanced_inventory_view to use the product_with_category view
CREATE OR REPLACE VIEW enhanced_inventory_view AS
SELECT 
  i.id as inventory_id,
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.description,
  p.image_url,
  p.category,
  p.hsn_code,
  i.total_quantity,
  i.available_quantity,
  i.reserved_quantity,
  id.location_data,
  id.batch_number,
  id.notes,
  id.expiry_date,
  id.manufacturing_date,
  id.zone,
  id.floor,
  id.shelf,
  id.bin,
  id.status as detail_status
FROM 
  inventory i
JOIN 
  product_with_category p ON i.product_id = p.id
LEFT JOIN 
  inventory_details id ON i.id = id.inventory_id;

-- 5. Create a function to populate inventory_details from existing inventory records
CREATE OR REPLACE FUNCTION populate_inventory_details()
RETURNS void AS $$
BEGIN
  INSERT INTO inventory_details (
    inventory_id,
    product_id,
    quantity,
    location_data,
    created_at,
    updated_at
  )
  SELECT 
    i.id,
    i.product_id,
    i.total_quantity,
    jsonb_build_object(
      'warehouse_id', i.warehouse_id,
      'location_id', i.location_id
    ),
    i.created_at,
    i.updated_at
  FROM 
    inventory i
  LEFT JOIN 
    inventory_details id ON i.id = id.inventory_id
  WHERE 
    id.id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Execute the function to populate inventory_details
SELECT populate_inventory_details();

-- 7. Add additional RLS policies for the new view
GRANT SELECT ON product_with_category TO authenticated;
GRANT SELECT ON enhanced_inventory_view TO authenticated;