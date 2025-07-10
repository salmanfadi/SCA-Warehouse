import React from 'react';
import { useCart } from '@/hooks/useCart';
import { Product as BaseProduct } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

type LocalProduct = BaseProduct & {
  image_url?: string;
};

type LocalCartItem = Omit<import('@/types/database').CartItem, 'product'> & {
  product: LocalProduct;
};

const Cart: React.FC = () => {
  const { 
    items, 
    updateQuantity, 
    updateRequirements, 
    removeFromCart, 
    clearCart, 
    getTotalItems, 
    getTotalPrice 
  } = useCart();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRequirementsChange = (productId: string, requirements: string) => {
    updateRequirements(productId, requirements);
  };

  const localItems: LocalCartItem[] = items as LocalCartItem[];

  if (localItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Your Cart"
          description="Review and manage your selected products"
        />
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-500">Add some products to your cart to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Your Cart"
        description="Review and manage your selected products"
      />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <Button variant="outline" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {localItems.map((item) => (
            <Card key={item.product_id}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      SKU: {item.product.sku}
                    </p>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requirements
                      </label>
                      <Textarea
                        value={item.requirements || ''}
                        onChange={(e) => handleRequirementsChange(item.product_id, e.target.value)}
                        placeholder="Any special requirements or notes..."
                        rows={2}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)}
                        className="w-16 text-center"
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{getTotalItems()}</span>
                </div>
                
                <div className="pt-4 border-t">
                  <Button className="w-full" size="lg">
                    Submit Inquiry
                  </Button>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    This will create an inquiry for these products
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
