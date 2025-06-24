
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Database, Users, ShoppingCart, Package } from 'lucide-react';

export const TestDataCreator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const createTestProducts = async () => {
    const testProducts = [
      {
        name: 'Industrial Pump Model A',
        sku: 'PUMP-A-001',
        description: 'High-pressure industrial pump for manufacturing',
        category: 'Industrial Equipment',
        hsn_code: '84137090',
        gst_rate: 18.00,
        unit: 'piece'
      },
      {
        name: 'Steel Bearing Set',
        sku: 'BEAR-S-002',
        description: 'Precision steel bearings for heavy machinery',
        category: 'Components',
        hsn_code: '84821000',
        gst_rate: 18.00,
        unit: 'set'
      },
      {
        name: 'Control Panel Assembly',
        sku: 'CTRL-P-003',
        description: 'Electronic control panel for automation systems',
        category: 'Electronics',
        hsn_code: '85371090',
        gst_rate: 18.00,
        unit: 'piece'
      }
    ];

    const { data, error } = await supabase
      .from('products')
      .insert(testProducts)
      .select();

    if (error) throw error;
    return data;
  };

  const createTestInquiries = async (products: any[]) => {
    const testInquiries = [
      {
        customer_name: 'John Smith',
        customer_email: 'john.smith@techcorp.com',
        customer_company: 'TechCorp Industries',
        customer_phone: '+1-555-0123',
        status: 'new',
        notes: 'Urgent requirement for manufacturing line upgrade'
      },
      {
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.johnson@manufacturing.com',
        customer_company: 'Johnson Manufacturing',
        customer_phone: '+1-555-0456',
        status: 'in_progress',
        notes: 'Follow-up call scheduled for pricing discussion'
      },
      {
        customer_name: 'Mike Wilson',
        customer_email: 'm.wilson@automation.co',
        customer_company: 'Wilson Automation Co.',
        customer_phone: '+1-555-0789',
        status: 'new',
        notes: 'Interested in bulk purchase with installation service'
      }
    ];

    const { data: inquiries, error } = await supabase
      .from('customer_inquiries')
      .insert(testInquiries)
      .select();

    if (error) throw error;

    // Create inquiry items
    const inquiryItems = [];
    
    // First inquiry - 2 items
    inquiryItems.push(
      {
        inquiry_id: inquiries[0].id,
        product_id: products[0].id,
        quantity: 2,
        specific_requirements: 'Required delivery within 2 weeks'
      },
      {
        inquiry_id: inquiries[0].id,
        product_id: products[1].id,
        quantity: 10,
        specific_requirements: 'High-grade steel required'
      }
    );

    // Second inquiry - 1 item
    inquiryItems.push({
      inquiry_id: inquiries[1].id,
      product_id: products[2].id,
      quantity: 1,
      specific_requirements: 'Custom configuration needed'
    });

    // Third inquiry - 3 items
    inquiryItems.push(
      {
        inquiry_id: inquiries[2].id,
        product_id: products[0].id,
        quantity: 5,
        specific_requirements: 'Bulk discount expected'
      },
      {
        inquiry_id: inquiries[2].id,
        product_id: products[1].id,
        quantity: 25,
        specific_requirements: 'Standard specifications'
      },
      {
        inquiry_id: inquiries[2].id,
        product_id: products[2].id,
        quantity: 3,
        specific_requirements: 'Installation support required'
      }
    );

    const { error: itemsError } = await supabase
      .from('customer_inquiry_items')
      .insert(inquiryItems);

    if (itemsError) throw itemsError;

    return inquiries;
  };

  const handleCreateTestData = async () => {
    setIsLoading(true);
    try {
      // First create products
      const products = await createTestProducts();
      console.log('Created products:', products);

      // Then create inquiries with items
      const inquiries = await createTestInquiries(products);
      console.log('Created inquiries:', inquiries);

      toast({
        title: 'Success',
        description: `Created ${products.length} test products and ${inquiries.length} test inquiries with items`,
      });
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create test data. Check console for details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestData = async () => {
    setIsLoading(true);
    try {
      // Delete in reverse order due to foreign key constraints
      await supabase.from('customer_inquiry_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customer_inquiries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().like('sku', 'PUMP-%').or('sku.like.BEAR-%').or('sku.like.CTRL-%');

      toast({
        title: 'Success',
        description: 'Test data cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing test data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear test data. Check console for details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleCreateTestData} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Users className="h-4 w-4" />
            )}
            Create Test Inquiries & Products
          </Button>
          
          <Button 
            onClick={clearTestData} 
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Clear Test Data
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          Creates sample customer inquiries with products to test the workflow: Inquiries → Sales Orders → Stock-Out
        </p>
      </CardContent>
    </Card>
  );
};
