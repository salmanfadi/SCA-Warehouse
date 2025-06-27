
import React from 'react';
import { Product } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ProductBasicInfoFormProps {
  formData: Partial<Product>;
  isSubmitting: boolean;
  onChange: (field: keyof Product, value: any) => void;
}

export const ProductBasicInfoForm: React.FC<ProductBasicInfoFormProps> = ({
  formData,
  isSubmitting,
  onChange,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter product name"
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku || ''}
            onChange={(e) => onChange('sku', e.target.value)}
            placeholder="Enter SKU"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Enter product description"
          disabled={isSubmitting}
          rows={3}
        />
      </div>
      
      <div className="flex items-center space-x-2 mt-4">
        <Switch
          id="is_active"
          checked={formData.is_active ?? true}
          onCheckedChange={(checked) => onChange('is_active', checked)}
          disabled={isSubmitting}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
    </>
  );
};
