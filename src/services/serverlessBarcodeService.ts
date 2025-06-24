
import { supabase } from '@/integrations/supabase/client';
import { ScanResponse } from '@/types/auth';

export const serverlessBarcodeService = {
  async processBarcode(scannedBarcode: string, userId: string | undefined, userRole: string | undefined): Promise<ScanResponse> {
    const { data, error } = await supabase.functions.invoke('scan-barcode', {
      body: {
        barcode: scannedBarcode,
        user_id: userId,
        role: userRole
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as ScanResponse;
  }
};
