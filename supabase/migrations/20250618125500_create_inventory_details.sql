-- Create inventory_details table for enhanced inventory tracking
CREATE TABLE IF NOT EXISTS inventory_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_data JSONB NOT NULL DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 0,
  batch_number TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE,
  manufacturing_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS inventory_details_inventory_id_idx ON inventory_details(inventory_id);
CREATE INDEX IF NOT EXISTS inventory_details_product_id_idx ON inventory_details(product_id);
CREATE INDEX IF NOT EXISTS inventory_details_location_data_idx ON inventory_details USING GIN (location_data);

-- Create a view for enhanced inventory display
CREATE OR REPLACE VIEW enhanced_inventory_view AS
SELECT 
  i.id as inventory_id,
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.description,
  p.image_url,
  i.quantity as total_quantity,
  i.available_quantity,
  i.reserved_quantity,
  id.location_data,
  id.batch_number,
  id.notes,
  id.expiry_date,
  id.manufacturing_date
FROM 
  inventory i
JOIN 
  products p ON i.product_id = p.id
LEFT JOIN 
  inventory_details id ON i.id = id.inventory_id;

-- Add RLS policy for inventory_details
ALTER TABLE inventory_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
ON inventory_details
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users with appropriate roles" 
ON inventory_details
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'warehouse_manager')
  )
);

CREATE POLICY "Enable update for authenticated users with appropriate roles" 
ON inventory_details
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'warehouse_manager')
  )
);

-- Create function to update inventory when inventory_details changes
CREATE OR REPLACE FUNCTION update_inventory_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the main inventory record with the sum of all details
  UPDATE inventory
  SET 
    quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM inventory_details
      WHERE inventory_id = NEW.inventory_id
    ),
    updated_at = NOW()
  WHERE id = NEW.inventory_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update inventory totals
CREATE TRIGGER update_inventory_after_details_change
AFTER INSERT OR UPDATE OR DELETE ON inventory_details
FOR EACH ROW
EXECUTE FUNCTION update_inventory_totals();
