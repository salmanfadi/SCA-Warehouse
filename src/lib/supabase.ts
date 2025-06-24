
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

// Re-export the configured supabase client
export { supabase };

/**
 * Execute a Supabase query with error handling
 * @param table The table name for logging purposes
 * @param queryFn Function that receives the supabase client and executes a query
 * @returns The result of the query
 */
export const executeQuery = async <T = any>(table: string, queryFn: (supabase: any) => Promise<any>) => {
  try {
    const result = await queryFn(supabase);
    if (result.error) {
      console.error(`Error executing query on ${table}:`, result.error);
      throw result.error;
    }
    return result;
  } catch (error) {
    console.error(`Failed to execute query on ${table}:`, error);
    throw error;
  }
};

/**
 * Execute an operation with retry logic for critical operations
 * @param operation The function to execute
 * @param maxRetries Maximum number of retries
 * @param delay Base delay in ms between retries (increases with each retry)
 * @returns The result of the operation
 */
export const executeWithRetry = async <T = any>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
};

/**
 * Check the current authentication status
 * @returns The current session or null if not authenticated
 */
export const checkAuthStatus = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Auth status check error:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Auth status check failed:', error);
    return null;
  }
};

/**
 * Refresh the current authentication session
 * @returns The refreshed session or null if failed
 */
export const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh error:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
};

/**
 * Test the Supabase connection by making a simple query
 * @returns True if connection successful, false otherwise
 */
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .single();

    if (error) {
      console.error('Supabase connection test error:', error);
      return false;
    }

    console.log('Supabase connection successful:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return false;
  }
};

/**
 * Helper functions for stock operations
 */
export const stockOperations = {
  /**
   * Get pending stock out requests
   */
  getPendingStockOutRequests: async () => {
    return executeQuery('stock_out', async (supabase) => {
      return await supabase
        .from('stock_out')
        .select(`
          *,
          stock_out_details(*, product:products(*))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    });
  },
  
  /**
   * Process a stock out request
   */
  processStockOut: async (stockOutId: string, userId: string, status: 'approved' | 'rejected') => {
    const updateData = status === 'approved' 
      ? {
          status,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        }
      : {
          status,
          rejected_by: userId,
          rejected_at: new Date().toISOString(),
        };
        
    return executeQuery('stock_out', async (supabase) => {
      return await supabase
        .from('stock_out')
        .update(updateData)
        .eq('id', stockOutId)
        .select();
    });
  },
  
  /**
   * Check inventory for a product
   */
  checkInventory: async (productId: string) => {
    return executeQuery('inventory', async (supabase) => {
      return await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', productId)
        .eq('status', 'in_stock');
    });
  }
};

// Initialize connection test when the module is imported
testSupabaseConnection();
