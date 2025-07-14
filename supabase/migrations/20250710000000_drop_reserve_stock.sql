-- Drop reserve stock tables and types
DROP TABLE IF EXISTS public.reserved_inventory;
DROP TABLE IF EXISTS public.reserve_stock;
DROP TYPE IF EXISTS reserve_stock_status;

-- Drop any related indexes
DROP INDEX IF EXISTS idx_reserve_stock_product;
DROP INDEX IF EXISTS idx_reserve_stock_warehouse;
DROP INDEX IF EXISTS idx_reserve_stock_status;

-- Drop any related functions and triggers
DROP TRIGGER IF EXISTS reserve_stock_change_trigger ON public.reserve_stock;
DROP FUNCTION IF EXISTS handle_reserve_stock_change; 