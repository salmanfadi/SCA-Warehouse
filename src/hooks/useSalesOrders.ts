import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { toast } from 'sonner';

export interface SalesOrderItem {
  id?: string;
  product_id: string;
  quantity: number;
  specific_requirements?: string;
  price?: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    hsn_code?: string;
    gst_rate?: number;
  };
  reserved?: boolean;
}

export interface SalesOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company?: string;
  customer_phone?: string;
  status: 'pending' | 'in_progress' | 'finalizing' | 'completed';
  message?: string;
  notes?: string;
  items: SalesOrderItem[];
  created_at: string;
  updated_at?: string;
  sales_order_number?: string;
  product_id?: string;
  product_name?: string;
  quantity?: number;
  order_date: string;
  total_amount: number;
  pushed_to_stockout?: boolean;
  is_reserved?: boolean;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface SalesOrdersResponse {
  data: SalesOrder[];
  total: number;
}

export const useSalesOrders = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pushingOrders, setPushingOrders] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1
  });

  // Main query to fetch sales orders with pagination
  const { 
    data, 
    isLoading, 
    error: salesOrdersError, 
    refetch 
  } = useQuery<SalesOrdersResponse, Error>({
    queryKey: ['salesOrders', pagination.page, pagination.pageSize],
    queryFn: async () => {
      try {
        // First, get the total count
        const { count } = await executeQuery('customer_inquiries_count', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.in_progress,status.eq.finalizing');
        });
        
        // Calculate pagination range
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        
        // Fetch paginated orders
        const { data: inquiries, error: inquiriesError } = await executeQuery('customer_inquiries', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .select('id, customer_name, customer_email, status, message, created_at, sales_order_number, product_id, product_name, quantity, is_reserved')
            .or('status.eq.in_progress,status.eq.finalizing')
            .order('created_at', { ascending: false })
            .range(from, to);
        });
        

        if (inquiriesError) {
          console.error('Error fetching inquiries:', inquiriesError);
          throw inquiriesError;
        }
        
        if (!inquiries || inquiries.length === 0) {
          console.log('No orders found with in_progress or finalizing status');
          return [];
        }
        
        // Debug log to check if is_reserved field is being fetched
        console.log('Fetched inquiries with is_reserved field:', inquiries.map(inq => ({ 
          id: inq.id, 
          sales_order: inq.sales_order_number, 
          is_reserved: inq.is_reserved 
        })));

        
        // Get inquiry items for each order
        const inquiryIds = inquiries.map(inquiry => inquiry.id);
        const { data: inquiryItems, error: itemsError } = await executeQuery('customer_inquiry_items', async (supabase) => {
          return await supabase
            .from('customer_inquiry_items')
            .select('id, inquiry_id, product_id, quantity, specific_requirements, price')
            .in('inquiry_id', inquiryIds);
        });
        
        if (itemsError) throw itemsError;
        
        // Map items to their respective inquiries
        const orders = inquiries.map(inquiry => {
          const items = (inquiryItems || []).filter(item => item.inquiry_id === inquiry.id);
          return {

            id: inquiry.id,
            sales_order_number: inquiry.sales_order_number || `SO-${inquiry.id.substring(0, 8)}`,
            customer_name: inquiry.customer_name,
            customer_email: inquiry.customer_email,
            customer_company: '', // Not in DB, but needed for UI
            customer_phone: '', // Not in DB, but needed for UI
            status: inquiry.status,
            message: inquiry.message || '',
            notes: '', // Not in DB, but needed for UI
            created_at: inquiry.created_at,
            items: items,
            // Include the is_reserved field from the inquiry
            is_reserved: inquiry.is_reserved || false,
            // Required fields for the UI

            order_date: inquiry.created_at,
            total_amount: 0, // This would be calculated based on items
            items: items.length > 0 ? items : [
              {
                product_id: inquiry.product_id || '',
                quantity: inquiry.quantity || 1,
                product: {
                  id: inquiry.product_id || '',
                  name: inquiry.product_name || 'Unknown Product'
                }
              }
            ]
          };
        });
        
        return {
          data: orders as unknown as SalesOrder[],
          total: count || 0
        };
        
      } catch (error) {
        console.error('Error in useSalesOrders query:', error);
        throw error;
      }
    }
  });

  // Function to refresh sales orders data
  const refreshSalesOrders = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      await refetch();
      toast.success('Refreshed', {
        description: 'Sales orders data has been refreshed',
        duration: 3000
      });
    } catch (error) {
      console.error('Error refreshing sales orders:', error);
      toast.error('Refresh Failed', {
        description: 'Failed to refresh sales orders data',
        duration: 3000
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Pagination handlers
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };
  
  const updatePageSize = (size: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: size,
      page: 1 // Reset to first page when page size changes
    }));
  };
  
  // Update total count when data is fetched
  useEffect(() => {
    if (data?.total !== undefined) {
      setPagination(prev => ({
        ...prev,
        totalCount: data.total,
        totalPages: Math.ceil(data.total / prev.pageSize)
      }));
    }
  }, [data?.total, pagination.pageSize]);

  // Mock implementation for stock out function
  const pushToStockOut = async (orderId: string) => {
    try {
      setPushingOrders(prev => ({ ...prev, [orderId]: true }));
      // Implementation would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Order pushed to stock out');
      return true;
    } catch (error) {
      console.error('Error pushing to stock out:', error);
      toast.error('Failed to push to stock out');
      return false;
    } finally {
      setPushingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  return {
    salesOrders: data?.data || [],
    isLoading,
    isRefreshing,
    refetch,
    refreshSalesOrders,
    error: salesOrdersError,
    pushToStockOut,
    isPushingOrder: (orderId: string) => pushingOrders[orderId] || false,
    // Pagination
    pagination: {
      ...pagination,
      goToPage,
      setPageSize: updatePageSize,
      nextPage: () => goToPage(pagination.page + 1),
      prevPage: () => goToPage(pagination.page - 1),
      canNextPage: pagination.page < pagination.totalPages,
      canPrevPage: pagination.page > 1
    }
  };
};

export default useSalesOrders;
