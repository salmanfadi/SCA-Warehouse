-- Disable triggers temporarily to avoid conflicts
ALTER TABLE inventory_transfers DISABLE TRIGGER ALL;
ALTER TABLE inventory_transfer_details DISABLE TRIGGER ALL;
ALTER TABLE inventory_transfer_boxes DISABLE TRIGGER ALL;

-- Create a temporary table to store the ID mappings
CREATE TEMP TABLE transfer_id_mapping AS
SELECT 
    id as old_id,
    'TRF' || 
    to_char(COALESCE(created_at, now()), 'YYMMDD') || 
    LPAD(ROW_NUMBER() OVER (PARTITION BY to_char(COALESCE(created_at, now()), 'YYMMDD') ORDER BY created_at)::text, 4, '0') as new_id
FROM inventory_transfers;

-- Update the main transfers table
UPDATE inventory_transfers it
SET id = tm.new_id
FROM transfer_id_mapping tm
WHERE it.id = tm.old_id;

-- Update related tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transfer_details') THEN
        UPDATE inventory_transfer_details itd
        SET transfer_id = tm.new_id
        FROM transfer_id_mapping tm
        WHERE itd.transfer_id = tm.old_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transfer_boxes') THEN
        UPDATE inventory_transfer_boxes itb
        SET transfer_id = tm.new_id
        FROM transfer_id_mapping tm
        WHERE itb.transfer_id = tm.old_id;
    END IF;
END $$;

-- Drop the temporary table
DROP TABLE transfer_id_mapping;

-- Re-enable triggers
ALTER TABLE inventory_transfers ENABLE TRIGGER ALL;
ALTER TABLE inventory_transfer_details ENABLE TRIGGER ALL;
ALTER TABLE inventory_transfer_boxes ENABLE TRIGGER ALL;

-- Verify the changes
SELECT id, created_at FROM inventory_transfers ORDER BY created_at DESC; 