import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ScanLine, ChevronDown, ChevronRight, Check, Clock, AlertCircle, Lock } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  StockOutRequest, 
  StockOutDetail, 
  Box, 
  ProcessedItem,
  ProductStatus, 
  ReservationBox, 
  PRODUCT_STATUS, 
  BATCH_STATUS 
} from '@/types/stockout';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface StockOutWithDetails {
  id: string;
  reference_number?: string;
  customer_inquiry_id?: string;
  notes?: string;
  status: string;
  customer_name?: string;
  created_at: string;
  stock_out_details?: StockOutDetail[];
  is_reserved?: boolean;
  reservation_id?: string;
}

interface ProcessStockOutFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockOut: StockOutWithDetails | null;
}

interface FormState {
  productStatuses: Record<string, ProductStatus>;
  expandedProducts: Record<string, boolean>;
}

interface BoxData extends Box {
  warehouse_id?: string;
  location_id?: string;
}

const ProcessStockOutForm: React.FC<ProcessStockOutFormProps> = ({ stockOut, open, onOpenChange }): JSX.Element => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingReservedBoxes, setIsLoadingReservedBoxes] = useState<boolean>(false);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [productStatuses, setProductStatuses] = useState<Record<string, ProductStatus>>({});
  const [stockOutState, setStockOutState] = useState<StockOutWithDetails | null>(null);

  useEffect(() => {
    if (stockOut) {
      console.log('🔄 [INIT] Initializing stockOutState from props:', {
        id: stockOut.id,
        customerInquiryId: stockOut.customer_inquiry_id,
        hasDetails: !!stockOut.stock_out_details?.length
      });
      
      // Ensure we have all required fields
      setStockOutState(stockOut);
    }
  }, [stockOut]);

  // Effect to check for reserved items when stockOutState is initialized
  useEffect(() => {
    const checkForReservedItems = async () => {
      console.log('🔒 [RESERVED] Starting reserved order check for stockOut:', stockOutState?.id);
      
      // Skip if we already know the reservation status
      if (stockOutState?.is_reserved !== undefined) {
        console.log(`🔒 [RESERVED] Reservation status already known: ${stockOutState.is_reserved}`);
        return;
      }

      try {
        // First, ensure we have a customer_inquiry_id
        let inquiryId = stockOutState?.customer_inquiry_id;
        
        if (!inquiryId) {
          console.log('🔒 [RESERVED] No customer_inquiry_id in state, trying to fetch it');
          
          // Try to get customer_inquiry_id from stock_out table
          const { data: stockOut, error: stockOutError } = await executeQuery('stock-out-inquiry-lookup', supabase => 
            supabase
              .from('stock_out')
              .select('customer_inquiry_id')
              .eq('id', stockOutState?.id)
              .single()
          );
          
          if (stockOutError) {
            console.error('❌ [RESERVED] Error fetching stock_out:', stockOutError);
            
            // Try fallback query to customer_inquiry_stock_out
            const { data: ciStockOut, error: ciStockOutError } = await executeQuery('customer-inquiry-stock-out-lookup', supabase => 
              supabase
                .from('customer_inquiry_stock_out')
                .select('customer_inquiry_id')
                .eq('stock_out_id', stockOutState?.id)
                .single()
            );
            
            if (ciStockOutError) {
              console.error('❌ [RESERVED] Error fetching customer_inquiry_stock_out:', ciStockOutError);
              
              // Final fallback to stock_out_items
              const { data: stockOutItems, error: stockOutItemsError } = await executeQuery('stock-out-items-lookup', supabase => 
                supabase
                  .from('stock_out_items')
                  .select('customer_inquiry_id')
                  .eq('stock_out_id', stockOutState?.id)
                  .limit(1)
                  .single()
              );
              
              if (stockOutItemsError) {
                console.error('❌ [RESERVED] Error fetching stock_out_items:', stockOutItemsError);
                setStockOutState(prev => prev ? { ...prev, is_reserved: false } : null);
                return;
              }
              
              inquiryId = stockOutItems?.customer_inquiry_id;
            } else {
              inquiryId = ciStockOut?.customer_inquiry_id;
            }
          } else {
            inquiryId = stockOut?.customer_inquiry_id;
          }
          
          // Update state with the customer_inquiry_id if found
          if (inquiryId) {
            console.log('🔒 [RESERVED] Found customer_inquiry_id:', inquiryId);
            setStockOutState(prev => prev ? { ...prev, customer_inquiry_id: inquiryId } : null);
          } else {
            console.warn('⚠️ [RESERVED] No customer_inquiry_id found in any table');
            setStockOutState(prev => prev ? { ...prev, is_reserved: false } : null);
            return;
          }
        }
        
        // Now check if this inquiry is reserved
        console.log('🔒 [RESERVED] Checking if inquiry is reserved:', inquiryId);
        const { data: customerInquiry, error: customerInquiryError } = await executeQuery('customer-inquiry-reserved-check', supabase => 
          supabase
            .from('customer_inquiries')
            .select('is_reserved')
            .eq('id', inquiryId)
            .single()
        );
        
        if (customerInquiryError) {
          console.error('❌ [RESERVED] Error checking if inquiry is reserved:', customerInquiryError);
          setStockOutState(prev => prev ? { ...prev, is_reserved: false } : null);
          return;
        }
        
        const isReserved = customerInquiry?.is_reserved === true;
        console.log('🔒 [RESERVED] Inquiry reservation status:', isReserved);
        
        // Update state with reservation status
        setStockOutState(prev => {
          if (!prev) return null;
          
          const updatedState = { ...prev, is_reserved: isReserved };
          
          // If this is a reserved order, fetch the reservation details
          if (isReserved) {
            console.log('🔒 [RESERVED] This is a reserved order, fetching reservation details');
            fetchReservationDetails(inquiryId);
          }
          
          return updatedState;
        });
      } catch (error) {
        console.error('❌ [RESERVED] Unexpected error in checkForReservedItems:', error);
        setStockOutState(prev => prev ? { ...prev, is_reserved: false } : null);
      }
    };
    
    // Only run this effect if we have a stockOutState with an ID
    if (stockOutState?.id) {
      checkForReservedItems();
    }
  }, [stockOutState?.id]); // Only depend on the ID to prevent re-runs
  
  // Separate function to fetch reservation details to avoid circular dependencies
  const fetchReservationDetails = async (inquiryId: string) => {
    try {
      console.log('🔒 [RESERVATION DETAILS] Fetching reservation details for inquiry:', inquiryId);
      
      // Get the reservation ID
      const { data: reservation, error: reservationError } = await executeQuery('reservation-lookup', supabase => 
        supabase
          .from('custom_reservations')
          .select('id')
          .eq('inquiry_id', inquiryId)
          .single()
      );
      
      if (reservationError) {
        console.error('❌ [RESERVATION DETAILS] Error fetching reservation:', reservationError);
        return;
      }
      
      if (!reservation) {
        console.warn('⚠️ [RESERVATION DETAILS] No reservation found for inquiry:', inquiryId);
        return;
      }
      
      const reservationId = reservation.id;
      console.log('🔒 [RESERVATION DETAILS] Found reservation ID:', reservationId);
      
      // Store the reservation ID in state
      setStockOutState(prev => prev ? { ...prev, reservation_id: reservationId } : null);
      
      // Fetch the reserved boxes
      await fetchReservedBoxes(inquiryId, reservationId);
    } catch (error) {
      console.error('❌ [RESERVATION DETAILS] Error in fetchReservationDetails:', error);
    }
  };

  // Fetch reserved boxes when a reserved order is loaded
  useEffect(() => {
    if (stockOutState?.is_reserved) {
      console.log('🔒 [RESERVED] Detected reserved order, fetching reserved boxes');
      fetchReservedBoxes(stockOutState.customer_inquiry_id);
    }
  }, [stockOutState?.id, stockOutState?.is_reserved]);

  /**
   * Processes a scanned barcode box data and updates the product status
   * @param detailId The ID of the stock out detail
   * @param boxData The scanned box data
   */
  const handleBarcodeScanned = (detailId: string, boxData: Box): void => {
    console.log('📦 [SCAN] Processing scanned box', { detailId, boxData });
    
    // Update the product status with the scanned box
    setProductStatuses(prev => {
      const currentStatus = prev[detailId] || {
        status: PRODUCT_STATUS.PENDING,
        boxes: [],
        notes: '',
        processedQuantity: 0
      };
      
      // Check if this box is already added to avoid duplicates
      const boxExists = currentStatus.boxes.some(box => box.barcode === boxData.barcode);
      if (boxExists) {
        console.log('📦 [SCAN] Box already exists in this product', { barcode: boxData.barcode });
        toast.warning(`Box ${boxData.barcode} already added to this product`);
        return prev;
      }
      
      // Add the box to the product
      const updatedBoxes = [...currentStatus.boxes, boxData];
      const processedQuantity = updatedBoxes.reduce((sum, box) => sum + box.quantity, 0);
      
      // Determine if the product is now fully processed
      const stockOutDetail = stockOutState?.stock_out_details?.find(detail => detail.id === detailId);
      const isFullyProcessed = stockOutDetail && processedQuantity >= stockOutDetail.quantity;
      
      console.log('📦 [SCAN] Updated product status', {
        detailId,
        boxCount: updatedBoxes.length,
        processedQuantity,
        requiredQuantity: stockOutDetail?.quantity,
        isFullyProcessed
      });
      
      // Update the status
      const updatedStatus = {
        ...currentStatus,
        status: isFullyProcessed ? PRODUCT_STATUS.PROCESSED : PRODUCT_STATUS.PENDING,
        boxes: updatedBoxes,
        processedQuantity
      };
      
      return {
        ...prev,
        [detailId]: updatedStatus
      };
    });
    
    // Ensure the product accordion is expanded
    setExpandedProducts(prev => ({
      ...prev,
      [detailId]: true
    }));
    
    // Save form state to session storage after processing
    setTimeout(() => {
      console.log('📦 [SCAN] Saving updated form state to session storage');
      saveFormStateToSession();
      
      // Store dialog state in session storage to ensure it stays open
      if (stockOutState?.id) {
        console.log('📦 [SCAN] Storing dialog open state in sessionStorage', stockOutState.id);
        sessionStorage.setItem('stockout-dialog-open', stockOutState.id);
        sessionStorage.setItem('dialogOpenForStockOut', stockOutState.id);
      }
      
      // Show success toast
      toast.success(`Box ${boxData.barcode} added successfully`, {
        description: `Quantity: ${boxData.quantity} | Location: ${boxData.warehouse_name || 'Unknown'}`
      });
    }, 100);
  };
  
  // Handle barcode scanning for a product
  const handleScanBarcode = (detail: StockOutDetail, detailId: string, e?: React.MouseEvent): void => {
    // Prevent default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔄 [NAVIGATION] Preparing to navigate to barcode scanner', {
      detail: {
        id: detail.id,
        product_id: detail.product_id,
        quantity: detail.quantity
      },
      detailId,
      stockOutId: stockOutState?.id
    });
    
    // Save current form state to session storage before navigating
    console.log('🔄 [NAVIGATION] Saving form state before navigation');
    saveFormStateToSession();
    
    // Store dialog state in session storage to ensure it stays open when returning
    if (stockOutState?.id) {
      console.log('🔄 [NAVIGATION] Storing dialog open state in sessionStorage', stockOutState.id);
      sessionStorage.setItem('stockout-dialog-open', stockOutState.id);
    }
    
    // Navigate to barcode scanner page with stockOutId in the URL and product details in state
    // Use setTimeout to ensure navigation happens outside of any potential event handling
    console.log('🔄 [NAVIGATION] Scheduling navigation to barcode scanner');
    setTimeout(() => {
      navigate(`/barcode-scanner/${stockOutState?.id || ''}`, {
        state: {
          returnPath: location.pathname,
          productId: detail.product_id,
          detailId,
          stockOutId: stockOutState?.id,
          keepDialogOpen: true, // Ensure dialog stays open when returning
          fromBarcodeScanner: true, // Mark that we're coming from barcode scanner
          requiredQuantity: detail.quantity,
          processedQuantity: productStatuses[detailId]?.processedQuantity || 0,
        },
      });
    }, 0);
  };

  // Function to render the scan barcode button or reserved badge for a product
  const renderScanButton = (detail: StockOutDetail, detailId: string): React.ReactNode => {
    // Get the current status for this product
    const status = productStatuses[detailId];
    
    // Debug log for scan button visibility decision
    console.log(`🔍 [SCAN BUTTON] Rendering scan button for detail ${detailId}:`, {
      isReserved: stockOutState?.is_reserved === true,
      status: status?.status,
      boxes: status?.boxes?.length || 0
    });
    
    // If this is a reserved order, show a reserved badge instead of scan button
    if (stockOutState?.is_reserved === true) {
      console.log(`🔒 [SCAN BUTTON] Showing reserved badge for ${detailId} because is_reserved = true`);
      return (
        <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
          <Lock className="h-3 w-3" />
          Reserved Item
        </Badge>
      );
    }
    
    // If this product already has boxes scanned, don't show the scan button
    if (status?.boxes && status.boxes.length > 0) {
      console.log(`✅ [SCAN BUTTON] Not showing scan button for ${detailId} because it already has ${status.boxes.length} boxes`);
      return null;
    }
    
    // Otherwise, show the scan button
    console.log(`📷 [SCAN BUTTON] Showing scan button for ${detailId}`);
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={(e) => handleScanBarcode(detail, detailId, e)}
      >
        <ScanLine className="h-3 w-3" />
        Scan Barcode
      </Button>
    );
  };

  /**
   * Checks if a box has enough available quantity for the requested amount
   * @param boxId The ID of the box to check
   * @param requestedQuantity The quantity being requested
   * @returns Promise resolving to {hasEnough: boolean, availableQuantity: number, alreadyUsed: number}
   */
  const checkBoxAvailableQuantity = async (
    boxId: string,
    requestedQuantity: number
  ): Promise<{ hasEnough: boolean; availableQuantity: number; alreadyUsed: number }> => {
    console.log('📊 [QUANTITY] Checking available quantity for box', { boxId, requestedQuantity });

    // First check if this box is already used in the form
    let alreadyUsed = 0;

    // Check all products in the form for this box
    Object.values(productStatuses).forEach((status) => {
      status.boxes.forEach((box) => {
        if (box.id === boxId) {
          alreadyUsed += box.quantity;
          console.log('📊 [QUANTITY] Box already used in form:', {
            boxId,
            quantityUsed: box.quantity,
            runningTotal: alreadyUsed,
          });
        }
      });
    });

    // Now check the database for the actual available quantity
    try {
      console.log('📊 [QUANTITY] Fetching box quantity from database');
      const { data, error } = await executeQuery('batch-item-quantity', async (supabase) => {
        return await supabase
          .from('batch_items')  // Correct table name
          .select('quantity, reserved_quantity')
          .eq('id', boxId)
          .single();
      });

      if (error) {
        console.error('❌ [QUANTITY] Error checking box quantity:', error);
      }

      if (!data) {
        console.log('📊 [QUANTITY] Box not found in database');
        return { hasEnough: false, availableQuantity: 0, alreadyUsed };
      }

      const totalAvailable = data.quantity - data.reserved_quantity;
      const actuallyAvailable = totalAvailable - alreadyUsed;

      console.log('📊 [QUANTITY] Box quantity check result:', {
        boxId,
        totalQuantity: data.quantity,
        reservedQuantity: data.reserved_quantity,
        totalAvailable,
        alreadyUsed,
        actuallyAvailable,
        requestedQuantity,
        hasEnough: actuallyAvailable >= requestedQuantity,
      });

      return {
        hasEnough: actuallyAvailable >= requestedQuantity,
        availableQuantity: actuallyAvailable,
        alreadyUsed,
      };
    } catch (error) {
      console.error('❌ [QUANTITY] Error checking box quantity:', error);
      return { hasEnough: false, availableQuantity: 0, alreadyUsed };
    }
  };

  // Memoize the validation function to prevent unnecessary recalculations
  const isAllProductsProcessed = useMemo(() => {
    if (!stockOutState?.stock_out_details || stockOutState.stock_out_details.length === 0) {
      return false;
    }
    
    // If this is a reserved order, check if all products have RESERVED status
    if (stockOutState.is_reserved === true) {
      const allReserved = stockOutState.stock_out_details.every(detail => {
        const status = productStatuses[detail.id];
        return status?.status === PRODUCT_STATUS.RESERVED;
      });
      
      return allReserved;
    }
    
    // For non-reserved orders, check if all products are fully processed
    return stockOutState.stock_out_details.every(detail => {
      const status = productStatuses[detail.id];
      
      // If the product is reserved, it's considered processed
      if (status?.status === PRODUCT_STATUS.RESERVED) {
        return true;
      }
      
      // Check if the processed quantity matches the required quantity
      const processedQuantity = status?.processedQuantity || 0;
      const requiredQuantity = detail.quantity;
      
      return processedQuantity >= requiredQuantity;
    });
  }, [stockOutState?.stock_out_details, stockOutState?.is_reserved, productStatuses]);

  // Handle form submission for stock-out approval
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!isAllProductsProcessed) {
      toast.error('All products must be processed or reserved before approving the stock out.');
      return;
    }

    console.log('📝 [SUBMIT] Submitting stock out form with state:', stockOutState);
    console.log('📝 [SUBMIT] Product statuses:', productStatuses);

    try {
      setIsSubmitting(true);
      
      // Update each stock out detail
      for (const detailId in productStatuses) {
        const status = productStatuses[detailId];
        const detail = stockOutState?.stock_out_details?.find(d => d.id === detailId);
        
        if (!detail) continue;
        
        // Update stock_out_details
        try {
          console.log('📝 [SUBMIT] Updating stock_out_detail:', detailId, 'with processed_quantity:', status.processedQuantity || 0);
          
          await executeQuery('update-stock-out-detail', async (supabase) => {
            return await supabase
              .from('stock_out_details')
              .update({
                processed_quantity: status.processedQuantity || 0,
                processed_by: userId,
                processed_at: new Date().toISOString()
              })
              .eq('id', detailId);
          });
          
          console.log('✅ [SUBMIT] Successfully updated stock_out_detail:', detailId);
        } catch (detailError) {
          console.error('❌ [SUBMIT] Error updating stock_out_detail:', detailId, detailError);
          // Continue with other updates even if one fails
        }
        
        // Update batch_items status for processed boxes
        if (status.boxes && status.boxes.length > 0) {
          for (const box of status.boxes) {
            try {
              console.log('📝 [SUBMIT] Updating batch_item:', box.id, 'with status:', status.status === PRODUCT_STATUS.RESERVED ? 'RESERVED' : 'PROCESSED');
              
              await executeQuery('update-batch-item', async (supabase) => {
                return await supabase
                  .from('batch_items')
                  .update({
                    status: status.status === PRODUCT_STATUS.RESERVED ? 'RESERVED' : 'PROCESSED'
                  })
                  .eq('id', box.id);
              });
              
              console.log('✅ [SUBMIT] Successfully updated batch_item:', box.id);
            } catch (batchError) {
              console.error('❌ [SUBMIT] Error updating batch_item:', box.id, batchError);
              // Continue with other updates even if one fails
            }
            
            // Also update inventory status
            try {
              console.log('📝 [SUBMIT] Updating inventory:', box.id, 'with status:', status.status === PRODUCT_STATUS.RESERVED ? 'RESERVED' : 'PROCESSED');
              
              await executeQuery('update-inventory', async (supabase) => {
                return await supabase
                  .from('inventory')
                  .update({
                    status: status.status === PRODUCT_STATUS.RESERVED ? 'RESERVED' : 'PROCESSED'
                  })
                  .eq('id', box.id);
              });
              
              console.log('✅ [SUBMIT] Successfully updated inventory:', box.id);
            } catch (inventoryError) {
              console.error('❌ [SUBMIT] Error updating inventory:', box.id, inventoryError);
              // Continue with other updates even if one fails
            }
          }
        }
      }
      
      // Update stock_out status
      try {
        console.log('📝 [SUBMIT] Updating stock_out:', stockOutState?.id, 'with status: COMPLETED');
        
        await executeQuery('update-stock-out', async (supabase) => {
          return await supabase
            .from('stock_out')
            .update({ 
              status: 'COMPLETED',
              processed_at: new Date().toISOString(),
              processed_by: userId
            })
            .eq('id', stockOutState?.id);
        });
        
        console.log('✅ [SUBMIT] Successfully updated stock_out:', stockOutState?.id);
      } catch (stockOutError) {
        console.error('❌ [SUBMIT] Error updating stock_out:', stockOutState?.id, stockOutError);
        throw stockOutError; // Re-throw to trigger the main catch block
      }
      
      // Clear session storage
      if (stockOutState?.id) {
        sessionStorage.removeItem(`stockout-form-${stockOutState.id}`);
        console.log('🗑️ [FORM STATE] Cleared form state from session storage');
      }
      
      // Show success message
      toast.success('Stock out processed successfully!');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['stock-out-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock-out-details'] });
      
      // Navigate back to stock out list
      navigate('/warehouse/stock-out');
      
      // Close the dialog
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ [SUBMIT] Error submitting form:', error);
      
      // Provide more specific error message if available
      const errorMessage = error?.message || 
                          error?.details || 
                          'An error occurred while processing the stock out.';
      
      toast.error(errorMessage);
      
      // Don't close the dialog on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save form state to session storage
  const saveFormStateToSession = (): void => {
    if (stockOutState?.id) {
      const formState: FormState = {
        productStatuses,
        expandedProducts
      };
      sessionStorage.setItem(`stockout-form-${stockOutState.id}`, JSON.stringify(formState));
      console.log('📋 [FORM STATE] Saved form state to session storage');
    }
  };

  // Handle notes change for a product detail
  const handleNotesChange = (detailId: string, value: string): void => {
    setProductStatuses(prev => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        notes: value
      }
    }));
    
    // Save updated state to session storage
    setTimeout(() => saveFormStateToSession(), 100);
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ [DATE] Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Render product details using Accordion component
  const renderProductDetails = (detail: StockOutDetail): JSX.Element => {
    const detailId = detail.id;
    const status = productStatuses[detailId] || { 
      status: PRODUCT_STATUS.PENDING, 
      boxes: [], 
      notes: '', 
      processedQuantity: 0
    };
    const processedQuantity = status.processedQuantity || 0;
    const remainingQuantity = Math.max(0, detail.quantity - processedQuantity);
    
    console.log('🔍 [DEBUG] Rendering product detail:', { 
      detailId, 
      productId: detail.product_id,
      status: status.status,
      isReserved: stockOutState?.is_reserved,
      shouldShowScanButton: !stockOutState?.is_reserved && (!status.boxes || status.boxes.length === 0),
      stockOutIsReserved: stockOutState?.is_reserved,
      hasBoxes: !!status.boxes,
      boxesLength: status.boxes?.length || 0
    });
    
    // Determine the status badge
    const renderStatusBadge = (): JSX.Element => {
      switch (status.status) {
        case PRODUCT_STATUS.PROCESSED:
          return (
            <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
              <Check className="h-3 w-3" /> Processed
            </Badge>
          );
        case PRODUCT_STATUS.RESERVED:
          return (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Reserved
            </Badge>
          );
        default:
          return (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pending
            </Badge>
          );
      }
    };

    return (
      <AccordionItem key={detailId} value={detailId} className="border rounded-md p-2 mb-4">
        <AccordionTrigger 
          className="px-2"
        >
          <div className="flex flex-1 justify-between items-center">
            <div>
              <h3 className="font-medium text-left">{detail.product?.name}</h3>
              <div className="text-sm text-gray-500">
                SKU: {detail.product?.sku} | Quantity: {detail.quantity}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {renderStatusBadge()}
              {remainingQuantity > 0 && status.status !== PRODUCT_STATUS.RESERVED && (
                <div className="text-sm text-gray-500">
                  {processedQuantity}/{detail.quantity} processed
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-2">
          <div className="mt-2">
            {status.status === PRODUCT_STATUS.PROCESSED || status.status === PRODUCT_STATUS.RESERVED ? (
              <>
                <h4 className="font-medium mb-2">
                  {status.status === PRODUCT_STATUS.RESERVED ? 'Reserved Boxes' : 'Processed Boxes'}
                </h4>
                <div className="space-y-2">
                  {status.boxes?.map((box, index) => (
                    <div 
                      key={`${box.id}-${index}`} 
                      className={`border p-2 rounded-md ${box.is_reserved ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">Barcode: {box.barcode}</div>
                          <div className="text-sm">Quantity: {box.quantity}</div>
                          {box.is_reserved && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Reserved
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {box.warehouse_name && `${box.warehouse_name}`}
                          {box.floor && ` → Floor ${box.floor}`}
                          {box.zone && ` → Zone ${box.zone}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea 
                    value={status.notes || ''} 
                    onChange={(e) => {
                      setProductStatuses(prev => ({
                        ...prev,
                        [detailId]: {
                          ...prev[detailId],
                          notes: e.target.value
                        }
                      }));
                      saveFormStateToSession();
                    }}
                    placeholder="Add notes about this product..."
                    className="w-full"
                    disabled={status.status === PRODUCT_STATUS.RESERVED}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Required: {detail.quantity}</div>
                    <div className="text-sm text-gray-500">
                      Processed: {processedQuantity} | Remaining: {remainingQuantity}
                    </div>
                  </div>
                  {isLoadingReservedBoxes ? (
                    <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
                      <span className="animate-spin mr-1">⏳</span>
                      Loading Boxes...
                    </Badge>
                  ) : stockOutState?.is_reserved === true ? (
                    <Badge variant="outline" className="flex items-center gap-1 py-1 px-2">
                      <Lock className="h-3 w-3" />
                      Reserved Item
                    </Badge>
                  ) : (
                    (!productStatuses[detailId]?.boxes || productStatuses[detailId]?.boxes.length === 0) && (
                      <Button 
                        onClick={(e) => handleScanBarcode(detail, detailId, e)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ScanLine className="h-4 w-4" />
                        Scan Barcode
                      </Button>
                    )
                  )}
                </div>
                
                {/* Display scanned boxes even in pending state */}
                {status.boxes && status.boxes.length > 0 && (
                  <div className="mt-2 mb-2">
                    <h4 className="font-medium mb-2">Scanned Boxes</h4>
                    <div className="space-y-2">
                      {status.boxes.map((box, i) => (
                        <div key={i} className="ml-4 text-sm border rounded-md p-2 mt-1 bg-gray-50">
                          📦 Box: {box.barcode} | Qty: {box.quantity}  
                          <br />
                          📍 {box.warehouse_name || 'Unknown'} 
                          {box.floor && `→ Floor ${box.floor}`} 
                          {box.zone && `→ Zone ${box.zone}`}
                          {box.notes && <div className="text-xs italic">📝 Notes: {box.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Textarea 
                    value={status.notes || ''} 
                    onChange={(e) => handleNotesChange(detailId, e.target.value)}
                    placeholder="Add notes about this product..."
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  // Function to fetch reserved boxes for a stock out
  const fetchReservedBoxes = async (inquiryId: string, reservationId?: string): Promise<void> => {
    if (!inquiryId) {
      console.log('⚠️ [RESERVED BOXES] Cannot fetch reserved boxes - inquiry ID is missing');
      return;
    }

    setIsLoadingReservedBoxes(true);

    try {
      console.log('🔍 [RESERVED BOXES] Fetching reserved boxes for inquiry:', inquiryId);
      
      // If we don't have a reservation ID yet, try to get it
      let finalReservationId = reservationId || stockOutState?.reservation_id;
      if (!finalReservationId) {
        const { data: customReservation, error: customReservationError } = await executeQuery('custom-reservation-lookup', async (supabase) => {
          return await supabase
            .from('custom_reservations')
            .select('id')
            .eq('inquiry_id', inquiryId)
            .single();
        });

        if (customReservationError) {
          console.error('❌ [RESERVED BOXES] Error fetching custom reservation:', customReservationError);
          return;
        }

        if (!customReservation) {
          console.log('⚠️ [RESERVED BOXES] No custom reservation found for this inquiry');
          return;
        }
        
        finalReservationId = customReservation.id;
        
        // Store the reservation ID for future use
        setStockOutState(prev => {
          if (prev) {
            return { ...prev, reservation_id: finalReservationId };
          }
          return prev;
        });
      }

      console.log('✅ [RESERVED BOXES] Using reservation ID:', finalReservationId);
      
      // Step 1: Get the box IDs from custom_reservation_boxes
      const { data: reservationBoxes, error: reservationBoxesError } = await executeQuery('custom-reservation-boxes', async (supabase) => {
        return await supabase
          .from('custom_reservation_boxes')
          .select('id, box_id, reservation_id, reserved_quantity, total_quantity')
          .eq('reservation_id', finalReservationId);
      });
      
      if (reservationBoxesError) {
        console.error('❌ [RESERVED BOXES] Error fetching custom reservation boxes:', reservationBoxesError);
        return;
      }
      
      if (!reservationBoxes || reservationBoxes.length === 0) {
        console.log('⚠️ [RESERVED BOXES] No reservation boxes found');
        return;
      }
      
      console.log('✅ [RESERVED BOXES] Found reservation boxes:', reservationBoxes);
      
      // Extract box IDs for inventory query
      const boxIds = reservationBoxes.map(box => box.box_id);
      console.log('✅ [RESERVED BOXES] Box IDs to fetch:', boxIds);
      
      // Step 2: Get detailed information for each box from inventory table
      const { data: inventoryItems, error: inventoryItemsError } = await executeQuery('inventory-for-boxes', async (supabase) => {
        return await supabase
          .from('inventory')
          .select(`
            id, 
            barcode, 
            quantity, 
            total_quantity,
            reserved_quantity,
            product_id,
            warehouse_id,
            location_id,
            status
          `)
          .in('id', boxIds);
      });
      
      if (inventoryItemsError) {
        console.error('❌ [RESERVED BOXES] Error fetching inventory items:', inventoryItemsError);
        return;
      }
      
      if (!inventoryItems || inventoryItems.length === 0) {
        console.log('⚠️ [RESERVED BOXES] No inventory items found for the given box IDs');
        return;
      }
      
      console.log('✅ [RESERVED BOXES] Found inventory items:', inventoryItems);
      
      // Step 3: Get warehouse and location information
      const warehouseIds = [...new Set(inventoryItems.map(item => item.warehouse_id).filter(Boolean))];
      const locationIds = [...new Set(inventoryItems.map(item => item.location_id).filter(Boolean))];
      
      // Fetch warehouse information
      const { data: warehouses } = await executeQuery('warehouses-for-boxes', async (supabase) => {
        if (warehouseIds.length === 0) return { data: [] };
        return await supabase
          .from('warehouses')
          .select('id, name')
          .in('id', warehouseIds);
      });
      
      // Fetch location information
      const { data: locations } = await executeQuery('locations-for-boxes', async (supabase) => {
        if (locationIds.length === 0) return { data: [] };
        return await supabase
          .from('warehouse_locations')
          .select('id, name, floor, zone')
          .in('id', locationIds);
      });
      
      // Create maps for quick lookup
      const warehouseMap = new Map();
      warehouses?.forEach(warehouse => {
        warehouseMap.set(warehouse.id, warehouse);
      });
      
      const locationMap = new Map();
      locations?.forEach(location => {
        locationMap.set(location.id, location);
      });
      
      // Step 4: Combine data from both tables
      const enhancedBoxes = reservationBoxes.map(reservationBox => {
        const inventoryItem = inventoryItems.find(item => item.id === reservationBox.box_id);
        if (!inventoryItem) return null;
        
        const warehouse = warehouseMap.get(inventoryItem.warehouse_id);
        const location = locationMap.get(inventoryItem.location_id);
        
        return {
          id: reservationBox.id,
          box_id: reservationBox.box_id,
          reservation_id: reservationBox.reservation_id,
          barcode: inventoryItem.barcode || `RES-${reservationBox.box_id.substring(0, 8)}`,
          quantity: reservationBox.reserved_quantity || reservationBox.total_quantity || inventoryItem.reserved_quantity || inventoryItem.quantity || 0,
          product_id: inventoryItem.product_id,
          warehouse_name: warehouse?.name || 'Unknown',
          location_name: location?.name || 'Unknown',
          floor: location?.floor || '-',
          zone: location?.zone || '-',
          notes: 'Reserved item'
        };
      }).filter(box => box !== null);
      
      console.log('✅ [RESERVED BOXES] Enhanced boxes with batch item info:', enhancedBoxes);
      
      // Process these boxes and update product statuses
      processReservedBoxes(enhancedBoxes);
    } catch (error) {
      console.error('❌ [RESERVED BOXES] Error in fetchReservedBoxes:', error);
    } finally {
      setIsLoadingReservedBoxes(false);
    }
  };

  const processReservedBoxes = (reservedBoxes: Array<any>): void => {
    if (!reservedBoxes || reservedBoxes.length === 0 || !stockOutState?.stock_out_details) {
      console.log('⚠️ [RESERVED BOXES] No boxes to process or no stock out details available');
      return;
    }
    
    console.log('🔍 [RESERVED BOXES] Processing reserved boxes for stock out details:', stockOutState.stock_out_details);
    
    // Create a map of product IDs to their details
    const productDetailsMap = new Map<string, StockOutDetail>();
    stockOutState.stock_out_details.forEach(detail => {
      productDetailsMap.set(detail.product_id, detail);
    });
    
    // Group boxes by product ID
    const boxesByProductId = new Map<string, any[]>();
    
    // Process each reserved box
    reservedBoxes.forEach(box => {
      // Skip boxes without product ID
      if (!box.product_id) {
        console.log(`⚠️ [RESERVED BOXES] Skipping box ${box.box_id} - no product ID`);
        return;
      }
      
      // Find the stock out detail for this product
      const detail = Array.from(productDetailsMap.values()).find(d => d.product_id === box.product_id);
      
      if (!detail) {
        console.log(`⚠️ [RESERVED BOXES] No stock out detail found for product ${box.product_id}`);
        return;
      }
      
      // Add this box to the boxes for this product
      if (!boxesByProductId.has(box.product_id)) {
        boxesByProductId.set(box.product_id, []);
      }
      
      // Convert the box to the format expected by the UI
      const uiBox: Box = {
        id: box.box_id,
        barcode: box.barcode || `RES-${box.box_id.substring(0, 8)}`,
        quantity: box.quantity,
        warehouse_name: box.warehouse_name || 'Reserved',
        location_name: box.location_name || 'Reserved',
        floor: box.floor || '-',
        zone: box.zone || '-',
        notes: box.notes || 'Reserved item',
        is_reserved: true,
        productId: box.product_id,
        stockOutId: stockOutState.id
      };
      
      boxesByProductId.get(box.product_id)?.push(uiBox);
    });
    
    // Update product statuses for all products with reserved boxes
    boxesByProductId.forEach((boxes, productId) => {
      const detail = Array.from(productDetailsMap.values()).find(d => d.product_id === productId);
      
      if (!detail) return;
      
      const processedQuantity = boxes.reduce((sum, b) => sum + (b.quantity || 0), 0);
      
      console.log(`✅ [RESERVED BOXES] Setting RESERVED status for product ${productId} with ${boxes.length} boxes and quantity ${processedQuantity}`);
      
      setProductStatuses(prev => ({
        ...prev,
        [detail.id]: {
          status: PRODUCT_STATUS.RESERVED,
          boxes: boxes,
          processedQuantity: processedQuantity,
          notes: `Reserved: ${boxes.length} boxes`
        }
      }));
    });
    
    console.log('✅ [RESERVED BOXES] Updated product statuses:', productStatuses);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="stock-out-form-description">
        <div id="stock-out-form-description" className="sr-only">Process stock out form for approving scanned items</div>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Process Stock-Out: {stockOutState?.reference_number || `Order #${stockOutState?.id.substring(0, 8)}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md">
          <div>
            <span className="text-sm font-medium">Status:</span>
            <Badge variant="outline" className="ml-2">{stockOutState?.status}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Date:</span>
            <span className="ml-2">{safeFormatDate(stockOutState?.created_at)}</span>
          </div>
          <div>
            <span className="text-sm font-medium">Total Products:</span>
            <span className="ml-2">{stockOutState?.stock_out_details?.length || 0}</span>
          </div>
          {stockOutState?.is_reserved && (
            <div>
              <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                <Lock className="h-3 w-3" /> Reserved Order
              </Badge>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Accordion 
            type="multiple" 
            value={Object.entries(expandedProducts)
              .filter(([_, isExpanded]) => isExpanded)
              .map(([id]) => id)}
            onValueChange={(value) => {
              // Create a new expandedProducts object based on the new value array
              const newExpandedProducts = {...expandedProducts};
              
              // For each product ID, check if it's in the value array
              stockOutState.stock_out_details?.forEach(detail => {
                const detailId = detail.id;
                newExpandedProducts[detailId] = value.includes(detailId);
              });
              
              setExpandedProducts(newExpandedProducts);
              // Save to session storage to persist the expansion state
              saveFormStateToSession();
            }}
            className="space-y-2"
          >
            {stockOutState?.stock_out_details?.map(detail => renderProductDetails(detail))}
          </Accordion>

          {stockOutState?.stock_out_details && stockOutState.stock_out_details.length > 0 ? (
            <DialogFooter>
              <Button
                type="submit"
                disabled={!isAllProductsProcessed || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  '✅ Approve Stockout'
                )}
              </Button>
            </DialogFooter>
          ) : (
            <div className="text-center text-gray-500">
              No products to process
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessStockOutForm;