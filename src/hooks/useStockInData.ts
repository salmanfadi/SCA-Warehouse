
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, executeQuery } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Product } from '@/types/database';

export interface StockInData {
  id: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  submitter: {
    id: string | null;
    name: string; // This is mapped from full_name in the database
    username: string;
  } | null;
  quantity: number; // Changed from boxes to quantity to match the database schema
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';
  created_at: string;
  source: string;
  notes?: string | null;
  rejection_reason?: string | null;
}

export const useStockInData = (stockInId: string | undefined) => {
  const [stockInData, setStockInData] = useState<StockInData | null>(null);
  const { toast } = useToast();

  const { isLoading, error } = useQuery({
    queryKey: ['stock-in', stockInId],
    queryFn: async () => {
      if (!stockInId) return null;
      
      console.log('Fetching stock in data for ID:', stockInId);
      
      try {
        // First, get the stock in record
        const { data, error } = await supabase
          .from('stock_in')
          .select('id, product_id, submitted_by, quantity, status, created_at, source, notes, rejection_reason')
          .eq('id', stockInId)
          .single();

        if (error) {
          console.error("Error fetching stock in:", error);
          throw error;
        }
        
        if (!data) {
          console.error("No stock in data found for ID:", stockInId);
          return null;
        }
        
        console.log('Stock in data retrieved:', data);
        
        // Fetch product information
        let product: StockInData['product'] = undefined;
        if (data.product_id) {
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id, name, category, sku')
            .eq('id', data.product_id)
            .single();
            
          if (!productError && productData) {
            // Ensure all fields are properly typed according to StockInData interface
            product = {
              id: typeof productData.id === 'string' ? productData.id : String(productData.id || ''),
              name: typeof productData.name === 'string' ? productData.name : '',
              sku: productData.sku ? String(productData.sku) : undefined,
              category: productData.category ? String(productData.category) : undefined
            };
            console.log('Product data retrieved:', product);
          } else {
            console.error("Error fetching product:", productError);
          }
        }
        
        // Fetch submitter information from profiles table using full_name field
        let submitter = null;
        if (data.submitted_by) {
          console.log("Fetching submitter with ID:", data.submitted_by);
          
          try {
            // Directly query the profiles table for the user's name and username
            const { data: submitterData, error: submitterError } = await supabase
              .from('profiles')
              .select('id, full_name, username')
              .eq('id', data.submitted_by)
              .maybeSingle();
              
            // Type guard to ensure submitterData is not null and has expected properties
            if (!submitterError && submitterData && typeof submitterData === 'object') {
              // Create a non-null version of submitterData for TypeScript
              const safeData = submitterData as Record<string, any>;
              
              submitter = {
                id: safeData.id || null,
                name: safeData.full_name || 'Unknown User',
                username: safeData.username || 'unknown'
              };
              console.log("Found submitter with name:", submitter.name);
            } else {
              console.warn("Submitter profile not found:", submitterError?.message || 'Unknown error');
              
              // Fallback option if profile not found
              submitter = { 
                id: data.submitted_by, 
                name: 'Unknown User',
                username: data.submitted_by.substring(0, 8) + '...'
              };
            }
          } catch (err) {
            console.error("Error while fetching submitter:", err);
            submitter = { 
              id: data.submitted_by, 
              name: 'Unknown User', 
              username: 'unknown'
            };
          }
        }
        
        // Construct the complete stockInData object
        const stockInDataObject: StockInData = {
          id: data.id,
          product,
          submitter: submitter,
          quantity: typeof data.quantity === 'string' ? parseInt(data.quantity, 10) : 
                   typeof data.quantity === 'number' ? data.quantity : 0,
          status: data.status as 'pending' | 'approved' | 'rejected' | 'completed' | 'processing',
          created_at: data.created_at,
          source: data.source || 'Unknown Source',
          notes: data.notes,
          rejection_reason: data.rejection_reason
        };
        
        console.log("Final stock in data:", stockInDataObject);
        setStockInData(stockInDataObject);
        return stockInDataObject;
      } catch (error) {
        console.error("Error in useStockInData:", error);
        toast({
          title: "Failed to load stock in data",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        throw error;
      }
    },
    enabled: !!stockInId,
  });

  if (error) {
    console.error("Error in useStockInData query:", error);
  }

  return {
    stockInData,
    isLoadingStockIn: isLoading,
    error
  };
};
