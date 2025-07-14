import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Import Database types from Supabase client
import type { Database } from '@/integrations/supabase/types';

// Use the imported types
type Tables = Database['public']['Tables'];


// Supabase client is imported from @/integrations/supabase/client

// Database table types matching actual schema
interface InventoryRecord {
  id: string;
  product_id: string;
  warehouse_id: string;
  location_id?: string;
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  quantity: number;
  barcode?: string;
  status?: string;
  color?: string;
  size?: string;
  batch_id?: string;
  stock_in_id?: string;
  stock_in_detail_id?: string;
  sno?: number;
}

interface CustomReservation {
  id: string;
  order_id: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  reservation_details: any; // JSONB field
  expiration_date?: string;
}

// Component types - export so they can be imported by other components
export interface ProductToReserve {
  id: string;
  name: string;
  sku: string;
  required_quantity?: number;
  total_quantity?: number;
  reserved_quantity?: number;
  available_quantity?: number;
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [productStates, setProductStates] = useState<Record<string, ProductReservationState>>({});
  const [availableBatchItems, setAvailableBatchItems] = useState<Record<string, BatchItem[]>>({});
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Initialize with empty date as requested
      setExpirationDate(undefined);
    } else {
      // Reset state when modal closes
      setExpirationDate(undefined);
    }
  }, [isOpen]);

  // Initialize product states and fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Always fetch order number if we have an orderId
      if (orderId) {
        fetchOrderNumber(orderId);
      }
      
      // Only initialize states and fetch batch items if we have products
      if (products && products.length > 0) {
        console.log(`Initializing product states for ${products.length} products`);
        console.log('Products:', products);
        
        // Initialize product states
        const initialStates: Record<string, ProductReservationState> = {};
        products.forEach(product => {
          if (product.id) {
            initialStates[product.id] = {
              product,
              selectedBoxes: [{ box_id: '', reserved_quantity: 0, box_data: {} as BatchItem }],
              note: '',
              totalReserved: 0,
              isExpanded: true // Start expanded by default
            };
          } else {
            console.warn('Product without ID found:', product);
          }
        });
        
        setProductStates(initialStates);
        fetchBatchItemsForProducts(products);
      } else if (products.length === 0) {
        console.warn('Modal opened with no products');
        setIsLoading(false);
      }
    }
  }, [isOpen, products, orderId]);

  // Fetch order number
  const fetchOrderNumber = async (orderId: string): Promise<void> => {
    try {
      if (!orderId) {
        console.warn('Invalid order ID provided');
        return;
      }

      const { data, error } = await supabase
        .from('customer_inquiries')
        .select('id, reference_number')
        .eq('id', orderId)
        .single();

      if (error) {
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // This is the "not found" error code from PostgREST
          console.warn(`Order with ID ${orderId} not found`);
          setOrderNumber('Unknown');
        } else {
          throw error;
        }
        return;
      }

      // At this point, data should exist since there was no error
      // But we'll still check as a safeguard
      if (data && 'reference_number' in data) {
        setOrderNumber(data.reference_number as string);
      } else {
        // This should rarely happen - only if the database schema changed
        console.warn('Order found but reference_number field is missing');
        setOrderNumber('Unknown');
      }
    } catch (error) {
      console.error('Error fetching order number:', error);
      toast.error('Failed to fetch order details');
    }
  };

  // Fetch batch items for products
  const fetchBatchItemsForProducts = async (products: ProductToReserve[]): Promise<void> => {
    setIsLoading(true);
    const batchItemsMap: Record<string, BatchItem[]> = {};

    // Initialize the map with empty arrays for all products
    // This ensures all products appear in the modal, even if they have no inventory
    products.forEach(product => {
      if (product.id) {
        batchItemsMap[product.id] = [];
      }
    });

    try {
      for (const product of products) {
        // Type assertion to help TypeScript understand the structure
        type InventoryWithWarehouse = {
          id: string;
          barcode?: string;
          warehouse?: { name: string };
          quantity?: number;
          reserved_quantity?: number;
          color?: string;
          size?: string;
        };

        // Skip invalid product IDs
        if (!product.id) {
          console.warn('Invalid product ID encountered');
          batchItemsMap[product.id] = [];
          continue;
        }

        console.log(`Fetching inventory for product ${product.id} (${product.name || 'Unknown'})`);

        const { data, error } = await supabase
          .from('inventory')
          .select(`
            id, 
            barcode, 
            product_id,
            warehouse:warehouses(name), 
            quantity, 
            reserved_quantity,
            color, 
            size
          `)
          .eq('product_id', product.id);

        if (error) {
          console.error(`Error fetching inventory for product ${product.id}:`, error);
          toast.error(`Error fetching inventory`, {
            description: `Could not load inventory for ${product.name}`
          });
          batchItemsMap[product.id] = [];
          continue;
        }

        // Process inventory data
        if (data && Array.isArray(data)) {
          console.log(`Found ${data.length} inventory items for product ${product.id}`);

          // Filter out any null or invalid items
          const validData = data.filter((item): item is NonNullable<typeof item> & { id: string } => {
            if (!item || typeof item !== 'object' || !('id' in item)) {
              console.warn('Invalid inventory item found:', item ? JSON.stringify(item) : 'null');
              return false;
            }
            return true;
          });

          if (validData.length === 0) {
            console.log(`No valid inventory data found for product ${product.id}`);
            toast.warning(`Out of stock`, {
              description: `No inventory items found for ${product.name}`
            });
          } else {
            console.log(`Found ${validData.length} valid inventory items for product ${product.id}`);

            const typedData = validData as InventoryWithWarehouse[];
            const mappedItems = typedData.map(item => ({
              id: item.id,
              barcode: item.barcode || '',
              warehouse_name: item.warehouse?.name || 'Unknown',
              available_quantity: Math.max(0, (item.quantity || 0) - (item.reserved_quantity || 0)),
              quantity: item.quantity || 0,
              color: item.color || '',
              size: item.size || ''
            }));

            // Include all items, not just those with quantity > 0
            batchItemsMap[product.id] = mappedItems;

            // Log items with available quantity
            const availableItems = mappedItems.filter(item => item.available_quantity > 0);
            console.log(`Found ${availableItems.length} items with available quantity for product ${product.id}`);
          }
        } else {
          console.log(`No inventory data found for product ${product.id}`);
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
  const handleSubmit = async (): Promise<void> => {
    if (!isFormValid()) {
      toast.error('Please select at least one box with a quantity to reserve');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting reservation submission process...');
      console.log('Product states:', productStates);
      console.log('Available batch items:', availableBatchItems);

      // Create the reservation details in JSONB format
      const reservationDetails = Object.entries(productStates)
        .filter(([productId, state]) =>
          state.selectedBoxes.some(box => box.box_id && box.reserved_quantity > 0)
        )
        .map(([productId, state]) => {
          const product = products.find(p => p.id === productId);
          if (!product) {
            console.warn(`Product with ID ${productId} not found in products list`);
            return null;
          }

          const productBoxes = state.selectedBoxes
            .filter(box => box.box_id && box.reserved_quantity > 0)
            .map(box => {
              const batchItem = availableBatchItems[productId]?.find(item => item.id === box.box_id);
              if (!batchItem) {
                console.warn(`Batch item ${box.box_id} not found for product ${productId}`);
              }

              return {
                box_id: box.box_id,
                reserved_quantity: box.reserved_quantity,
                // Find the total quantity from batch items
                total_quantity: batchItem?.quantity || 0
              };
            });

          return {
            product_id: productId,
            required_quantity: product.required_quantity || 0,
            note: state.note,
            boxes: productBoxes
          };
        })
        .filter(Boolean) as any[];

      console.log('Reservation details:', reservationDetails);

      // Generate a UUID for the reservation
      const newReservationId = uuidv4();
      
      // Create the reservation in the database
      console.log('Creating reservation record in database...');
      const { data: reservationData, error: reservationError } = await supabase
        .from('custom_reservations')
        .insert({
          id: newReservationId,
          inquiry_id: orderId, // Updated from order_id to inquiry_id after schema change
          status: 'active',
          reservation_details: reservationDetails,
          expiration_date: expirationDate ? expirationDate.toISOString() : null
        } as any)
        .select('id')
        .single();

      if (reservationError) {
        console.error('Error creating reservation:', reservationError);
        throw new Error(`Failed to create reservation: ${reservationError.message}`);
      }

      console.log('Reservation created successfully:', reservationData);

      // Insert box records into the newly created custom_reservation_boxes table
      const boxRecords = reservationDetails.flatMap(product => product.boxes.map(box => ({
        id: uuidv4(),
        reservation_id: reservationData.id,
        box_id: box.box_id,
        reserved_quantity: box.reserved_quantity,
        total_quantity: box.total_quantity
      })));

      if (boxRecords.length > 0) {
        console.log(`Inserting ${boxRecords.length} box records...`);
        const { error: boxError } = await supabase
          .from('custom_reservation_boxes')
          .insert(boxRecords);

        if (boxError) {
          console.error('Error inserting box records:', boxError);
          throw new Error(`Failed to insert box records: ${boxError.message}`);
        }
        console.log('Box records inserted successfully');
      } else {
        console.warn('No box records to insert');
      }

      // Update inventory for all boxes
      let allInventoryUpdatesSuccessful = true;
      console.log(`Updating inventory for ${Object.keys(productStates).length} boxes...`);

      for (const [productId, state] of Object.entries(productStates)) {
        for (const box of state.selectedBoxes) {
          if (!box.box_id || box.reserved_quantity <= 0) continue;

          console.log(`Updating box ${box.box_id} to reserved quantity ${box.reserved_quantity}`);
          // Only update the reserved_quantity since available_quantity is a generated column
          // that's automatically calculated in the database
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              reserved_quantity: box.reserved_quantity
              // Don't update available_quantity as it's a generated column
            })
            .eq('id', box.box_id);

          if (updateError) {
            console.error(`Error updating inventory for box ${box.box_id}:`, updateError);
            allInventoryUpdatesSuccessful = false;
          } else {
            console.log(`Successfully updated box ${box.box_id}`);
          }
        }
      }

      // Log inventory updates
      // Always update customer inquiry is_reserved flag to true when reserving stock
      try {
        // Use the orderId directly instead of reference_number
        console.log(`Updating customer inquiry is_reserved flag for order ID ${orderId}...`);
        
        // Using a type assertion for the custom field that's not in the TypeScript definitions
        // This assumes the field exists in the actual database schema
        const { error: inquiryError } = await supabase
          .from('customer_inquiries')
          .update({ is_reserved: true } as unknown as Database['public']['Tables']['customer_inquiries']['Update'])
          .eq('id', orderId);
          
        if (inquiryError) {
          console.error('Error updating customer inquiry:', inquiryError);
        } else {
          console.log('Customer inquiry is_reserved flag updated successfully');
        }
      } catch (error) {
        console.error('Error updating customer inquiry:', error);
      }

      // Show success message
      if (allInventoryUpdatesSuccessful) {
        toast.success('Stock reserved successfully', {
          description: expirationDate
            ? `Reservation #${reservationData.id} created for order #${orderNumber} (expires on ${expirationDate.toLocaleDateString()})`
            : `Reservation #${reservationData.id} created for order #${orderNumber}`
        });
      } else {
        toast.warning('Stock reserved, but some inventory updates failed', {
          description: 'The reservation was created but some inventory quantities may be incorrect'
        });
      }

      // Close modal and refresh data
      onClose();
      if (onReservationComplete) {
        console.log('Calling onReservationComplete callback...');
        onReservationComplete();
      }
    } catch (error) {
      console.error('Error submitting reservation:', error);
      toast.error('Failed to reserve stock');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    // At least one product must have boxes selected with quantities
    // Expiration date is optional
    return Object.values(productStates).some(state => 
      state.selectedBoxes.length > 0 && 
      state.selectedBoxes.some(box => 
        box.box_id && box.reserved_quantity > 0
      )
    );
  };
  
  // Check if a specific product has valid selections
  const isProductValid = (productId: string): boolean => {
    const state = productStates[productId];
    if (!state) return false;
    
    return state.selectedBoxes.some(box => 
      box.box_id && box.reserved_quantity > 0
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
            ) : Object.keys(productStates).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Loading product data...
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
                            <h3 className="font-medium">
                              {product.name} ({product.sku})
                            </h3>
                            {product.required_quantity && (
                              <p className="text-sm font-medium mt-1">
                                Needed: {product.required_quantity}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getReservationStatus(product.id)}
                            <span className="text-sm text-muted-foreground">
                              {product.required_quantity ? 
                                `${getRemainingQuantity(product.id)} of ${product.required_quantity} remaining` : 
                                'No quantity specified'}
                            </span>
                            {isProductValid(product.id) && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 ml-2">
                                Ready to reserve
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-col gap-3">
                          {(availableBatchItems[product.id]?.length === 0) && (
                            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md mb-2">
                              <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                                <p className="text-sm text-yellow-700">
                                  Out of Stock.
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Selected Boxes</span>
                            {product.required_quantity && (
                              <span className="text-sm font-medium text-amber-600">
                                Remaining to reserve: {getRemainingQuantity(product.id)}
                              </span>
                            )}
                          </div>
                          
                          {state.selectedBoxes.length === 0 ? (
                            <div className="text-sm text-muted-foreground mb-2">
                              No boxes selected yet
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {/* Removed duplicate warning message */}
                              {state.selectedBoxes.map((box, index) => {
                                const batchItems = availableBatchItems[product.id] || [];
                                // Get IDs of already selected boxes (except current one)
                                const selectedBoxIds = new Set(
                                  state.selectedBoxes
                                    .filter((_, i) => i !== index)
                                    .map(b => b.box_id)
                                    .filter(Boolean)
                                );
                                const availableBoxes = batchItems.filter(
                                  item => !selectedBoxIds.has(item.id) || item.id === box.box_id
                                );
                                
                                return (
                                  <div key={index} className="flex flex-col gap-2 border border-gray-200 rounded-md p-3 mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium">Box #{index + 1}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveBox(product.id, index)}
                                        className="h-6 w-6"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm w-24">Select Box:</span>
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
                                                [{item.barcode}] - {item.warehouse_name} 
                                                {item.color && `- ${item.color}`}
                                                {item.size && `- ${item.size}`}
                                                ({item.available_quantity} available)
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm w-24">Reserve:</span>
                                      <div className="flex-1">
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
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => handleAddBox(product.id)}
                            disabled={availableBatchItems[product.id]?.length === 0}
                            title={availableBatchItems[product.id]?.length === 0 ? "No inventory available" : "Add another box"}
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
        
        <DialogFooter className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <div className="w-full sm:w-1/2">
            <DatePicker
              date={expirationDate}
              setDate={setExpirationDate}
              label="Reservation Expiration Date (Optional)"
              placeholder="Select giving day (optional)"
              className="w-full"
              disabled={isLoading}
            />
          </div>
          <div className="flex w-full gap-2 sm:w-1/2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !isFormValid()}
              className="w-full md:w-auto"
            >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reserving...
              </>
            ) : (
              'Submit Reservation'
            )}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
