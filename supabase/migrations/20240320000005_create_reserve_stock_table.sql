-- Create enum for reserve stock status
CREATE TYPE reserve_stock_status AS ENUM ('active', 'expired', 'cancelled', 'processed');

-- Create reserve_stock table
CREATE TABLE IF NOT EXISTS reserve_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customer_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    status reserve_stock_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    warehouse_id UUID REFERENCES warehouses(id),
    stock_out_id UUID REFERENCES stock_out(id),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE reserve_stock ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON reserve_stock
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON reserve_stock
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable update for creators and warehouse managers" ON reserve_stock
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'warehouse_manager'
        )
    );

-- Create function to automatically update inventory quantities
CREATE OR REPLACE FUNCTION handle_reserve_stock_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If new reservation is being created
    IF TG_OP = 'INSERT' THEN
        -- Check if enough inventory is available
        IF NOT EXISTS (
            SELECT 1 FROM inventory
            WHERE product_id = NEW.product_id
            AND warehouse_id = NEW.warehouse_id
            AND available_quantity >= NEW.quantity
        ) THEN
            RAISE EXCEPTION 'Insufficient inventory available';
        END IF;
        
        -- Update inventory to reduce available quantity
        UPDATE inventory
        SET reserved_quantity = COALESCE(reserved_quantity, 0) + NEW.quantity,
            available_quantity = available_quantity - NEW.quantity
        WHERE product_id = NEW.product_id
        AND warehouse_id = NEW.warehouse_id;
    
    -- If reservation is being updated
    ELSIF TG_OP = 'UPDATE' THEN
        -- If status changed to expired or cancelled, return quantity to inventory
        IF NEW.status IN ('expired', 'cancelled') AND OLD.status = 'active' THEN
            UPDATE inventory
            SET reserved_quantity = COALESCE(reserved_quantity, 0) - OLD.quantity,
                available_quantity = available_quantity + OLD.quantity
            WHERE product_id = OLD.product_id
            AND warehouse_id = OLD.warehouse_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reserve_stock changes
CREATE TRIGGER reserve_stock_change_trigger
AFTER INSERT OR UPDATE ON reserve_stock
FOR EACH ROW
EXECUTE FUNCTION handle_reserve_stock_change();

-- Create function to automatically check for expired reservations
CREATE OR REPLACE FUNCTION check_expired_reservations()
RETURNS void AS $$
BEGIN
    -- Update expired reservations
    UPDATE reserve_stock
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'active'
    AND end_date < CURRENT_DATE;
    
    -- Return quantities to inventory for newly expired reservations
    UPDATE inventory i
    SET reserved_quantity = COALESCE(i.reserved_quantity, 0) - r.quantity,
        available_quantity = i.available_quantity + r.quantity
    FROM reserve_stock r
    WHERE r.status = 'expired'
    AND r.updated_at > now() - interval '5 minutes'
    AND i.product_id = r.product_id
    AND i.warehouse_id = r.warehouse_id;
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to check for expired reservations every hour
SELECT cron.schedule(
    'check-expired-reservations',
    '0 * * * *', -- Every hour
    'SELECT check_expired_reservations()'
); 