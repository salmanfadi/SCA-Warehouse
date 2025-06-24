
import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useStockInBoxes, StockInData } from '@/hooks/useStockInBoxes';
import { DefaultValuesForm } from '@/components/warehouse/DefaultValuesForm';
import { BoxesTable } from '@/components/warehouse/BoxesTable';
import { processStockIn, StockInBox } from '@/utils/stockInProcessor';

interface ProcessStockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStockIn: StockInData | null;
  userId: string | undefined;
}

export const ProcessStockInDialog: React.FC<ProcessStockInDialogProps> = ({
  open,
  onOpenChange,
  selectedStockIn,
  userId,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const {
    boxesData,
    defaultValues,
    setDefaultValues,
    handleBoxUpdate,
    applyDefaultsToAll,
    isMissingRequiredData
  } = useStockInBoxes(selectedStockIn, open);

  // Fetch warehouses for the dropdown
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouse locations based on selected warehouse
  const { data: locations } = useQuery({
    queryKey: ['warehouse-locations', defaultValues.warehouse],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('*')
        .eq('warehouse_id', defaultValues.warehouse)
        .order('floor')
        .order('zone');
        
      if (error) throw error;
      return data;
    },
    enabled: !!defaultValues.warehouse,
  });

  // Process stock in mutation
  const processStockInMutation = useMutation({
    mutationFn: async (data: { stockInId: string; boxes: typeof boxesData }) => {
      if (!userId) throw new Error("User ID is required to process stock in");
      
      // Transform BoxData to StockInBox
      const transformedBoxes: StockInBox[] = data.boxes.map(box => ({
        barcode: box.barcode,
        quantity: box.quantity,
        color: box.color,
        size: box.size,
        warehouse: box.warehouse_id, // Use warehouse_id as warehouse
        location: box.location_id    // Use location_id as location
      }));
      
      return processStockIn(data.stockInId, transformedBoxes, userId);
    },
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['stock-in-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Stock In Processed',
        description: 'The stock in has been processed and added to inventory.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process stock in',
      });
    },
  });

  const handleProcessingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockIn) return;

    if (isMissingRequiredData()) {
      toast({
        variant: 'destructive',
        title: 'Incomplete data',
        description: 'Please fill in all required fields for each box.',
      });
      return;
    }

    processStockInMutation.mutate({
      stockInId: selectedStockIn.id,
      boxes: boxesData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isMobile ? "max-w-[95vw] h-[85vh] p-4" : "max-w-3xl"}>
        <DialogHeader>
          <DialogTitle>Process Stock In</DialogTitle>
        </DialogHeader>
        
        {selectedStockIn && (
          <form onSubmit={handleProcessingSubmit}>
            <ScrollArea className={isMobile ? "h-[calc(85vh-10rem)]" : "max-h-[70vh]"}>
              <div className="space-y-4 px-1">
                <div className="space-y-2">
                  <div className="font-medium">Product: {selectedStockIn.product?.name}</div>
                  <div className="text-sm text-gray-500">Total Boxes: {selectedStockIn.boxes}</div>
                  <div className="text-sm text-gray-500">
                    Submitted By: {selectedStockIn.submitter ? `${selectedStockIn.submitter.name} (${selectedStockIn.submitter.username})` : 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Source: {selectedStockIn.source}
                  </div>
                  {selectedStockIn.notes && (
                    <div className="text-sm text-gray-500">
                      Notes: {selectedStockIn.notes}
                    </div>
                  )}
                </div>
                
                <DefaultValuesForm 
                  defaultValues={defaultValues}
                  setDefaultValues={setDefaultValues}
                  applyDefaultsToAll={applyDefaultsToAll}
                  warehouses={warehouses}
                  locations={locations}
                />
                
                <BoxesTable 
                  boxesData={boxesData}
                  handleBoxUpdate={handleBoxUpdate}
                  warehouses={warehouses}
                  locations={locations}
                />
              </div>
            </ScrollArea>
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isMissingRequiredData() || processStockInMutation.isPending}
              >
                {processStockInMutation.isPending ? 'Processing...' : 'Accept & Process Stock In'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
