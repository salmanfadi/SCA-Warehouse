-- First, check if barcode_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'batch_items' 
                  AND column_name = 'barcode_id') THEN
        ALTER TABLE public.batch_items
        ADD COLUMN barcode_id UUID;
    END IF;
END $$;

-- Then add the foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_batch_items_barcode_id'
    ) THEN
        ALTER TABLE public.batch_items
        ADD CONSTRAINT fk_batch_items_barcode_id
        FOREIGN KEY (barcode_id) 
        REFERENCES public.barcodes(id)
        ON DELETE SET NULL;
    END IF;
END $$;
