
import React from 'react';
import { Product } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRODUCT_CATEGORIES } from '@/utils/hsnCodes';

interface ProductCategoryFormProps {
  formData: Partial<Product>;
  isSubmitting: boolean;
  onChange: (field: keyof Product, value: any) => void;
}

export const ProductCategoryForm: React.FC<ProductCategoryFormProps> = ({
  formData,
  isSubmitting,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={formData.category || ''} 
          onValueChange={(value) => onChange('category', value)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="category-trigger">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(PRODUCT_CATEGORIES) && PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={`category-${category}`} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="unit">Unit</Label>
        <Input
          id="unit"
          value={formData.unit || ''}
          onChange={(e) => onChange('unit', e.target.value)}
          placeholder="e.g., pcs, kg, ltr"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="min_stock_level">Min Stock Level</Label>
        <Input
          id="min_stock_level"
          type="number"
          min={0}
          value={formData.min_stock_level || 0}
          onChange={(e) => onChange('min_stock_level', parseInt(e.target.value) || 0)}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};
