
import { useState, useEffect } from 'react';
import { executeQuery } from '@/lib/supabase';
import { CustomerInquiry } from '@/types/inquiries';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const useCustomerInquiries = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'finalizing' | 'completed'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);

  // Use React Query to fetch inquiries
  const { data: inquiries = [], isLoading, error: queryError } = useQuery({
    queryKey: ['customer-inquiries'],
    queryFn: async () => {
      const { data, error } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .select(`
            *,
            items:customer_inquiry_items(
              *,
              product:products(
                id,
                name,
                sku,
                description,
                hsn_code,
                gst_rate,
                created_at,
                updated_at,
                category,
                barcode,
                unit,
                min_stock_level,
                is_active,
                gst_category,
                image_url
              )
            )
          `)
          .order('created_at', { ascending: false });
      });

      if (error) {
        throw error;
      }

      // Transform the data to match CustomerInquiry type
      return (data || []).map(inquiry => ({
        ...inquiry,
        items: inquiry.items?.map(item => ({
          ...item,
          product: item.product ? {
            ...item.product,
            image_url: item.product.image_url || null
          } : null
        })) || []
      })) as CustomerInquiry[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Set up real-time subscriptions
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: subscription } = await executeQuery('realtime', async (supabase) => {
        return supabase
          .channel('customer_inquiries_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'customer_inquiries' },
            () => {
              // Invalidate and refetch the query when data changes
              queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] });
            }
          )
          .subscribe();
      });
      
      return () => {
        if (subscription) {
          executeQuery('realtime', async (supabase) => {
            return supabase.removeChannel(subscription);
          });
        }
      };
    };
    
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe.then(unsub => unsub && unsub());
    };
  }, [queryClient]);

  const convertInquiryToOrder = useMutation({
    mutationFn: async (inquiry: CustomerInquiry) => {
      console.log('Converting inquiry to completed status:', inquiry);

      if (!inquiry.items || inquiry.items.length === 0) {
        throw new Error('Inquiry has no items');
      }

      // Since sales_orders table doesn't exist yet, we'll just mark the inquiry as completed
      const { error: updateError } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .update({
            status: 'completed',
            notes: inquiry.notes ? `${inquiry.notes}\nMarked as converted to order on ${new Date().toISOString()}` : 
              `Marked as converted to order on ${new Date().toISOString()}`
          })
          .eq('id', inquiry.id);
      });

      if (updateError) {
        console.error('Error updating inquiry:', updateError);
        throw updateError;
      }

      return inquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] });
      toast({
        title: "Success",
        description: `Inquiry marked as completed and ready for order processing`,
      });
    },
    onError: (error: any) => {
      console.error('Error in convertInquiryToOrder:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to convert inquiry to sales order. Please try again.",
      });
    }
  });

  const updateInquiryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'pending' | 'in_progress' | 'finalizing' | 'completed' }) => {
      if (status === 'completed') {
        const inquiry = inquiries.find(inq => inq.id === id);
        if (!inquiry) throw new Error('Inquiry not found');
        
        // Use the convertInquiryToOrder mutation directly
        await convertInquiryToOrder.mutateAsync(inquiry);
        return { id, status };
      }

      const { error } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .update({ status })
          .eq('id', id);
      });

      if (error) throw error;

      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] });
      toast({
        title: "Success",
        description: "Inquiry status updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error updating inquiry status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update inquiry status",
      });
    }
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
  };

  const refreshInquiries = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] });
  };

  // Filter inquiries based on search term and status filter
  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      searchTerm === '' || 
      inquiry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return {
    inquiries: filteredInquiries,
    isLoading,
    error: queryError,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedInquiry,
    setSelectedInquiry,
    updateInquiryStatus,
    convertInquiryToOrder,
    formatDate,
    refreshInquiries
  };
};

interface StockOutSubmission {
  productId: string;
  quantity: number;
  destination: string;
  notes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requiredDate?: string;
}

export const useStockOutSubmission = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const submitStockOut = useMutation({
    mutationFn: async (data: StockOutSubmission) => {
      setIsLoading(true);
      try {
        const { data: stockOut, error } = await supabase
          .from('stock_out')
          .insert({
            destination: data.destination,
            notes: data.notes,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
        
        return stockOut;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Stock out request has been submitted for approval',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit stock out request',
        variant: 'destructive',
      });
    },
  });

  return {
    submitStockOut,
    isLoading,
  };
};
