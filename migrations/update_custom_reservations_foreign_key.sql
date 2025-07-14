-- Update custom_reservations foreign key to reference customer_inquiries instead of customer_orders

-- First, drop the existing foreign key constraint
ALTER TABLE custom_reservations
DROP CONSTRAINT IF EXISTS custom_reservations_order_id_fkey;

-- Rename the column to better reflect its purpose (optional but recommended for clarity)
ALTER TABLE custom_reservations
RENAME COLUMN order_id TO inquiry_id;

-- Add the new foreign key constraint referencing customer_inquiries
ALTER TABLE custom_reservations
ADD CONSTRAINT custom_reservations_inquiry_id_fkey
FOREIGN KEY (inquiry_id) REFERENCES customer_inquiries(id);

-- Add comment to explain the change
COMMENT ON COLUMN custom_reservations.inquiry_id IS 'References customer_inquiries.id instead of customer_orders.id';
