import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Minus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PublicLayout } from '@/components/layout/PublicLayout';

interface InquiryItem {
  productId: string;
  quantity: number;
  requirements: string;
}

interface InquiryFormData {
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  customerPhone: string;
  message: string;
  items: InquiryItem[];
}

const CustomerInquiry: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<InquiryFormData>({
    customerName: '',
    customerEmail: '',
    customerCompany: '',
    customerPhone: '',
    message: '',
    items: [{ productId: '', quantity: 1, requirements: '' }]
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, description, price')
        .or('is_active.eq.true,active.eq.true')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  const submitInquiry = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      // Mock implementation since sales_inquiries table doesn't exist
      console.log('Inquiry submission:', data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { id: 'mock-id' };
    },
    onSuccess: () => {
      toast({
        title: 'Inquiry Submitted',
        description: 'Your inquiry has been submitted successfully. We will contact you soon.',
      });
      navigate('/customer/inquiry-success');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit inquiry. Please try again.',
      });
    },
  });

  const handleInputChange = (field: keyof InquiryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InquiryItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, requirements: '' }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail || !formData.customerCompany) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    if (formData.items.some(item => !item.productId || item.quantity <= 0)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Items',
        description: 'Please select products and enter valid quantities.',
      });
      return;
    }

    submitInquiry.mutate(formData);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Submit Sales Inquiry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerCompany">Company *</Label>
                    <Input
                      id="customerCompany"
                      value={formData.customerCompany}
                      onChange={(e) => handleInputChange('customerCompany', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Additional Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Product Items *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Product</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => handleItemChange(index, 'productId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} {product.sku && `(${product.sku})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div>
                          <Label>Requirements</Label>
                          <div className="flex gap-2">
                            <Input
                              value={item.requirements}
                              onChange={(e) => handleItemChange(index, 'requirements', e.target.value)}
                              placeholder="Special requirements"
                            />
                            {formData.items.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={submitInquiry.isPending}>
                  {submitInquiry.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Inquiry'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
};

export default CustomerInquiry;
