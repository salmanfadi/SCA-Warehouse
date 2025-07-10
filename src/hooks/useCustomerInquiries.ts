import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery, supabase } from '@/lib/supabase';
import { CustomerInquiry, CustomerInquiryItem } from '@/types/inquiries';
import { format } from 'date-fns';
import { useState } from 'react';

export function useCustomerInquiries() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: inquiries, isLoading, error, refetch } = useQuery({
    queryKey: ['customerInquiries'],
    queryFn: async () => {
      // Fetch all inquiries regardless of status for the Customer Inquiries page
      try {
        console.log('Fetching customer inquiries...');
        const result = await executeQuery('customer_inquiries', async (client) => {
          return client
            .from('customer_inquiries')
            .select('id, customer_name, customer_email, message, status, created_at')
            // No status filter - show all inquiries
            .order('created_at', { ascending: false });
        });
        
        console.log('Customer inquiries result:', result);
        if (result.error) throw result.error;
        return result.data || [];
      } catch (err) {
        console.error('Error in customer inquiries query:', err);
        throw err;
      }
    }
  });

  const getInquiryItems = async (inquiryId: string) => {
    const result = await executeQuery('customer_inquiry_items', async (client) => {
      return client
        .from('customer_inquiry_items')
        .select(`
          id,
          inquiry_id,
          product_id,
          quantity,
          price,
          specific_requirements,
          created_at,
          products(name, sku, description, unit, image_url)
        `)
        .eq('inquiry_id', inquiryId);
    });

    if (result.error) throw result.error;
    
    // Transform the data to match our expected format
    const items: CustomerInquiryItem[] = result.data?.map(item => ({
      id: item.id,
      inquiry_id: item.inquiry_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      specific_requirements: item.specific_requirements,
      created_at: item.created_at,
      product_name: item.products?.name,
      sku: item.products?.sku,
      description: item.products?.description,
      unit: item.products?.unit,
      image_url: item.products?.image_url
    })) || [];
    
    return items;
  };

  const updateInquiryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const result = await executeQuery('customer_inquiries', async (client) => {
        return client
          .from('customer_inquiries')
          .update({ status })
          .eq('id', id)
          .select();
      });

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
    }
  });

  const moveToOrders = useMutation({
    mutationFn: async (inquiryId: string) => {
      const result = await executeQuery('customer_inquiries', async (client) => {
        return client
          .from('customer_inquiries')
          .update({ status: 'in_progress' })
          .eq('id', inquiryId)
          .select();
      });

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
    }
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Wrapper for updateInquiryStatus mutation
  const handleUpdateInquiryStatus = async (id: string, status: string) => {
    try {
      await updateInquiryStatus.mutateAsync({ id, status });
      return true;
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      return false;
    }
  };

  // Convert inquiry to order
  const convertInquiryToOrder = async (inquiry: CustomerInquiry) => {
    try {
      await moveToOrders.mutateAsync(inquiry.id);
      return true;
    } catch (error) {
      console.error('Error converting inquiry to order:', error);
      return false;
    }
  };

  // Refresh inquiries
  const refreshInquiries = async () => {
    try {
      await refetch();
      return true;
    } catch (error) {
      console.error('Error refreshing inquiries:', error);
      return false;
    }
  };

  return {
    inquiries: inquiries || [],
    isLoading,
    error,
    refetch,
    getInquiryItems,
    updateInquiryStatus: handleUpdateInquiryStatus,
    moveToOrders,
    convertInquiryToOrder,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    formatDate,
    refreshInquiries
  };
}
