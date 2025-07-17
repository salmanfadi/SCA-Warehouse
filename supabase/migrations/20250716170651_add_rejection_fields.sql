-- Add rejection fields to stock_out table
ALTER TABLE public.stock_out
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_out_rejected_by ON public.stock_out(rejected_by);

-- Update the status check constraint to include rejected status
ALTER TABLE public.stock_out 
DROP CONSTRAINT IF EXISTS stock_out_status_check,
ADD CONSTRAINT stock_out_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')); 