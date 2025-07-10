
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockInItem, TransferItem, StockOutWithProduct } from '@/types/common';

interface UserStockActivity {
  stockIns: StockInItem[];
  transfers: TransferItem[];
  stockOuts: StockOutWithProduct[];
  isLoading: boolean;
  error: string | null;
}

export const useUserStockActivity = (userId?: string): UserStockActivity => {
  const { data: stockIns = [], isLoading: stockInsLoading } = useQuery({
    queryKey: ['user-stock-ins', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('stock_in')
        .select(`
          id,
          product_id,
          number_of_boxes,
          quantity,
          status,
          created_at,
          updated_at,
          product:products(*)
        `)
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ['user-transfers', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          details:inventory_transfer_details(
            id,
            product_id,
            quantity,
            product:products(*)
          )
        `)
        .eq('initiated_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data?.flatMap(transfer => 
        transfer.details?.map(detail => ({
          id: detail.id,
          product_id: detail.product_id,
          quantity: detail.quantity,
          status: transfer.status,
          created_at: transfer.created_at,
          updated_at: transfer.updated_at,
          product: detail.product
        })) || []
      ) || [];
    },
    enabled: !!userId,
  });

  const { data: stockOuts = [], isLoading: stockOutsLoading } = useQuery({
    queryKey: ['user-stock-outs', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('stock_out')
        .select(`
          id,
          destination,
          status,
          notes,
          created_at,
          updated_at,
          customer_name,
          customer_email,
          customer_company,
          customer_phone,
          sales_order_id,
          details:stock_out_details(
            id,
            product_id,
            quantity,
            product:products(*)
          )
        `)
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data?.flatMap(stockOut => 
        stockOut.details?.map(detail => ({
          id: stockOut.id,
          item_id: detail.id,
          product_id: detail.product_id,
          product_name: detail.product?.name || '',
          quantity: detail.quantity,
          destination: stockOut.destination || '',
          status: stockOut.status,
          created_at: stockOut.created_at,
          updated_at: stockOut.updated_at || stockOut.created_at,
          notes: stockOut.notes || '',
          customer_name: stockOut.customer_name,
          customer_email: stockOut.customer_email,
          customer_company: stockOut.customer_company,
          customer_phone: stockOut.customer_phone,
          sales_order_id: stockOut.sales_order_id,
          product: {
            id: detail.product?.id || '',
            name: detail.product?.name || '',
            sku: detail.product?.sku,
            description: detail.product?.description,
            hsn_code: detail.product?.hsn_code,
            gst_rate: detail.product?.gst_rate,
            category: detail.product?.category,
            barcode: detail.product?.barcode,
            unit: detail.product?.unit,
            min_stock_level: detail.product?.min_stock_level,
            is_active: detail.product?.is_active,
            gst_category: detail.product?.gst_category,
            image_url: detail.product?.image_url,
            created_at: detail.product?.created_at,
            updated_at: detail.product?.updated_at
          }
        })) || []
      ) || [];
    },
    enabled: !!userId,
  });

  const isLoading = stockInsLoading || transfersLoading || stockOutsLoading;
  const error = null; // You can implement error handling as needed

  return {
    stockIns,
    transfers,
    stockOuts,
    isLoading,
    error
  };
};
