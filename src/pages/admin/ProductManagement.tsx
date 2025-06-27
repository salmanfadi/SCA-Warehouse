
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ProductForm from '@/components/admin/products/ProductForm';
import ProductsTable from '@/components/admin/products/ProductsTable';
import { Plus, Search, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getHSNCodeByCategory, getGSTRateByCategory } from '@/utils/hsnCodes';

const ProductManagement: React.FC = () => {
  const { user } = useAuth();
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    searchQuery,
    setSearchQuery
  } = useProducts();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const handleCreateProduct = async (productData: Partial<Product>) => {
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Auto-assign HSN code if not provided and ensure barcode is explicitly set to null
      const dataWithHSN = {
        ...productData,
        name: productData.name || '',
        sku: productData.sku || undefined,
        barcode: null, // Explicitly set barcode to null to avoid backend errors
        hsn_code: productData.hsn_code || getHSNCodeByCategory(productData.category || ''),
        gst_rate: productData.gst_rate !== undefined ? productData.gst_rate : getGSTRateByCategory(productData.category || ''),
        gst_category: productData.gst_category || 'standard'
      };
      
      await createProduct.mutateAsync(dataWithHSN);
      
      setShowForm(false);
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleUpdateProduct = async (productData: Partial<Product>) => {
    if (!editingProduct) return;
    
    try {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        data: productData
      });
      
      setEditingProduct(null);
      setShowForm(false);
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;
    
    try {
      await deleteProduct.mutateAsync(deletingProductId);
      setDeletingProductId(null);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const filteredProducts = products?.filter(product =>
    !searchQuery || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.hsn_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Product Management" 
        description="Manage your product catalog with HSN codes for GST compliance"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products, SKU, category, or HSN code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ProductsTable
            products={filteredProducts || []}
            onEdit={(product) => {
              setEditingProduct(product);
              setShowForm(true);
            }}
            onDelete={(productId) => setDeletingProductId(productId)}
            onView={(product) => setViewingProduct(product)}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingProduct(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct || undefined}
            onSave={editingProduct ? handleUpdateProduct : handleCreateProduct}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
            }}
            isSubmitting={createProduct.isPending || updateProduct.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={() => setViewingProduct(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-gray-600">{viewingProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">SKU</p>
                  <p className="text-sm text-gray-600">{viewingProduct.sku || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-gray-600">{viewingProduct.category || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">HSN Code</p>
                  <p className="text-sm text-gray-600">{viewingProduct.hsn_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">GST Rate</p>
                  <p className="text-sm text-gray-600">
                    {viewingProduct.gst_rate !== null ? `${viewingProduct.gst_rate}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">GST Category</p>
                  <p className="text-sm text-gray-600">{viewingProduct.gst_category || '-'}</p>
                </div>
              </div>
              {viewingProduct.description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-gray-600">{viewingProduct.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProductId} onOpenChange={() => setDeletingProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductManagement;
