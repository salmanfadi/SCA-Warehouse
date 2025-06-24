import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
}

export interface SalesOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company?: string; // Make optional as it might not exist in all records
  customer_phone?: string;
  status: 'pending' | 'in_progress' | 'finalizing' | 'completed';
  message?: string;
  notes?: string;
  items: SalesOrderItem[];
  created_at: string;
  updated_at?: string;
  sales_order_number?: string;
  // Additional fields that might be present directly in customer_inquiries
  product_id?: string;
  product_name?: string;
  quantity?: number;
  // Fields needed for the UI
  order_date: string;
  total_amount: number;
  pushed_to_stockout?: boolean;
}

export const useSalesOrders = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh sales orders data
  const refreshSalesOrders = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Sales orders data has been refreshed',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error refreshing sales orders:', error);
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Failed to refresh sales orders data',
        duration: 3000,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data, isLoading, error: salesOrdersError, refetch } = useQuery<SalesOrder[]>({
    queryKey: ['salesOrders'],
    queryFn: async () => {
      console.log('Fetching sales orders...');
      try {
        const { data: inquiries, error: inquiriesError } = await executeQuery('customer_inquiries', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .select('id, customer_name, customer_email, status, message, created_at, reference_number, product_id, product_name, quantity')
            .or('status.eq.in_progress,status.eq.finalizing')
            .order('created_at', { ascending: false });
        });
        
        if (inquiriesError) {
          console.error('Error fetching inquiries:', inquiriesError);
          throw inquiriesError;
        }
        
        if (!inquiries || inquiries.length === 0) {
          console.log('No orders found with in_progress or finalizing status');
          return [];
        }
        
        const inquiryIds = inquiries.map(inquiry => inquiry.id);
        console.log('Inquiry IDs to fetch items for:', inquiryIds);
        
        const { data: inquiryItems, error: itemsError } = await executeQuery('customer_inquiry_items', async (supabase) => {
          return await supabase
            .from('customer_inquiry_items')
            .select('id, inquiry_id, product_id, quantity, specific_requirements, price')
            .in('inquiry_id', inquiryIds);
        });
        
        console.log('Fetched inquiry items:', inquiryItems);
        console.log('Fetched inquiry items:', inquiryItems);
        
        if (itemsError) {
          console.error('Error fetching inquiry items:', itemsError);
          throw itemsError;
        }
        
        const productIds = [...new Set(inquiryItems.map(item => item.product_id))];
        const { data: products, error: productsError } = await executeQuery('products', async (supabase) => {
          return await supabase
            .from('products')
            .select('id, name, sku, hsn_code')
            .in('id', productIds);
        });
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
          throw productsError;
        }
        
        const itemsWithProducts = inquiryItems.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return {
            ...item,
            product
          };
        });
        
        const result = inquiries.map(inquiry => {
          // Get items from customer_inquiry_items table
          const externalItems = itemsWithProducts.filter(item => item.inquiry_id === inquiry.id);
          
          // Create a default item from the inquiry's own product_id and product_name if available
          const defaultItems = [];
          if (inquiry.product_id) {
            const product = products?.find(p => p.id === inquiry.product_id);
            defaultItems.push({
              id: `default-${inquiry.id}`,
              inquiry_id: inquiry.id,
              product_id: inquiry.product_id,
              quantity: inquiry.quantity || 1,
              specific_requirements: '',
              price: 0,
              product: product || {
                id: inquiry.product_id,
                name: inquiry.product_name || 'Unknown Product',
                sku: '',
                hsn_code: ''
              }
            });
          }
          
          // Combine both sources of items, prioritizing external items if they exist
          const items = externalItems.length > 0 ? externalItems : defaultItems;
          
          return {
            id: inquiry.id,
            sales_order_number: inquiry.reference_number || `SO-${inquiry.id.substring(0, 8)}`,
            customer_name: inquiry.customer_name,
            customer_email: inquiry.customer_email,
            customer_company: '', // Not in DB, but needed for UI
            customer_phone: '', // Not in DB, but needed for UI
            status: inquiry.status,
            message: inquiry.message || '',
            notes: '', // Not in DB, but needed for UI
            created_at: inquiry.created_at,
            items: items
          };
        });
        
        console.log('Transformed sales orders:', result);
        return result;
      } catch (error) {
        console.error('Failed to fetch sales orders:', error);
        throw error;
      }
    }
  });

  const createSalesOrder = useMutation({
    mutationFn: async (orderData: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at' | 'sales_order_number'>) => {
      // Create a new customer inquiry with status in_progress to represent an order
      const { data: order, error: orderError } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .insert({
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            customer_company: orderData.customer_company,
            customer_phone: orderData.customer_phone,
            status: 'in_progress', // This is now an order in progress
            message: orderData.message || '',
            notes: orderData.notes || 'Created directly as an order',
          })
          .select()
          .single();
      });

      if (orderError) throw orderError;

      // Insert inquiry items if any
      if (orderData.items && orderData.items.length > 0) {
        const { error: itemsError } = await executeQuery('customer_inquiry_items', async (supabase) => {
          return await supabase
            .from('customer_inquiry_items')
            .insert(
              orderData.items.map(item => ({
                inquiry_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price || 0,
                specific_requirements: item.specific_requirements || '',
              }))
            );
        });

        if (itemsError) throw itemsError;
      }

      return {
        ...order,
        sales_order_number: `SO-${order.id.substring(0, 8)}`,
        items: orderData.items
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] }); // Also invalidate orders query
      toast({
        title: 'Success',
        description: 'Sales order created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Sales order creation error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create sales order',
      });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SalesOrder['status'] }) => {
      const { error } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .update({ status })
          .eq('id', id);
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });
    },
  });

  // Track which orders are currently being pushed to stock-out
  const [pushingOrders, setPushingOrders] = useState<Record<string, boolean>>({});
  
  const pushToStockOut = useMutation({
    mutationFn: async (salesOrder: SalesOrder) => {
      // First check if the order is already pushed to stock-out to prevent duplicates
      const { data: existingOrder, error: checkError } = await executeQuery('customer_inquiries', async (supabase) => {
        return await supabase
          .from('customer_inquiries')
          .select('status')
          .eq('id', salesOrder.id)
          .single();
      });
      
      if (checkError) {
        throw new Error(`Failed to check order status: ${checkError.message}`);
      }
      
      if (existingOrder?.status === 'finalizing') {
        // Order already being processed for stock-out, don't create a duplicate
        throw new Error('This order is already being processed for stock-out');
      }
      
      // Check if there's an existing stock-out record for this order
      // Since there's no direct foreign key, we use notes field to store the reference
      const { data: existingStockOut, error: fetchError } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .select('*')
          .like('notes', `%${salesOrder.id}%`)
          .maybeSingle();
      });
        
      if (fetchError) {
        throw new Error(`Failed to check if order already has a stock-out: ${fetchError.message}`);
      }
      
      if (existingStockOut) {
        return existingStockOut;
      }

      try {
        // First update the inquiry status to finalizing - do this first so UI updates immediately
        const { error: statusUpdateError } = await executeQuery('customer_inquiries', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .update({
              status: 'finalizing', // Use finalizing status to indicate it's being processed for stock-out
            })
            .eq('id', salesOrder.id);
        });
        
        if (statusUpdateError) {
          console.error('Error updating inquiry status to finalizing:', statusUpdateError);
          throw new Error(`Failed to update inquiry status: ${statusUpdateError.message}`);
        }
        // Create stock-out request
        const { data: stockOutRequest, error: stockOutError } = await executeQuery('stock_out', async (supabase) => {
          // Store the inquiry ID in the notes field since there's no inquiry_id column
          const orderRef = salesOrder.sales_order_number || salesOrder.id.substring(0, 8);
          
          // Get the current user's information for requester fields
          const { data: { user } } = await supabase.auth.getUser();
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user?.id)
            .single();
            
          return await supabase
            .from('stock_out')
            .insert({
              customer_name: salesOrder.customer_name,
              customer_email: salesOrder.customer_email,
              customer_company: salesOrder.customer_company || '',
              customer_phone: salesOrder.customer_phone || '',
              destination: salesOrder.customer_company ? 
                `${salesOrder.customer_company} - ${salesOrder.customer_name}` : 
                salesOrder.customer_name,
              notes: `Stock-out request for Order: ${orderRef} (ID: ${salesOrder.id})`,
              status: 'pending',
              requester_id: user?.id,
              requester_name: userProfile?.username || user?.email,
              requester_username: userProfile?.username || '',
              reference_number: salesOrder.sales_order_number || `SO-${salesOrder.id.substring(0, 8)}`,
              priority: 'normal',
              requested_by: user?.id
            })
            .select()
            .single();
        });

        if (stockOutError) {
          throw new Error(`Failed to create stock-out request: ${stockOutError.message}`);
        }

        // Create stock-out details for each item
        const stockOutDetails = salesOrder.items.map(item => {
          // Ensure quantity is correctly passed from the order item
          // Convert to number to ensure it's not treated as string
          const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity as any, 10) || 1;
          
          // Only include columns that exist in the stock_out_details table
          return {
            stock_out_id: stockOutRequest.id,
            product_id: item.product_id,
            quantity: quantity, // Use the parsed quantity
            // The 'notes' column doesn't exist in stock_out_details table
            // Store specific requirements in barcode field if needed
            barcode: item.specific_requirements || '',
            // Set processed_quantity to 0 initially
            processed_quantity: 0
          };
        });
        
        // Handle case where items array might be empty but product info is in the inquiry itself
        if (stockOutDetails.length === 0 && salesOrder.product_id) {
          const quantity = typeof salesOrder.quantity === 'number' ? 
            salesOrder.quantity : parseInt(salesOrder.quantity as any, 10) || 1;
            
          stockOutDetails.push({
            stock_out_id: stockOutRequest.id,
            product_id: salesOrder.product_id,
            quantity: quantity,
            barcode: '',
            processed_quantity: 0
          });
        }

        // Log the stock out details to debug
        console.log('Inserting stock_out_details:', stockOutDetails);
        
        const { error: detailsError } = await executeQuery('stock_out_details', async (supabase) => {
          return await supabase
            .from('stock_out_details')
            .insert(stockOutDetails);
        });

        if (detailsError) {
          throw new Error(`Failed to create stock-out details: ${detailsError.message}`);
        }

        // Status already updated at the beginning of the function

        return stockOutRequest;
      } catch (error) {
        // Re-throw the error to be handled by onError
        throw error;
      }
    },
    // This runs before the mutation executes - optimistically update UI
    onMutate: async (salesOrder) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['salesOrders'] });
      
      // Save the previous state
      const previousOrders = queryClient.getQueryData<SalesOrder[]>(['salesOrders']);
      
      // Update local state to track this order as being processed
      setPushingOrders(prev => ({ ...prev, [salesOrder.id]: true }));
      
      // Optimistically update the order status in the cache
      queryClient.setQueryData(['salesOrders'], (oldData: SalesOrder[] | undefined) => {
        if (!oldData) return [];
        
        return oldData.map(order => {
          if (order.id === salesOrder.id) {
            return {
              ...order,
              status: 'finalizing',
              pushed_to_stockout: true
            };
          }
          return order;
        });
      });
      
      // Return the previous state in case we need to rollback
      return { previousOrders };
    },
    
    onSuccess: (stockOutRequest, salesOrder) => {
      // Clear the pushing state for this order
      setPushingOrders(prev => {
        const newState = { ...prev };
        delete newState[salesOrder.id];
        return newState;
      });
      
      // Clear the localStorage tracking
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentPushingOrderId');
      }
      
      // Force immediate UI update by directly updating the query cache
      queryClient.setQueryData(['salesOrders'], (oldData: SalesOrder[] | undefined) => {
        if (!oldData) return [];
        
        // Update the order in the cache immediately
        return oldData.map(order => {
          if (order.id === salesOrder.id) {
            return {
              ...order,
              status: 'finalizing',
              pushed_to_stockout: true
            };
          }
          return order;
        });
      });
      
      // Also invalidate queries to ensure data consistency with server
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      
      toast({
        title: 'Success',
        description: `Order ${salesOrder.sales_order_number || salesOrder.id.substring(0, 8)} pushed to stock-out successfully`,
        duration: 5000,
      });
    },
    onError: (error: Error, salesOrder, context) => {
      console.error('Push to stock-out error:', error);
      
      // Clear the pushing state for this order
      setPushingOrders(prev => {
        const newState = { ...prev };
        delete newState[salesOrder.id];
        return newState;
      });
      
      // Clear the localStorage tracking
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentPushingOrderId');
      }
      
      // Restore the previous state if available
      if (context?.previousOrders) {
        queryClient.setQueryData(['salesOrders'], context.previousOrders);
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to push order to stock-out: ${error.message}`,
        duration: 5000,
      });
    },
  });

  return {
    salesOrders: data || [],
    isLoading,
    isRefreshing,
    createSalesOrder,
    pushToStockOut,
    refetch,
    refreshSalesOrders
  };
};
