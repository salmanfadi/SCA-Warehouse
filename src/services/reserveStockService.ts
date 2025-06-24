
import { supabase } from '@/lib/supabase';

// Note: Reserve stock functionality has been temporarily disabled 
// due to missing database tables. This service will be implemented
// when the reserve_stocks table is created in the database.

export const reserveStockService = {
  async create(data: any): Promise<any> {
    throw new Error('Reserve stock functionality is not available - missing database table');
  },

  async getAll(): Promise<any[]> {
    return [];
  },

  async getById(id: string): Promise<any> {
    throw new Error('Reserve stock functionality is not available - missing database table');
  },

  async update(id: string, data: any): Promise<any> {
    throw new Error('Reserve stock functionality is not available - missing database table');
  },

  async delete(id: string): Promise<void> {
    throw new Error('Reserve stock functionality is not available - missing database table');
  }
};
