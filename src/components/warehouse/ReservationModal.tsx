import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';

export type BatchItemWithAvailable = {
  id: string;
  barcode: string;
  color: string | null;
  size: string | null;
  quantity: number;
  available_quantity: number;
  warehouse_name: string;
  location_name: string | null;
  floor: number | null;
  zone: string | null;
  selected?: boolean;
  reserve_quantity?: number;
};

export type ProductToReserve = {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  required_quantity?: number;
};

type ReservationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product: ProductToReserve | null;
  orderId?: string;
  onReservationComplete?: () => void;
};

export const ReservationModal = ({
  isOpen,
  onClose,
  product,
  orderId,
  onReservationComplete
}: ReservationModalProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchItemWithAvailable[]>([]);
  const [totalReserved, setTotalReserved] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch batch items for the product
  useEffect(() => {
    if (isOpen && product) {
      console.log('ReservationModal opened with product:', product);
      fetchBatchItems();
    } else {
      setBatchItems([]);
      setTotalReserved(0);
      setNotes('');
      setError(null);
    }
  }, [isOpen, product]);

  const fetchBatchItems = async () => {
    if (!product) {
      console.error('Cannot fetch batch items: product is null');
      return;
    }
    
    console.log('Fetching batch items for product ID:', product.id);
    setIsLoading(true);
    try {
      // Get batch items with available quantities (considering existing reservations)
      const { data, error } = await supabase
        .rpc('get_available_batch_items_for_product', {
          product_id_param: product.id
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }

      if (!data || !Array.isArray(data)) {
        console.error('Invalid batch items data received:', data);
        throw new Error('Invalid data format received from server');
      }

      console.log('Batch items fetched successfully:', data.length, 'items');
      
      // Transform data to include selected and reserve_quantity fields
      const transformedData = data.map((item: any) => ({
        ...item,
        selected: false,
        reserve_quantity: 0
      }));

      setBatchItems(transformedData);
    } catch (err: any) {
      console.error('Error fetching batch items:', err);
      setError('Failed to load batch items. Please try again.');
      toast.error('Failed to load batch items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchItemSelection = (id: string, selected: boolean) => {
    setBatchItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { 
              ...item, 
              selected, 
              reserve_quantity: selected ? 1 : 0 
            } 
          : item
      )
    );
    updateTotalReserved();
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    if (isNaN(quantity) || quantity < 0) return;
    
    setBatchItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          // Ensure quantity doesn't exceed available
          const validQuantity = Math.min(quantity, item.available_quantity);
          return { 
            ...item, 
            reserve_quantity: validQuantity,
            selected: validQuantity > 0
          };
        }
        return item;
      })
    );
    updateTotalReserved();
  };

  const updateTotalReserved = () => {
    setTimeout(() => {
      const total = batchItems.reduce((sum, item) => 
        sum + (item.reserve_quantity || 0), 0);
      setTotalReserved(total);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!product) return;
    
    // Validate that at least one batch is selected
    const selectedBatches = batchItems.filter(item => item.selected && (item.reserve_quantity || 0) > 0);
    if (selectedBatches.length === 0) {
      setError('Please select at least one batch to reserve');
      return;
    }

    // Validate total quantity
    if (totalReserved <= 0) {
      setError('Total reserved quantity must be greater than zero');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate a UUID for the reservation
      const reservationId = uuidv4();
      
      // Insert into custom_reservations table
      const { error: reservationError } = await supabase
        .from('custom_reservations')
        .insert({
          id: reservationId,
          product_id: product.id,
          order_id: orderId || null,
          total_quantity: totalReserved,
          notes: notes,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'active'
        });

      if (reservationError) throw reservationError;

      // Create reservation boxes for each selected batch
      const reservationBoxes = selectedBatches.map(batch => ({
        reservation_id: reservationId,
        batch_item_id: batch.id,
        quantity: batch.reserve_quantity || 0
      }));

      const { error: boxesError } = await supabase
        .from('custom_reservation_boxes')
        .insert(reservationBoxes);

      if (boxesError) throw boxesError;

      toast.success('Stock reserved successfully');
      onReservationComplete?.();
      onClose();
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
      toast.error('Failed to create reservation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Reserve Stock</DialogTitle>
        </DialogHeader>
        
        {!product ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-center text-destructive">Product information is missing. Please try again.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <div className="font-medium">{product.name}</div>
              </div>
              <div>
                <Label>SKU</Label>
                <div className="font-medium">{product.sku}</div>
              </div>
              <div>
                <Label>Category</Label>
                <div className="font-medium">{product.category || 'N/A'}</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <Label>Total Quantity</Label>
                  <div className="font-medium">{product.total_quantity}</div>
                </div>
                <div>
                  <Label>Reserved</Label>
                  <div className="font-medium">{product.reserved_quantity}</div>
                </div>
                <div>
                  <Label>Available</Label>
                  <div className="font-medium">{product.available_quantity}</div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input 
                id="notes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Add notes about this reservation"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label>Select Batches to Reserve</Label>
                <Badge variant="outline">
                  Total Reserved: {totalReserved}
                </Badge>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive py-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              ) : batchItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No batch items available for this product
                </div>
              ) : (
                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-4">
                    {batchItems.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 pb-4 border-b last:border-0">
                        <div className="flex items-start gap-2">
                          <Checkbox 
                            id={`select-${item.id}`}
                            checked={item.selected}
                            onCheckedChange={(checked) => 
                              handleBatchItemSelection(item.id, checked === true)
                            }
                            disabled={item.available_quantity <= 0}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`select-${item.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {item.barcode || 'No Barcode'}
                            </Label>
                            <div className="text-sm text-muted-foreground">
                              {item.warehouse_name} {item.location_name ? `• ${item.location_name}` : ''}
                              {item.floor !== null && item.zone ? ` (Floor ${item.floor}, Zone ${item.zone})` : ''}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.color && (
                                <Badge variant="outline" className="text-xs">
                                  Color: {item.color}
                                </Badge>
                              )}
                              {item.size && (
                                <Badge variant="outline" className="text-xs">
                                  Size: {item.size}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Available: {item.available_quantity}
                              </Badge>
                            </div>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min={0}
                              max={item.available_quantity}
                              value={item.reserve_quantity || 0}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                              disabled={!item.selected || item.available_quantity <= 0}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || totalReserved <= 0}
            className="w-full sm:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reserve Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationModal;
