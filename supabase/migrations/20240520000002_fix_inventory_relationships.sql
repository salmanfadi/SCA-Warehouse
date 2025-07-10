-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS inventory 
  DROP CONSTRAINT IF EXISTS fk_inventory_product,
  DROP CONSTRAINT IF EXISTS fk_inventory_warehouse,
  DROP CONSTRAINT IF EXISTS fk_inventory_location;

-- Add the correct foreign key constraints
ALTER TABLE inventory
  ADD CONSTRAINT fk_inventory_product 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE RESTRICT;

ALTER TABLE inventory
  ADD CONSTRAINT fk_inventory_warehouse 
    FOREIGN KEY (warehouse_id) 
    REFERENCES warehouses(id) 
    ON DELETE RESTRICT;

ALTER TABLE inventory
  ADD CONSTRAINT fk_inventory_location 
    FOREIGN KEY (location_id) 
    REFERENCES warehouse_locations(id) 
    ON DELETE RESTRICT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory(location_id);

-- Add a temporary column with the correct case
ALTER TABLE products ADD COLUMN category_new text;

-- Copy data from the old column to the new one
UPDATE products SET category_new = "Category";

-- Drop the old column
ALTER TABLE products DROP COLUMN "Category";

-- Rename the new column to the correct case
ALTER TABLE products RENAME COLUMN category_new TO category; 