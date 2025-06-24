
import { useState, useCallback } from 'react';
import { ScanResponse } from '@/types/auth';
import { BarcodeProcessorOptions } from './types';
import { barcodeInventoryLookup } from '@/services/barcodeInventoryLookup';
import { inventoryMovementLogger } from '@/services/inventoryMovementLogger';
import { serverlessBarcodeService } from '@/services/serverlessBarcodeService';

export function useBarcodeProcessor({
  user,
  toast,
  onScanComplete,
  onBarcodeScanned
}: BarcodeProcessorOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanData, setScanData] = useState<ScanResponse['data'] | null>(null);

  const processScan = useCallback(async (scannedBarcode: string) => {
    if (!scannedBarcode || scannedBarcode.length < 8) {
      setError('Invalid barcode format');
      return;
    }
    
    // If an external handler is provided, call it and optionally stop processing
    if (onBarcodeScanned) {
      await onBarcodeScanned(scannedBarcode);
      return; // Let the parent component handle the barcode
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First try to find the inventory item directly by querying the inventory table
      const item = await barcodeInventoryLookup.findInventoryByBarcode(scannedBarcode);
      
      // If we found the item directly, process it
      if (item) {
        // Log the scan for tracking purposes
        await inventoryMovementLogger.logScanMovement(item, user?.id, scannedBarcode);
        
        // Format response for the UI
        const formattedResponse = barcodeInventoryLookup.formatInventoryToScanResponse(item, scannedBarcode);
        
        setScanData(formattedResponse.data);
        if (onScanComplete) {
          onScanComplete(formattedResponse.data);
        }
        
        toast({
          title: 'Item Found',
          description: `Found ${item.products?.name} in ${item.warehouses?.name}`,
        });
      } else {
        // If no direct match, try the serverless function for more complex lookup logic
        const response = await serverlessBarcodeService.processBarcode(scannedBarcode, user?.id, user?.role);
        
        if (response.status === 'error' || !response.data) {
          setError(response.error || 'Failed to retrieve product information');
          toast({
            variant: 'destructive',
            title: 'Scan Failed',
            description: response.error || 'Failed to retrieve product information',
          });
        } else {
          setScanData(response.data);
          if (onScanComplete) {
            onScanComplete(response.data);
          }
          toast({
            title: 'Barcode Scanned',
            description: `Found ${response.data.product.name}`,
          });
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast({
        variant: 'destructive',
        title: 'Scan Error',
        description: err instanceof Error ? err.message : 'Failed to process barcode scan',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, onScanComplete, onBarcodeScanned]);

  return {
    processScan,
    loading,
    error,
    setError,
    scanData,
    setScanData
  };
}
