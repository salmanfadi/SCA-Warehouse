
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  requirements: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  customer_phone: string;
  inquiry_id: string;
  status: string;
  order_date: string;
  total_amount: number;
  items: OrderItem[];
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Order[]> => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching orders:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load orders'
          });
          throw error;
        }

        return (data || []).map((order: any) => ({
          id: order.id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_company: order.customer_company,
          customer_phone: order.customer_phone || '',
          inquiry_id: order.inquiry_id || '',
          status: order.status,
          order_date: order.order_date || order.created_at,
          total_amount: order.total_amount || 0,
          items: order.items || []
        }));
      } catch (error) {
        console.error('Error in useOrders:', error);
        // Return empty array as fallback
        return [];
      }
    }
  });
}
