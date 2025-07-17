
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Box } from '@/types/stockout';
import { Warehouse } from '@/types/warehouse';

export interface ScannedItem {
  id: string;
  barcode: string;
  inventory_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  location_name: string;
  batch_id: string;
  warehouse_id: string;
  location_id: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
}

interface InventoryWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    sku: string | null;
  };
}

interface InventoryWithWarehouse {
  warehouse_id: string;
  warehouses: Warehouse;
}

interface BatchBoxResponse {
  id: string;
  barcode: string;
  batch_id: string;
  status: string;
  quantity: number;
  product_id: string;
  warehouse_id: string;
  location_id: string;
  products: {
    id: string;
    name: string;
    sku: string | null;
  };
  warehouses: {
    id: string;
    name: string;
  };
  warehouse_locations: {
    id: string;
    zone: string;
    floor: string;
  };
}

export const useTransferLogic = () => {
  const { user } = useAuth();
  
  const [currentScannedBarcode, setCurrentScannedBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [availableBoxes, setAvailableBoxes] = useState<Box[]>([]);

  // Fetch products with quantity > 0
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-with-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          product_id,
          quantity,
          products (
            id,
            name,
            sku
          )
        `)
        .gt('quantity', 0);

      if (error) throw error;

      // Group by product and sum quantities
      const productMap = new Map<string, Product>();
      (data as unknown as InventoryWithProduct[] || []).forEach(item => {
        if (!item.products) return;
        const product = item.products;
        const existingQuantity = productMap.get(product.id)?.quantity || 0;
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: existingQuantity + item.quantity
        });
      });

      return Array.from(productMap.values());
    }
  });

  // Fetch warehouses where selected product has stock
  const { data: availableWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses-with-product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return [];

      const { data, error } = await supabase
        .from('inventory')
        .select(`
          warehouse_id,
          warehouses (
            id,
            name,
            location,
            code,
            address,
            contact_person,
            contact_phone,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('product_id', selectedProductId)
        .gt('quantity', 0);

      if (error) throw error;

      return (data as unknown as InventoryWithWarehouse[] || [])
        .map(item => item.warehouses)
        .filter((warehouse): warehouse is Warehouse => !!warehouse);
    },
    enabled: !!selectedProductId
  });

  const handleBarcodeScanned = async (barcode: string) => {
    setCurrentScannedBarcode(barcode);
    
    try {
      // Query box details using the barcode
      const { data: boxData, error: boxError } = await supabase
        .from('batch_items')
        .select(`
          id,
          barcode,
          batch_id,
          status,
          quantity,
          product_id,
          warehouse_id,
          location_id,
          products (
            id,
            name,
            sku
          ),
          warehouses (
            id,
            name
          ),
          warehouse_locations (
            id,
            zone,
            floor
          )
        `)
        .eq('barcode', barcode)
        .eq('status', 'available')
        .single();
      
      if (boxError) throw boxError;
      
      if (!boxData) {
        toast.error('Invalid barcode', {
          description: 'No available box found with this barcode.'
        });
        return;
      }

      // Check if box already scanned
      if (scannedItems.some(item => item.barcode === barcode)) {
        toast.error('Duplicate barcode', {
          description: 'This box has already been scanned.'
        });
        return;
      }

      // Cast the response to our expected type
      const box = boxData as unknown as BatchBoxResponse;
      
      const product = box.products;
      const warehouse = box.warehouses;
      const location = box.warehouse_locations;

      if (!product || !warehouse || !location) {
        toast.error('Invalid box data', {
          description: 'Box is missing required product, warehouse, or location information.'
        });
        return;
      }

      // Set the selected product ID if not already set
      if (!selectedProductId) {
        setSelectedProductId(product.id);
      } else if (selectedProductId !== product.id) {
        toast.error('Product mismatch', {
          description: 'Please scan boxes of the same product.'
        });
        return;
      }

      const newItem: ScannedItem = {
        id: box.id,
        barcode: box.barcode,
        inventory_id: box.id,
        product_id: product.id,
        quantity: box.quantity,
        product_name: product.name,
        product_sku: product.sku || '',
        warehouse_name: warehouse.name,
        location_name: `${location.zone} - Floor ${location.floor}`,
        batch_id: box.batch_id,
        warehouse_id: warehouse.id,
        location_id: location.id
      };

      setScannedItems(prev => [...prev, newItem]);
      
    } catch (error) {
      console.error('Error scanning barcode:', error);
      toast.error('Scan failed', {
        description: 'Failed to process barcode scan.'
      });
    }
  };

  const removeScannedItem = (barcode: string) => {
    setScannedItems(prev => {
      const newItems = prev.filter(item => item.barcode !== barcode);
      // If no items left, reset selected product
      if (newItems.length === 0) {
        setSelectedProductId('');
      }
      return newItems;
    });
  };

  const handleBoxSelectionChange = (boxId: string, selected: boolean) => {
    setSelectedBoxes(prev => 
      selected 
        ? [...prev, boxId]
        : prev.filter(id => id !== boxId)
    );
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetWarehouseId || !targetLocationId || selectedBoxes.length === 0) {
        throw new Error('Missing required fields');
      }
      
      // Generate a unique transfer reference ID
      const transferReferenceId = uuidv4();
      
      // Create new batch for the transferred boxes
      const newBatchId = uuidv4();
      const firstBox = scannedItems[0];
      
      // Insert new batch record
      const { error: batchError } = await supabase
        .from('processed_batches')
        .insert({
          id: newBatchId,
          batch_number: `TRF-${transferReferenceId.slice(0, 8)}`,
          product_id: firstBox.product_id,
          warehouse_id: targetWarehouseId,
          location_id: targetLocationId,
          status: 'available',
          processed_by: user.id,
          total_boxes: selectedBoxes.length,
          total_quantity: scannedItems.reduce((sum, item) => sum + item.quantity, 0),
          source: 'transfer',
          notes: reason || 'Transfer batch'
        });
      
      if (batchError) throw batchError;

      // Create transfer record
      const { error: transferError } = await supabase
        .from('inventory_transfers')
        .insert({
          id: transferReferenceId,
          source_warehouse_id: firstBox.warehouse_id,
          destination_warehouse_id: targetWarehouseId,
          source_location_id: firstBox.location_id,
          destination_location_id: targetLocationId,
          status: 'completed',
          created_by: user.id,
          notes: reason,
          source_batch_id: firstBox.batch_id,
          new_batch_id: newBatchId
        });

      if (transferError) throw transferError;

      // Update boxes with new batch ID and location
      const updatePromises = selectedBoxes.map(boxId => 
        supabase
          .from('batch_items')
          .update({
            batch_id: newBatchId,
            warehouse_id: targetWarehouseId,
            location_id: targetLocationId,
            status: 'available'
          })
          .eq('id', boxId)
      );

      // Create transfer box records
      const transferBoxPromises = selectedBoxes.map(boxId =>
        supabase
          .from('inventory_transfer_boxes')
          .insert({
            transfer_id: transferReferenceId,
            box_id: boxId,
            source_batch_id: firstBox.batch_id,
            new_batch_id: newBatchId
          })
      );

      await Promise.all([...updatePromises, ...transferBoxPromises]);
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Transfer completed', {
        description: `Successfully transferred ${selectedBoxes.length} boxes to new batch.`
      });
      setScannedItems([]);
      setSelectedBoxes([]);
      setTargetWarehouseId('');
      setTargetLocationId('');
      setReason('');
      setSelectedProductId('');
    },
    onError: (error) => {
      console.error('Transfer failed:', error);
      toast.error('Transfer failed', {
        description: error instanceof Error ? error.message : 'Failed to process transfer'
      });
    },
  });

  const isSubmitDisabled = () => {
    return selectedBoxes.length === 0 || !targetWarehouseId || !targetLocationId || transferMutation.isPending;
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
    isSubmitDisabled,
    selectedBoxes,
    availableBoxes,
    handleBoxSelectionChange,
    products,
    availableWarehouses,
    selectedProductId,
    setSelectedProductId
  };
};
