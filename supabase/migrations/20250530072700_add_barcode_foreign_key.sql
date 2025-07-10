-- Add foreign key constraint between batch_items and barcodes tables
ALTER TABLE public.batch_items
ADD CONSTRAINT fk_batch_items_barcode_id
FOREIGN KEY (barcode_id) 
REFERENCES public.barcodes(id)
ON DELETE SET NULL;
