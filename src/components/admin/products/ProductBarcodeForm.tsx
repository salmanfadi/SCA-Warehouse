import React from 'react';
import { Product } from '@/types/database';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ProductBarcodeFormProps {
  formData: Partial<Product>;
  onChange: (field: keyof Product, value: any) => void;
  isSubmitting?: boolean;
}

export const ProductBarcodeForm: React.FC<ProductBarcodeFormProps> = ({
  formData,
  onChange,
  isSubmitting = false,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              placeholder="Enter product barcode"
              value={formData.barcode || ''}
              onChange={(e) => onChange('barcode', e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              Enter a unique barcode for the product. This will be used for scanning and inventory tracking.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductBarcodeForm;
