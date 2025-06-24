
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Product } from '@/types/database';

interface ProductFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onOpenChange }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    sku: '',
    category: '',
    barcode: '',
    unit: '',
    gst_category: '',
    hsn_code: '',
    gst_rate: 0,
    min_stock_level: 0,
    is_active: true,
  });

  const addProductMutation = useMutation({
    mutationFn: async (productData: Partial<Product> & { selectedImage?: File }) => {
      // First upload image if selected
      let imageUrl = '';
      if (productData.selectedImage) {
        const fileExt = productData.selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, productData.selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Prepare product data for database insertion
      const { selectedImage, ...productToInsert } = productData;
      
      // Ensure required fields are present and properly typed
      const finalProductData = {
        name: productToInsert.name || '',
        description: productToInsert.description || null,
        sku: productToInsert.sku || null,
        category: productToInsert.category || null,
        barcode: productToInsert.barcode || null,
        unit: productToInsert.unit || null,
        gst_category: productToInsert.gst_category || null,
        hsn_code: productToInsert.hsn_code || null,
        gst_rate: productToInsert.gst_rate || 0,
        min_stock_level: productToInsert.min_stock_level || 0,
        is_active: productToInsert.is_active !== undefined ? productToInsert.is_active : true,
        image_url: imageUrl || null,
      };

      const { data, error } = await supabase
        .from('products')
        .insert([finalProductData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        category: '',
        barcode: '',
        unit: '',
        gst_category: '',
        hsn_code: '',
        gst_rate: 0,
        min_stock_level: 0,
        is_active: true,
      });
      setSelectedImage(null);
      toast({
        title: 'Success',
        description: 'Product added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add product',
      });
    },
  });

  const handleAddProduct = () => {
    if (!newProduct.name) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Product name is required',
      });
      return;
    }

    addProductMutation.mutate({
      ...newProduct,
      selectedImage: selectedImage || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              placeholder="Enter product name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
              placeholder="Enter SKU"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
              placeholder="Enter product description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={newProduct.category}
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              placeholder="Enter category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={newProduct.unit}
              onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
              placeholder="e.g., pieces, kg, liters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gst_rate">GST Rate (%)</Label>
            <Input
              id="gst_rate"
              type="number"
              value={newProduct.gst_rate}
              onChange={(e) => setNewProduct({...newProduct, gst_rate: parseFloat(e.target.value) || 0})}
              placeholder="Enter GST rate"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
            <Input
              id="min_stock_level"
              type="number"
              value={newProduct.min_stock_level}
              onChange={(e) => setNewProduct({...newProduct, min_stock_level: parseInt(e.target.value) || 0})}
              placeholder="Enter minimum stock level"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="image">Product Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddProduct}
            disabled={!newProduct.name || addProductMutation.isPending}
          >
            {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
