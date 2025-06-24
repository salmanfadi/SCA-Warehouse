-- Add a comment to the existing constraint for clarity
COMMENT ON CONSTRAINT stock_in_submitted_by_fkey ON public.stock_in IS 'References profiles(id) - renamed from stock_in_requested_by_fkey for consistency';

-- Verify the constraint exists and is properly set up
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'stock_in_submitted_by_fkey'
        AND table_name = 'stock_in'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE public.stock_in
        ADD CONSTRAINT stock_in_submitted_by_fkey
        FOREIGN KEY (submitted_by) 
        REFERENCES auth.users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;
