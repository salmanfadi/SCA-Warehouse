import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database.types';


type StockIn = Database['public']['Tables']['stock_in']['Insert'];

interface StockInFormData {
  productId: string;
  productName: string;
  numberOfBoxes: string | number;
  source: string;
  notes: string;
}

const StockInForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .order('name');
        
      if (error) throw error;
      return data;
    },
  });
  
  const [formData, setFormData] = useState<StockInFormData>({
    productId: '',
    productName: '',
    numberOfBoxes: '',
    source: '',
    notes: '',
  });

  // Handle product selection from input
  const handleProductInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Find if the current value matches any product
    const selectedProduct = products?.find(p => 
      `${p.name} ${p.sku ? `(SKU: ${p.sku})` : ''}` === value
    );
    
    setFormData(prev => ({
      ...prev,
      productName: value,
      productId: selectedProduct?.id || ''
    }));
  };
  
  const [formErrors, setFormErrors] = useState({
    numberOfBoxes: '',
    source: '',
  });
  
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{name: string, sku: string | null} | null>(null);
  
  // Create stock in mutation
  const createStockInMutation = useMutation({
    mutationFn: async (data: { 
      product_id: string; 
      number_of_boxes: number; 
      submitted_by: string;
      source: string;
      notes?: string;
    }) => {
      console.log("Submitting stock in request:", data);
      
      const stockInData = {
        product_id: data.product_id,
        submitted_by: data.submitted_by,
        source: data.source,
        notes: data.notes,
        status: 'pending' as const,
        number_of_boxes: Number(data.number_of_boxes)
      };
      
      const { data: result, error } = await supabase
        .from('stock_in')
        .insert([stockInData])
        .select('id')
        .single();
        
      if (error) {
        console.error("Database error:", error);
        throw error;
      }
      
      if (!result) {
        throw new Error('Failed to create stock in record');
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-stock-in', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['operator-stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['operator-recent-activities', user?.id] });
      
      toast.success(`${formData.numberOfBoxes} boxes of the selected product have been submitted for processing.`);
      navigate('/operator/submissions');
    },
    onError: (error) => {
      console.error("Submission error:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit stock in request');
    },
  });
  

  
  const handleBoxesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, numberOfBoxes: value });
    
    // Validate the input
    if (value === '') {
      setFormErrors({ ...formErrors, numberOfBoxes: 'Quantity is required' });
    } else {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        setFormErrors({ ...formErrors, numberOfBoxes: 'Please enter a valid number' });
      } else if (numValue < 1) {
        setFormErrors({ ...formErrors, numberOfBoxes: 'Quantity must be at least 1' });
      } else {
        setFormErrors({ ...formErrors, numberOfBoxes: '' });
      }
    }
  };
  
  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, source: value });
    
    // Validate the input
    if (!value.trim()) {
      setFormErrors({ ...formErrors, source: 'Source is required' });
    } else if (value.length > 100) {
      setFormErrors({ ...formErrors, source: 'Source must be 100 characters or less' });
    } else {
      setFormErrors({ ...formErrors, source: '' });
    }
  };
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Limit notes to 200 characters
    if (value.length <= 200) {
      setFormData({ ...formData, notes: value });
    }
  };
  
  const validateForm = () => {
    let valid = true;
    const errors = { ...formErrors };
    
    // Validate product
    if (!formData.productId) {
      valid = false;
      toast.error('Please select a product');
      return valid;
    }
    
    // Validate number of boxes
    const numBoxes = parseInt(formData.numberOfBoxes as string);
    if (isNaN(numBoxes) || numBoxes < 1) {
      errors.numberOfBoxes = 'Number of boxes must be at least 1';
      valid = false;
    } else {
      errors.numberOfBoxes = '';
    }
    
    // Validate source
    if (!formData.source.trim()) {
      errors.source = 'Source is required';
      valid = false;
    } else if (formData.source.length > 100) {
      errors.source = 'Source must be 100 characters or less';
      valid = false;
    } else {
      errors.source = '';
    }
    
    setFormErrors(errors);
    return valid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId) {
      toast.error('Please select a valid product');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to submit stock in requests');
      return;
    }
    
    // Open confirmation dialog
    setIsConfirmDialogOpen(true);
  };
  
  const handleConfirmSubmit = () => {
    if (!user?.id) {
      toast.error('You must be logged in to submit stock in requests');
      return;
    }
    
    const numBoxes = parseInt(formData.numberOfBoxes as string);
    
    console.log("Submitting with user ID:", user.id);
    createStockInMutation.mutate({
      product_id: formData.productId,
      number_of_boxes: numBoxes,
      submitted_by: user.id,
      source: formData.source.trim(),
      notes: formData.notes.trim() || undefined
    });
    
    setIsConfirmDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="New Stock In" 
        description="Submit new stock inward request"
      />
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              onClick={() => navigate('/field')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <CardTitle>Stock In Form</CardTitle>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <div className="relative">
                  <Input
                    id="product"
                    list="products-list"
                    value={formData.productName}
                    onChange={handleProductInput}
                    placeholder="Type or select a product..."
                    className="w-full"
                    required
                    autoComplete="off"
                  />
                  <datalist id="products-list">
                    {productsLoading ? (
                      <option value="Loading products..." disabled />
                    ) : products && products.length > 0 ? (
                      products.map((product) => (
                        <option 
                          key={product.id} 
                          value={`${product.name} ${product.sku ? `(SKU: ${product.sku})` : ''}`}
                        >
                          {product.name} {product.sku && `(SKU: ${product.sku})`}
                        </option>
                      ))
                    ) : (
                      <option value="No products available" disabled />
                    )}
                  </datalist>

                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="boxes">Number of Boxes</Label>
                <Input
                  id="boxes"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.numberOfBoxes}
                  onChange={handleBoxesChange}
                  required
                />
                {formErrors.numberOfBoxes && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.numberOfBoxes}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="source">Received From (Source)</Label>
                <Input
                  id="source"
                  type="text"
                  placeholder="e.g., Supplier XYZ"
                  value={formData.source}
                  onChange={handleSourceChange}
                  required
                  maxLength={100}
                />
                {formErrors.source && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.source}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information"
                  value={formData.notes}
                  onChange={handleNotesChange}
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-gray-500 text-right">
                  {formData.notes.length}/200 characters
                </p>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !formData.productId || 
                  formData.numberOfBoxes === '' || 
                  !!formErrors.numberOfBoxes || 
                  !formData.source.trim() ||
                  !!formErrors.source ||
                  createStockInMutation.isPending
                }
              >
                {createStockInMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stock In Request</DialogTitle>
            <DialogDescription>
              Please review the details of your stock in request before submitting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 py-2">
              <p className="font-medium">Product:</p>
              <p className="col-span-2">{selectedProduct?.name} {selectedProduct?.sku ? `(SKU: ${selectedProduct.sku})` : ''}</p>
              
              <p className="font-medium">Number of Boxes:</p>
              <p className="col-span-2">{formData.numberOfBoxes}</p>
              
              <p className="font-medium">Received From:</p>
              <p className="col-span-2">{formData.source}</p>
              
              {formData.notes && (
                <>
                  <p className="font-medium">Notes:</p>
                  <p className="col-span-2 whitespace-pre-wrap">{formData.notes}</p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSubmit} 
              disabled={createStockInMutation.isPending}
            >
              {createStockInMutation.isPending ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockInForm;
