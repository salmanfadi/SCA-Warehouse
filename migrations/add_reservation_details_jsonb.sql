-- Add JSONB column to custom_reservations table
ALTER TABLE custom_reservations
ADD COLUMN reservation_details JSONB;

-- Comment on the column
COMMENT ON COLUMN custom_reservations.reservation_details IS 'JSON structure containing product details, required quantities, and box reservations';
