import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, AlertCircle } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Define custom types for Supabase tables
type Tables = {
  inventory: {
    Row: {
      id: string;
      product_id: string;
      barcode?: string;
      quantity: number;
      reserved_quantity: number;
      available_quantity: number;
      color?: string;
      size?: string;
      warehouse_id?: string;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  custom_reservations: {
    Row: {
      id: string;
      product_id: string;
      order_id?: string;
      total_quantity: number;
      notes?: string;
      created_by?: string;
      created_at?: string;
      status?: string;
      reservation_details?: any; // JSONB field
    };
  };
  sales_orders: {
    Row: {
      id: string;
      order_number: string;
      customer_id?: string;
      status?: string;
      created_at?: string;
      updated_at?: string;
    };
  };
  warehouses: {
    Row: {
      id: string;
      name: string;
    };
  };
};

// Initialize Supabase client
const supabase = createClientComponentClient<{ database: { public: Tables } }>();

// Database table types
interface InventoryRecord {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  total_quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  barcode?: string;
  status?: string;
  color?: string;
  size?: string;
  batch_id?: string;
}

interface CustomReservation {
  id: string;
  order_id: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  reservation_details?: any; // JSONB field
}

// Component types
interface ProductToReserve {
  id: string;
  name: string;
  sku: string;
  required_quantity?: number;
}

interface BatchItem {
  id: string;
  barcode: string;
  warehouse_name: string;
  available_quantity: number;
  quantity: number;
  color?: string;
  size?: string;
}

interface SelectedBox {
  box_id: string;
  reserved_quantity: number;
  box_data: BatchItem;
}

interface ProductReservationState {
  product: ProductToReserve;
  selectedBoxes: SelectedBox[];
  note: string;
  totalReserved: number;
  isExpanded: boolean;
}

interface BoxReservation {
  box_id: string;
  reserved_quantity: number;
  total_quantity: number;
}

interface ProductReservation {
  product_id: string;
  required_quantity: number;
  note: string;
  boxes: BoxReservation[];
}

type ReservationDetails = ProductReservation[];

interface UnifiedReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  products: ProductToReserve[];
  onReservationComplete?: () => void;
}

export const UnifiedReservationModal = ({
  isOpen,
  onClose,
  orderId,
  products,
  onReservationComplete
}: UnifiedReservationModalProps): JSX.Element => {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [productStates, setProductStates] = useState<Record<string, ProductReservationState>>({});
  const [availableBatchItems, setAvailableBatchItems] = useState<Record<string, BatchItem[]>>({});

  // Initialize product states and fetch data when modal opens
  useEffect(() => {
    if (isOpen && products.length > 0) {
      fetchOrderNumber(orderId);
      initializeProductStates(products);
      fetchBatchItemsForProducts(products);
    }
  }, [isOpen, products, orderId]);

  // Initialize product states
  const initializeProductStates = (products: ProductToReserve[]) => {
    const initialStates: Record<string, ProductReservationState> = {};

    products.forEach(product => {
      initialStates[product.id] = {
        product,
        selectedBoxes: [],
        note: '',
        totalReserved: 0,
        isExpanded: true
      };
    });

    setProductStates(initialStates);
  };

  // Fetch order number
  const fetchOrderNumber = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (data) setOrderNumber(data.order_number);
    } catch (error) {
      console.error('Error fetching order number:', error);
      toast.error('Failed to fetch order details');
    }
  };

  // Fetch batch items for products
  const fetchBatchItemsForProducts = async (products: ProductToReserve[]) => {
    setIsLoading(true);
    const batchItemsMap: Record<string, BatchItem[]> = {};

    try {
      for (const product of products) {
        const { data, error } = await supabase
          .from('inventory')
          .select(`
            id, 
            barcode, 
            warehouse:warehouses(name), 
            quantity, 
            reserved_quantity,
            color, 
            size
          `)
          .eq('product_id', product.id)
          .gt('quantity', 0);

        if (error) throw error;

        if (data && Array.isArray(data)) {
          batchItemsMap[product.id] = data.map(item => ({
            id: item.id,
            barcode: item.barcode || '',
            warehouse_name: item.warehouse?.name || 'Unknown',
            available_quantity: Math.max(0, (item.quantity || 0) - (item.reserved_quantity || 0)),
            quantity: item.quantity || 0,
            color: item.color,
            size: item.size
          }));
        }
      }

      setAvailableBatchItems(batchItemsMap);
    } catch (error) {
      console.error('Error fetching batch items:', error);
      toast.error('Failed to fetch available inventory');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new box selection for a product
  const handleAddBox = (productId: string): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      const batchItems = availableBatchItems[productId] || [];
      const selectedBoxIds = new Set(productState.selectedBoxes.map(box => box.box_id));
      const availableBoxes = batchItems.filter(item => !selectedBoxIds.has(item.id));

      if (availableBoxes.length === 0) {
        toast.error('No more boxes available for this product');
        return prev;
      }

      return {
        ...prev,
        [productId]: {
          ...productState,
          selectedBoxes: [
            ...productState.selectedBoxes,
            {
              box_id: '',
              reserved_quantity: 0,
              box_data: {} as BatchItem
            }
          ]
        }
      };
    });
  };

  // Handle box selection change
  const handleBoxSelection = (productId: string, index: number, boxId: string): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      const batchItems = availableBatchItems[productId] || [];
      const selectedBoxData = batchItems.find(item => item.id === boxId) || {} as BatchItem;

      const updatedBoxes = [...productState.selectedBoxes];
      updatedBoxes[index] = {
        box_id: boxId,
        reserved_quantity: 0,
        box_data: selectedBoxData
      };

      return {
        ...prev,
        [productId]: {
          ...productState,
          selectedBoxes: updatedBoxes
        }
      };
    });
  };

  // Handle quantity change for a selected box
  const handleQuantityChange = (productId: string, index: number, quantity: number): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      const selectedBox = productState.selectedBoxes[index];
      if (!selectedBox) return prev;

      const availableQuantity = selectedBox.box_data.available_quantity || 0;
      const validQuantity = Math.max(0, Math.min(quantity, availableQuantity));

      if (validQuantity !== quantity) {
        toast.error(`Cannot reserve more than available quantity (${availableQuantity})`);
      }

      const updatedBoxes = [...productState.selectedBoxes];
      updatedBoxes[index] = {
        ...selectedBox,
        reserved_quantity: validQuantity
      };

      const totalReserved = updatedBoxes.reduce(
        (sum, box) => sum + (box.reserved_quantity || 0),
        0
      );

      return {
        ...prev,
        [productId]: {
          ...productState,
          selectedBoxes: updatedBoxes,
          totalReserved
        }
      };
    });
  };

  // Remove a box selection
  const handleRemoveBox = (productId: string, index: number): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      const updatedBoxes = productState.selectedBoxes.filter((_, i) => i !== index);

      const totalReserved = updatedBoxes.reduce(
        (sum, box) => sum + (box.reserved_quantity || 0),
        0
      );

      return {
        ...prev,
        [productId]: {
          ...productState,
          selectedBoxes: updatedBoxes,
          totalReserved
        }
      };
    });
  };

  // Handle note change for a product
  const handleNoteChange = (productId: string, note: string): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      return {
        ...prev,
        [productId]: {
          ...productState,
          note
        }
      };
    });
  };

  // Toggle accordion expansion
  const toggleExpand = (productId: string): void => {
    setProductStates(prev => {
      const productState = prev[productId];
      if (!productState) return prev;

      return {
        ...prev,
        [productId]: {
          ...productState,
          isExpanded: !productState.isExpanded
        }
      };
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error('Please select at least one box with a quantity');
      return;
    }

    setIsLoading(true);

    try {
      const reservationDetails: ReservationDetails = [];

      Object.values(productStates).forEach(state => {
        if (state.selectedBoxes.length === 0) return;

        const productReservation: ProductReservation = {
          product_id: state.product.id,
          required_quantity: state.product.required_quantity || 0,
          note: state.note,
          boxes: state.selectedBoxes
            .filter(box => box.box_id && box.reserved_quantity > 0)
            .map(box => ({
              box_id: box.box_id,
              reserved_quantity: box.reserved_quantity,
              total_quantity: box.box_data.quantity || 0
            }))
        };

        if (productReservation.boxes.length > 0) {
          reservationDetails.push(productReservation);
        }
      });

      const { data: reservationData, error: reservationError } = await supabase
        .from('custom_reservations')
        .insert({
          id: uuidv4(),
          order_id: orderId,
          status: 'active',
          reservation_details: reservationDetails as any,
          product_id: reservationDetails[0]?.product_id || '',
          total_quantity: reservationDetails.reduce((sum, pr) =>
            sum + pr.boxes.reduce((boxSum, box) => boxSum + box.reserved_quantity, 0), 0)
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // Define a type for box updates
      interface BoxUpdate {
        box_id: string;
        newReserved: number;
      }

      // Define a type for tracking inventory updates
      interface InventoryUpdateResult {
        box_id: string;
        success: boolean;
        previous?: number;
        new?: number;
        error?: string;
      }

      const boxUpdates: BoxUpdate[] = [];
      const inventoryUpdates: InventoryUpdateResult[] = [];

      // Prepare box updates
      for (const productReservation of reservationDetails) {
        for (const box of productReservation.boxes) {
          const { data: inventoryData, error: fetchError } = await supabase
            .from('inventory')
            .select('reserved_quantity, quantity')
            .eq('id', box.box_id)
            .single();

          const currentData = {
            reserved_quantity: 0,
            quantity: 0,
            ...inventoryData
          };

          if (fetchError) {
            console.error(`Error fetching inventory for box ${box.box_id}:`, fetchError);
            continue;
          }

          const currentReserved = currentData.reserved_quantity;
          const newReserved = currentReserved + box.reserved_quantity;

          boxUpdates.push({ box_id: box.box_id, newReserved });
        }
      }

      // Update inventory records
      for (const update of boxUpdates) {
        try {
          // Get current inventory data again to ensure we have the latest
          const { data: currentInventory, error: fetchError } = await supabase
            .from('inventory')
            .select('reserved_quantity, quantity')
            .eq('id', update.box_id)
            .single();
            
          if (fetchError) {
            console.error(`Error fetching inventory for box ${update.box_id}:`, fetchError);
            inventoryUpdates.push({
              box_id: update.box_id,
              success: false,
              error: fetchError.message
            });
            continue;
          }
          
          const currentData = {
            reserved_quantity: 0,
            quantity: 0,
            ...currentInventory
          };
          
          const currentReserved = currentData.reserved_quantity;
          
          // Update inventory record
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ 
              reserved_quantity: update.newReserved,
              available_quantity: Math.max(0, currentData.quantity - update.newReserved)
            })
            .eq('id', update.box_id);
          
          if (updateError) {
            console.error(`Error updating inventory for box ${update.box_id}:`, updateError);
            inventoryUpdates.push({
              box_id: update.box_id,
              success: false,
              error: updateError.message
            });
          } else {
            inventoryUpdates.push({
              box_id: update.box_id,
              success: true,
              previous: currentReserved,
              new: update.newReserved
            });
          }
        } catch (error) {
          console.error(`Error processing update for box ${update.box_id}:`, error);
          inventoryUpdates.push({
            box_id: update.box_id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      // Log inventory updates
      console.log('Inventory updates:', inventoryUpdates);
      
      // Show success message
      toast.success('Stock reserved successfully');
      
      // Close modal and notify parent
      onClose();
      if (onReservationComplete) onReservationComplete();
      
    } catch (error) {
      console.error('Error submitting reservation:', error);
      toast.error('Failed to reserve stock');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    // At least one product must have boxes selected with quantities
    return Object.values(productStates).some(state => 
      state.selectedBoxes.length > 0 && 
      state.selectedBoxes.some(box => 
        box.box_id && box.reserved_quantity > 0
      )
    );
  };
  
  // Calculate remaining quantity to reserve for a product
  const getRemainingQuantity = (productId: string): number => {
    const state = productStates[productId];
    if (!state || !state.product.required_quantity) return 0;
    
    const required = state.product.required_quantity;
    const reserved = state.totalReserved;
    
    return Math.max(0, required - reserved);
  };
  
  // Get reservation status badge for a product
  const getReservationStatus = (productId: string): JSX.Element | null => {
    const state = productStates[productId];
    if (!state || !state.product.required_quantity) return null;
    
    const required = state.product.required_quantity;
    const reserved = state.totalReserved;
    
    if (reserved === 0) return <Badge variant="destructive">Not Reserved</Badge>;
    if (reserved < required) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partially Reserved</Badge>;
    if (reserved === required) return <Badge variant="outline" className="bg-green-100 text-green-800">Fully Reserved</Badge>;
    return <Badge variant="destructive">Over Reserved</Badge>;
  };

  // Render component
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reserve Stock for Order #{orderNumber}</DialogTitle>
          <DialogDescription>
            Select boxes and quantities to reserve for this order.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading inventory data...</p>
          </div>
        )}
        
        {!isLoading && (
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No products available for reservation
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {products.map(product => {
                  const state = productStates[product.id];
                  if (!state) return null;
                  
                  return (
                    <AccordionItem key={product.id} value={product.id}>
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <div className="text-left">
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.sku}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.required_quantity && (
                              <span className="text-sm">
                                {state.totalReserved} / {product.required_quantity}
                              </span>
                            )}
                            {getReservationStatus(product.id)}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="mb-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Selected Boxes</span>
                            {product.required_quantity && (
                              <span className="text-sm text-muted-foreground">
                                Remaining: {getRemainingQuantity(product.id)}
                              </span>
                            )}
                          </div>
                          
                          {state.selectedBoxes.length === 0 ? (
                            <div className="text-sm text-muted-foreground mb-2">
                              No boxes selected yet
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {state.selectedBoxes.map((box, index) => {
                                const batchItems = availableBatchItems[product.id] || [];
                                // Filter out already selected boxes except the current one
                                const selectedBoxIds = new Set(
                                  state.selectedBoxes
                                    .filter((_, i) => i !== index)
                                    .map(b => b.box_id)
                                );
                                const availableBoxes = batchItems.filter(
                                  item => !selectedBoxIds.has(item.id) || item.id === box.box_id
                                );
                                
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <Select
                                        value={box.box_id}
                                        onValueChange={(value) => handleBoxSelection(product.id, index, value)}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select a box" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableBoxes.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                              {item.barcode} - {item.warehouse_name} 
                                              {item.color && `- ${item.color}`}
                                              {item.size && `- ${item.size}`}
                                              ({item.available_quantity} available)
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="w-24">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={box.box_data.available_quantity || 0}
                                        value={box.reserved_quantity || 0}
                                        onChange={(e) => handleQuantityChange(
                                          product.id,
                                          index,
                                          parseInt(e.target.value) || 0
                                        )}
                                        disabled={!box.box_id}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveBox(product.id, index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleAddBox(product.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Box
                          </Button>
                        </div>
                        
                        <div>
                          <Label htmlFor={`note-${product.id}`} className="text-sm font-medium">
                            Notes
                          </Label>
                          <Textarea
                            id={`note-${product.id}`}
                            className="mt-1"
                            placeholder="Add notes about this reservation"
                            value={state.note}
                            onChange={(e) => handleNoteChange(product.id, e.target.value)}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving...
              </>
            ) : (
              'Reserve Stock'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
