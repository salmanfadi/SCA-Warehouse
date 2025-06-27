
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';
import { Product } from '@/types/database';

const CustomerProducts: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('is_active.eq.true,active.eq.true')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-gray-600 mt-2">Browse our available products</p>
        </div>

        <div className="relative w-full md:w-64 mt-4 md:mt-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts?.map((product) => (
            <Card key={product.id} className="overflow-hidden">
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
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerProducts;
