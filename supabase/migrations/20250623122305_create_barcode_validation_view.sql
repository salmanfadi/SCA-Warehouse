-- Create a view that joins barcodes and batch_items for validation
CREATE OR REPLACE VIEW barcode_validation_view AS
SELECT 
  b.id as barcode_id,
  b.barcode,
  b.box_id,
  b.product_id as barcode_product_id,
  bi.id as batch_item_id,
  bi.product_id as batch_item_product_id,
  p.name as product_name
FROM 
  barcodes b
LEFT JOIN 
  batch_items bi ON b.box_id = bi.barcode_id
LEFT JOIN
  products p ON bi.product_id = p.id;
