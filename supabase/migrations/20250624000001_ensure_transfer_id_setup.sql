-- Recreate the function to ensure it exists and is up to date
CREATE OR REPLACE FUNCTION generate_transfer_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    _date text;
    _counter int;
    _transfer_id text;
BEGIN
    -- Get current date in YYMMDD format
    _date := to_char(current_timestamp, 'YYMMDD');
    
    -- Get current counter for today
    SELECT COALESCE(MAX(SUBSTRING(id, 9)::integer), 0) + 1
    INTO _counter
    FROM inventory_transfers
    WHERE id LIKE 'TRF' || _date || '%';
    
    -- Generate transfer ID: TRF + YYMMDD + 4-digit counter
    _transfer_id := 'TRF' || _date || LPAD(_counter::text, 4, '0');
    
    RETURN _transfer_id;
END;
$$;

-- Ensure column is TEXT type and has the correct default
ALTER TABLE inventory_transfers 
    ALTER COLUMN id TYPE text USING id::text,
    ALTER COLUMN id SET DEFAULT generate_transfer_id();

-- Add index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_id ON inventory_transfers(id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_transfer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_transfer_id() TO service_role; 