import { supabase } from '@/integrations/supabase/client';
import { DatabaseTables } from '@/types/supabase';

type ReserveStock = DatabaseTables['reserve_stock']['Row'];
type ReserveStockInsert = DatabaseTables['reserve_stock']['Insert'];
type ReserveStockUpdate = DatabaseTables['reserve_stock']['Update'];

interface ReserveStockWithDetails extends ReserveStock {
  product: DatabaseTables['products']['Row'];
  warehouse: DatabaseTables['warehouses']['Row'];
}

// Note: Reserve stock functionality has been temporarily disabled 
// due to missing database tables. This service will be implemented
// when the reserve_stock table is created in the database.

export const reserveStockService = {
  async create(data: ReserveStockInsert): Promise<ReserveStock> {
    const { data: result, error } = await supabase
      .from('reserve_stock')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async getAll(): Promise<ReserveStockWithDetails[]> {
    const { data, error } = await supabase
      .from('reserve_stock')
      .select(`
        *,
        product:products (
          id,
          name,
          sku,
          description
        ),
        warehouse:warehouses (
          id,
          name,
          code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ReserveStockWithDetails[];
  },

  async getById(id: string): Promise<ReserveStockWithDetails> {
    const { data, error } = await supabase
      .from('reserve_stock')
      .select(`
        *,
        product:products (
          id,
          name,
          sku,
          description
        ),
        warehouse:warehouses (
          id,
          name,
          code
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ReserveStockWithDetails;
  },

  async update(id: string, data: ReserveStockUpdate): Promise<ReserveStock> {
    const { data: result, error } = await supabase
      .from('reserve_stock')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('reserve_stock')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateStatus(id: string, status: ReserveStock['status']): Promise<ReserveStock> {
    const { data, error } = await supabase
      .from('reserve_stock')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async convertToStockOut(id: string): Promise<void> {
    const { error } = await supabase
      .from('reserve_stock')
      .update({
        status: 'converted_to_stockout',
        stock_out_id: null, // Will be set by the trigger
      })
      .eq('id', id);

    if (error) throw error;
  },

  async getReservedInventory(reserveStockId: string) {
    const { data, error } = await supabase
      .from('reserved_inventory')
      .select(`
        *,
        product:products (
          id,
          name,
          sku,
          description
        ),
        warehouse:warehouses (
          id,
          name,
          code
        )
      `)
      .eq('reserve_stock_id', reserveStockId);

    if (error) throw error;
    return data;
  }
};
