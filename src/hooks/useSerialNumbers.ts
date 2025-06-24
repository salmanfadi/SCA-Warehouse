
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SerialNumber {
  id: string;
  serial_number: string;
  operation_type: 'stock_in' | 'stock_out' | 'transfer';
  reference_id: string;
  reference_table: string;
  batch_id?: string;
  created_at: string;
  created_by: string;
}

export const useSerialNumbers = () => {
  const queryClient = useQueryClient();

  const generateSerialNumber = (type: 'stock_in' | 'stock_out' | 'transfer'): string => {
    const prefix = {
      stock_in: 'SI',
      stock_out: 'SO',
      transfer: 'TR'
    }[type];
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${timestamp}-${random}`;
  };

  const createSerialNumber = useMutation({
    mutationFn: async (data: {
      operation_type: 'stock_in' | 'stock_out' | 'transfer';
      reference_id: string;
      reference_table: string;
      batch_id?: string;
      user_id: string;
    }) => {
      const serialNumber = generateSerialNumber(data.operation_type);
      
      const { data: result, error } = await (supabase as any)
        .from('serial_numbers')
        .insert({
          serial_number: serialNumber,
          operation_type: data.operation_type,
          reference_id: data.reference_id,
          reference_table: data.reference_table,
          batch_id: data.batch_id,
          created_by: data.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serial-numbers'] });
    },
  });

  const { data: serialNumbers = [], isLoading } = useQuery({
    queryKey: ['serial-numbers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('serial_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SerialNumber[];
    },
  });

  return {
    serialNumbers,
    isLoading,
    createSerialNumber,
    generateSerialNumber,
  };
};
