
-- Add sales_order_id to stock_out table to link stock-out requests to sales orders
ALTER TABLE stock_out ADD COLUMN sales_order_id uuid REFERENCES sales_orders(id);

-- Add workflow tracking fields to sales_orders
ALTER TABLE sales_orders ADD COLUMN pushed_to_stockout boolean DEFAULT false;
ALTER TABLE sales_orders ADD COLUMN stockout_id uuid REFERENCES stock_out(id);

-- Add customer information to stock_out for better tracking
ALTER TABLE stock_out ADD COLUMN customer_name text;
ALTER TABLE stock_out ADD COLUMN customer_email text;
ALTER TABLE stock_out ADD COLUMN customer_company text;
ALTER TABLE stock_out ADD COLUMN customer_phone text;

-- Update stock_out status enum to include more workflow states
ALTER TYPE stock_status ADD VALUE IF NOT EXISTS 'from_sales_order';
