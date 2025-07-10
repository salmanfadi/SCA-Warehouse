
// HSN Code mappings and utilities for GST compliance

export interface HSNMapping {
  code: string;
  description: string;
  gstRate: number;
  keywords: string[];
}

export const HSN_MAPPINGS: HSNMapping[] = [
  {
    code: '6203',
    description: 'Men\'s or boys\' suits, ensembles, jackets, blazers, trousers, bib and brace overalls, breeches and shorts',
    gstRate: 12,
    keywords: ['clothing', 'garment', 'shirt', 'pant', 'trouser', 'jacket', 'blazer', 'suit']
  },
  {
    code: '5402',
    description: 'Synthetic filament yarn',
    gstRate: 12,
    keywords: ['textile', 'fabric', 'yarn', 'thread', 'cloth']
  },
  {
    code: '8517',
    description: 'Telephone sets, including telephones for cellular networks or for other wireless networks',
    gstRate: 18,
    keywords: ['electronic', 'mobile', 'phone', 'smartphone', 'telephone', 'cellular']
  },
  {
    code: '8471',
    description: 'Automatic data processing machines and units thereof',
    gstRate: 18,
    keywords: ['computer', 'laptop', 'tablet', 'desktop', 'processor', 'cpu']
  },
  {
    code: '9403',
    description: 'Other furniture and parts thereof',
    gstRate: 18,
    keywords: ['furniture', 'home', 'decor', 'chair', 'table', 'desk', 'cabinet']
  },
  {
    code: '4901',
    description: 'Printed books, brochures, leaflets and similar printed matter',
    gstRate: 0,
    keywords: ['book', 'magazine', 'brochure', 'printed', 'publication']
  },
  {
    code: '9506',
    description: 'Articles and equipment for general physical exercise, gymnastics, athletics',
    gstRate: 18,
    keywords: ['sport', 'fitness', 'gym', 'exercise', 'athletics', 'equipment']
  },
  {
    code: '8708',
    description: 'Parts and accessories of motor vehicles',
    gstRate: 18,
    keywords: ['automotive', 'car', 'auto', 'vehicle', 'parts', 'accessories']
  },
  {
    code: '3304',
    description: 'Beauty or make-up preparations and preparations for the care of the skin',
    gstRate: 18,
    keywords: ['cosmetic', 'beauty', 'makeup', 'skincare', 'lotion', 'cream']
  },
  {
    code: '3004',
    description: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses',
    gstRate: 5,
    keywords: ['health', 'medicine', 'medical', 'drug', 'pharmaceutical', 'therapy']
  },
  {
    code: '2106',
    description: 'Food preparations not elsewhere specified or included',
    gstRate: 5,
    keywords: ['food', 'snack', 'nutrition', 'supplement', 'edible']
  },
  {
    code: '2202',
    description: 'Waters, including mineral waters and aerated waters, containing added sugar',
    gstRate: 18,
    keywords: ['beverage', 'drink', 'water', 'juice', 'soft drink']
  }
];

// Available product categories
export const PRODUCT_CATEGORIES = [
  'Clothing & Garments',
  'Textiles & Fabrics', 
  'Electronics',
  'Computers & Tablets',
  'Furniture & Home Decor',
  'Books & Publications',
  'Sports & Fitness',
  'Automotive Parts',
  'Cosmetics & Beauty',
  'Health & Medicine',
  'Food & Snacks',
  'Beverages'
];

/**
 * Get HSN code and GST rate based on product category and name
 */
export function getHSNForProduct(category: string, productName: string = ''): { hsnCode: string; gstRate: number } {
  const searchText = `${category} ${productName}`.toLowerCase();
  
  // Find matching HSN based on keywords
  for (const mapping of HSN_MAPPINGS) {
    if (mapping.keywords.some(keyword => searchText.includes(keyword))) {
      return {
        hsnCode: mapping.code,
        gstRate: mapping.gstRate
      };
    }
  }
  
  // Default HSN code for unmatched products
  return {
    hsnCode: '9999',
    gstRate: 18
  };
}

/**
 * Get HSN code by category (legacy function for backward compatibility)
 */
export function getHSNCodeByCategory(category: string): string {
  return getHSNForProduct(category).hsnCode;
}

/**
 * Get GST rate by category (legacy function for backward compatibility)
 */
export function getGSTRateByCategory(category: string): number {
  return getHSNForProduct(category).gstRate;
}

/**
 * Get HSN description by code
 */
export function getHSNDescription(hsnCode: string): string {
  const mapping = HSN_MAPPINGS.find(m => m.code === hsnCode);
  return mapping?.description || 'Other miscellaneous manufactured articles';
}

/**
 * Get all available HSN codes for dropdown
 */
export function getAllHSNCodes(): { code: string; description: string; gstRate: number }[] {
  return HSN_MAPPINGS.map(mapping => ({
    code: mapping.code,
    description: mapping.description,
    gstRate: mapping.gstRate
  }));
}

/**
 * Validate HSN code format
 */
export function isValidHSNCode(hsnCode: string): boolean {
  return /^\d{4}$/.test(hsnCode);
}

/**
 * Get GST rate for HSN code
 */
export function getGSTRateForHSN(hsnCode: string): number {
  const mapping = HSN_MAPPINGS.find(m => m.code === hsnCode);
  return mapping?.gstRate || 18;
}
