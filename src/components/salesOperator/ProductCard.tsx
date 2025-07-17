
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-2">
        <Package className="h-8 w-8 text-gray-300" />
      </div>
      <CardHeader className="p-3 pb-0 flex-grow">
        <CardTitle className="text-sm font-medium line-clamp-2 h-10">
          {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="font-medium">SKU:</span>
          <span className="text-gray-600">{product.sku || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Category:</span>
          <span className="text-gray-600">{product.category || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">GST:</span>
          <span className="text-gray-600">{product.gst_rate ? `${product.gst_rate}%` : 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
};
