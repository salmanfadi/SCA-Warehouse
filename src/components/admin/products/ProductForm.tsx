
import React, { useState, useEffect } from 'react';
import { Product } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Save, X } from 'lucide-react';
import { getHSNForProduct } from '@/utils/hsnCodes';
import { ProductBasicInfoForm } from './ProductBasicInfoForm';
import { ProductCategoryForm } from './ProductCategoryForm';
import { ProductHSNForm } from './ProductHSNForm';
// Removed ProductBarcodeForm import as it's no longer needed

interface ProductFormProps {
  product?: Product;
  onSave: (productData: Partial<Product>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSave,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    sku: '',
    category: '',
    unit: '',
    min_stock_level: 0,
    is_active: true,
    hsn_code: '',
    gst_rate: 0,
    gst_category: 'standard',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        category: product.category || '',
        unit: product.unit || '',
        min_stock_level: product.min_stock_level || 0,
        is_active: product.is_active ?? true,
        hsn_code: product.hsn_code || '',
        gst_rate: product.gst_rate || 0,
        gst_category: product.gst_category || 'standard',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    
    await onSave(formData);
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-assign HSN code and GST rate when category changes
    if (field === 'category' && value) {
      const { hsnCode, gstRate } = getHSNForProduct(value, formData.name || '');
      setFormData(prev => ({
        ...prev,
        [field]: value,
        hsn_code: hsnCode,
        gst_rate: gstRate
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? 'Edit Product' : 'Add New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductBasicInfoForm 
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
          />

          <ProductCategoryForm 
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
          />

          <ProductHSNForm 
            formData={formData}
            isSubmitting={isSubmitting}
            onChange={handleChange}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name?.trim() || !formData.category?.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {product ? 'Update' : 'Save'} Product
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductForm;
