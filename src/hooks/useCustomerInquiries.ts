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
            .select(`
              id, 
              customer_name, 
              customer_email, 
              message, 
              status, 
              created_at, 
              sales_order_number
            `)
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

  // Get inquiry items count and details for all inquiries
  const getInquiryItemsCount = async (inquiryIds: string[]) => {
    if (!inquiryIds.length) return {};
    
    const result = await executeQuery('inquiry_items_count', async (client) => {
      return client
        .from('customer_inquiry_items')
        .select(`
          inquiry_id,
          product_id,
          quantity,
          products(name)
        `)
        .in('inquiry_id', inquiryIds);
    });

    if (result.error) throw result.error;
    
    // Group by inquiry_id and count items
    const itemsCountMap: Record<string, { count: number, items: Array<{ name: string, quantity: number }> }> = {};
    
    result.data?.forEach(item => {
      if (!itemsCountMap[item.inquiry_id]) {
        itemsCountMap[item.inquiry_id] = { count: 0, items: [] };
      }
      
      itemsCountMap[item.inquiry_id].count++;
      itemsCountMap[item.inquiry_id].items.push({
        name: item.products?.name || 'Unknown Product',
        quantity: item.quantity
      });
    });
    
    return itemsCountMap;
  };

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
      console.log('📝 [MOVE_TO_ORDERS] Moving inquiry to orders:', inquiryId);
      
      try {
        const result = await executeQuery('customer_inquiries', async (client) => {
          return client
            .from('customer_inquiries')
            .update({ 
              status: 'in_progress',
              moved_to_orders: true // Set moved_to_orders flag to true
            })
            .eq('id', inquiryId)
            .select();
        });
        
        if (result.error) {
          console.error('❌ [MOVE_TO_ORDERS] Error updating inquiry:', inquiryId, result.error);
          throw result.error;
        }
        
        console.log('✅ [MOVE_TO_ORDERS] Successfully moved inquiry to orders:', inquiryId);
        return result.data;
      } catch (error) {
        console.error('❌ [MOVE_TO_ORDERS] Error in moveToOrders mutation:', error);
        throw error;
      }
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
    getInquiryItemsCount,
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
