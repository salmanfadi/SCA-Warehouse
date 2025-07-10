
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="object-cover w-full h-full"
          />
        ) : (
          <Package className="h-12 w-12 text-gray-400" />
        )}
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          {product.description || 'No description available'}
        </p>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">SKU:</span> {product.sku}</p>
          <p><span className="font-medium">Category:</span> {product.category}</p>
          <p><span className="font-medium">Unit:</span> {product.unit}</p>
          <p><span className="font-medium">GST Rate:</span> {product.gst_rate}%</p>
        </div>
      </CardContent>
    </Card>
  );
};
