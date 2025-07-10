
-- Update products with HSN codes based on their category
UPDATE products 
SET hsn_code = '6203' 
WHERE (category ILIKE '%clothing%' OR category ILIKE '%garment%' OR category ILIKE '%shirt%' OR category ILIKE '%pant%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '5402' 
WHERE (category ILIKE '%textile%' OR category ILIKE '%fabric%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '8517' 
WHERE (category ILIKE '%electronic%' OR category ILIKE '%mobile%' OR category ILIKE '%phone%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '8471' 
WHERE (category ILIKE '%computer%' OR category ILIKE '%laptop%' OR category ILIKE '%tablet%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '9403' 
WHERE (category ILIKE '%furniture%' OR category ILIKE '%home%' OR category ILIKE '%decor%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '4901' 
WHERE (category ILIKE '%book%' OR category ILIKE '%magazine%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '9506' 
WHERE (category ILIKE '%sport%' OR category ILIKE '%fitness%' OR category ILIKE '%gym%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '8708' 
WHERE (category ILIKE '%automotive%' OR category ILIKE '%car%' OR category ILIKE '%auto%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '3304' 
WHERE (category ILIKE '%cosmetic%' OR category ILIKE '%beauty%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '3004' 
WHERE (category ILIKE '%health%' OR category ILIKE '%medicine%' OR category ILIKE '%medical%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '2106' 
WHERE (category ILIKE '%food%' OR category ILIKE '%snack%') 
AND (hsn_code IS NULL OR hsn_code = '');

UPDATE products 
SET hsn_code = '2202' 
WHERE (category ILIKE '%beverage%' OR category ILIKE '%drink%') 
AND (hsn_code IS NULL OR hsn_code = '');

-- Set GST rates based on HSN codes
UPDATE products SET gst_rate = 0 WHERE hsn_code = '4901' AND (gst_rate IS NULL OR gst_rate = 0);
UPDATE products SET gst_rate = 5 WHERE hsn_code IN ('2106', '3004') AND (gst_rate IS NULL OR gst_rate = 0);
UPDATE products SET gst_rate = 12 WHERE hsn_code IN ('5402', '6203') AND (gst_rate IS NULL OR gst_rate = 0);
UPDATE products SET gst_rate = 18 WHERE hsn_code NOT IN ('4901', '2106', '3004', '5402', '6203') AND (gst_rate IS NULL OR gst_rate = 0);

-- For any remaining products without HSN codes, assign the default
UPDATE products 
SET hsn_code = '9999' 
WHERE hsn_code IS NULL OR hsn_code = '';

-- Set default GST rate for products that still don't have one
UPDATE products 
SET gst_rate = 18 
WHERE gst_rate IS NULL OR gst_rate = 0;
