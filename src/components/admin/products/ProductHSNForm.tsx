
import React from 'react';
import { Product } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductHSNFormProps {
  formData: Partial<Product>;
  isSubmitting: boolean;
  onChange: (field: keyof Product, value: any) => void;
}

export const ProductHSNForm: React.FC<ProductHSNFormProps> = ({
  formData,
  isSubmitting,
  onChange,
}) => {
  return (
    <div className="border-t pt-4">
      <h3 className="text-lg font-medium mb-3">GST & HSN Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hsn_code">HSN Code</Label>
          <Input
            id="hsn_code"
            value={formData.hsn_code || ''}
            onChange={(e) => onChange('hsn_code', e.target.value)}
            placeholder="e.g., 62139090"
            maxLength={8}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">
            Auto-assigned based on category. Enter 4-8 digit HSN code for GST compliance
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="gst_rate">GST Rate (%)</Label>
          <Input
            id="gst_rate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={formData.gst_rate || 0}
            onChange={(e) => onChange('gst_rate', parseFloat(e.target.value) || 0)}
            placeholder="18.00"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">
            Auto-assigned based on HSN code
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="gst_category">GST Category</Label>
          <Select 
            value={formData.gst_category || 'standard'} 
            onValueChange={(value) => onChange('gst_category', value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select GST category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="zero-rated">Zero Rated</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
              <SelectItem value="nil">Nil Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
