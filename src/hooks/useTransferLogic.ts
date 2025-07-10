
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

interface ScannedItem {
  barcode: string;
  inventory_id: string;
  product_name: string;
  product_id: string;
  warehouse_name: string;
  warehouse_id: string;
  location_name: string;
  location_id: string;
  quantity: number;
}

export const useTransferLogic = () => {
  const { user } = useAuth();
  
  const [currentScannedBarcode, setCurrentScannedBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [reason, setReason] = useState('');

  const handleBarcodeScanned = async (barcode: string) => {
    setCurrentScannedBarcode(barcode);
    
    // Check if barcode already scanned
    if (scannedItems.some(item => item.barcode === barcode)) {
      toast.error('Duplicate barcode', {
        description: 'This item has already been scanned.'
      });
      return;
    }
    
    try {
      // Query inventory details directly using a simple query
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          barcode,
          quantity,
          status,
          warehouse_id,
          location_id,
          product_id,
          color,
          size,
          products!inner(id, name, sku, category),
          warehouses!inner(id, name),
          warehouse_locations!inner(id, floor, zone)
        `)
        .eq('barcode', barcode)
        .eq('status', 'available')
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        toast.error('Invalid barcode', {
          description: 'No inventory found with this barcode.'
        });
        return;
      }
      
      const product = data.products as any;
      const warehouse = data.warehouses as any;
      const location = data.warehouse_locations as any;
      
      // Add to scanned items
      setScannedItems(prev => [...prev, {
        barcode: data.barcode || '',
        inventory_id: data.id,
        product_name: product.name,
        product_id: data.product_id,
        warehouse_name: warehouse.name,
        warehouse_id: data.warehouse_id,
        location_name: `Floor ${location.floor}, Zone ${location.zone}`,
        location_id: data.location_id || '',
        quantity: data.quantity
      }]);
      
      setCurrentScannedBarcode('');
      
      toast.success('Item scanned', {
        description: `Added ${product.name} to transfer list.`
      });
    } catch (error) {
      console.error('Error fetching barcode details:', error);
      toast.error('Error scanning barcode', {
        description: error instanceof Error ? error.message : 'Failed to process barcode'
      });
    }
  };
  
  const removeScannedItem = (index: number) => {
    const updatedItems = [...scannedItems];
    updatedItems.splice(index, 1);
    setScannedItems(updatedItems);
  };
  
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetWarehouseId || !targetLocationId || scannedItems.length === 0) {
        throw new Error('Missing required fields');
      }
      
      // Generate a unique transfer reference ID to link related movements
      const transferReferenceId = uuidv4();
      
      // Create inventory movements for each scanned item
      const promises = scannedItems.map(async (item) => {
        // Create movement record
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_id: item.inventory_id,
            movement_type: 'transfer',
            quantity: item.quantity,
            performed_by: user.id,
            transfer_reference_id: transferReferenceId,
            notes: reason || 'Field transfer'
          });
        
        // Update the inventory record
        await supabase
          .from('inventory')
          .update({
            warehouse_id: targetWarehouseId,
            location_id: targetLocationId,
          })
          .eq('id', item.inventory_id);
      });
      
      await Promise.all(promises);
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Transfer submitted', {
        description: `Successfully transferred ${scannedItems.length} items.`
      });
      setScannedItems([]);
      setTargetWarehouseId('');
      setTargetLocationId('');
      setReason('');
    },
    onError: (error) => {
      toast.error('Transfer failed', {
        description: error instanceof Error ? error.message : 'Failed to process transfer'
      });
    },
  });

  const isSubmitDisabled = () => {
    return scannedItems.length === 0 || !targetWarehouseId || !targetLocationId || transferMutation.isPending;
  };

  return {
    currentScannedBarcode,
    setCurrentScannedBarcode,
    scannedItems,
    targetWarehouseId,
    setTargetWarehouseId,
    targetLocationId,
    setTargetLocationId,
    reason,
    setReason,
    handleBarcodeScanned,
    removeScannedItem,
    transferMutation,
    isSubmitDisabled
  };
};
