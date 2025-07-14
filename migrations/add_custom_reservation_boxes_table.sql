-- Create custom_reservation_boxes table to match the code expectations

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_reservation_boxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL,
  box_id UUID NOT NULL,
  reserved_quantity INTEGER NOT NULL,
  total_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Add foreign key constraint to custom_reservations table
  CONSTRAINT fk_custom_reservation_boxes_reservation
    FOREIGN KEY (reservation_id)
    REFERENCES custom_reservations(id)
    ON DELETE CASCADE,
    
  -- Add foreign key constraint to inventory table
  CONSTRAINT fk_custom_reservation_boxes_box
    FOREIGN KEY (box_id)
    REFERENCES inventory(id)
    ON DELETE CASCADE
);

-- Add comment to explain the table's purpose
COMMENT ON TABLE custom_reservation_boxes IS 'Stores detailed box-level reservation data for custom reservations';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_reservation_boxes_reservation_id ON custom_reservation_boxes(reservation_id);
CREATE INDEX IF NOT EXISTS idx_custom_reservation_boxes_box_id ON custom_reservation_boxes(box_id);
