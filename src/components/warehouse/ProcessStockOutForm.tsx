import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ScanLine, ChevronDown, ChevronRight, Check, Clock, AlertCircle, Lock } from 'lucide-react';
import { format } from 'date-fns';
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
import { stockOperations } from "@/lib/supabase";

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

const ProcessStockOutForm: React.FC<ProcessStockOutFormProps> = ({ stockOut, open, onOpenChange }): JSX.Element => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [productStatuses, setProductStatuses] = useState<Record<string, ProductStatus>>({});

  // Effect to restore form state from session storage or initialize from barcode scan results
  useEffect(() => {
    console.log('📋 [FORM STATE] Restoring form state for stockOut', stockOut?.id);
    const restoreFormState = (): void => {
      if (!stockOut) {
        console.log('📋 [FORM STATE] No stockOut data available, skipping state restoration');
        return;
      }

      // Check for state from session storage
      const savedState = sessionStorage.getItem(`stockout-form-${stockOut.id}`);
      if (savedState) {
        try {
          console.log('📋 [FORM STATE] Found saved state in sessionStorage');
          const parsedState = JSON.parse(savedState) as FormState;
          console.log('📋 [FORM STATE] Parsed state:', {
            productStatusCount: Object.keys(parsedState.productStatuses || {}).length,
            expandedProductsCount: Object.keys(parsedState.expandedProducts || {}).length
          });
          setProductStatuses(parsedState.productStatuses || {});
          setExpandedProducts(parsedState.expandedProducts || {});
          console.log('📋 [FORM STATE] State restored successfully');
        } catch (error) {
          console.error('❌ [FORM STATE] Error parsing saved form state:', error);
        }
      } else {
        console.log('📋 [FORM STATE] No saved state found, initializing new state');
        // Initialize product statuses if not restored from session
        const initialStatuses: Record<string, ProductStatus> = {};
        stockOut.stock_out_details?.forEach(detail => {
          initialStatuses[detail.id] = {
            status: PRODUCT_STATUS.PENDING,
            boxes: [],
            notes: '',
            processedQuantity: 0
          };
          // Default to expanded for the first product
          if (stockOut.stock_out_details && stockOut.stock_out_details[0]?.id === detail.id) {
            setExpandedProducts(prev => ({ ...prev, [detail.id]: true }));
          }
        });
        console.log('📋 [FORM STATE] Initialized product statuses:', {
          count: Object.keys(initialStatuses).length
        });
        setProductStatuses(initialStatuses);
      }
    };

    restoreFormState();
  }, [stockOut]);
  
  // Dedicated effect to handle dialog reopening - runs immediately when stockOut is available
  useEffect(() => {
    if (!stockOut) {
      console.log('🔍 [DIALOG] No stockOut data available, skipping dialog check');
      return;
    }
    
    // Check if we need to keep the dialog open based on sessionStorage
    const dialogOpenForStockOut = sessionStorage.getItem('stockout-dialog-open');
    console.log('🔍 [DIALOG] Checking dialog state in sessionStorage:', { 
      dialogOpenForStockOut, 
      stockOutId: stockOut.id, 
      currentlyOpen: open 
    });
    
    if (dialogOpenForStockOut === stockOut.id && !open) {
      console.log('🔍 [DIALOG] Reopening dialog from session storage state');
      onOpenChange(true);
      console.log('🔍 [DIALOG] Dialog reopened successfully');
    } else if (dialogOpenForStockOut === stockOut.id) {
      console.log('🔍 [DIALOG] Dialog already open or stockOut ID mismatch');
    } else {
      console.log('🔍 [DIALOG] No dialog state found in sessionStorage');
    }
  }, [stockOut, open, onOpenChange]);
  
  // Separate effect to handle barcode scanner return data
  useEffect(() => {
    // Check if we're returning from barcode scanner with data
    const locationState = location.state as {
      boxData?: Box; 
      detailId?: string;
      fromBarcodeScanner?: boolean;
      keepDialogOpen?: boolean;
      stockOutId?: string;
    } | undefined;
    
    console.log('📷 [BARCODE] Checking for barcode scan results', locationState);
    
    if (locationState?.fromBarcodeScanner) {
      console.log('📷 [BARCODE] Detected return from barcode scanner');
      
      // Force open the dialog regardless of current state if returning from barcode scanner
      if (stockOut?.id === locationState?.stockOutId) {
        console.log('📷 [BARCODE] Reopening dialog from navigation state', {
          keepDialogOpen: locationState.keepDialogOpen,
          currentlyOpen: open,
          stockOutId: stockOut?.id,
          locationStockOutId: locationState.stockOutId
        });
        
        // Force dialog to open
        if (!open) {
          onOpenChange(true);
          console.log('📷 [BARCODE] Dialog reopened successfully');
        }
        
        // Check for box data in location state or try to retrieve from session storage
        const getBoxDataAndDetailId = () => {
          // First try to get from location state
          if (locationState?.boxData) {
            console.log('📷 [BARCODE] Found box data in location state', {
              boxData: {
                id: locationState.boxData.id,
                barcode: locationState.boxData.barcode,
                quantity: locationState.boxData.quantity,
                productId: locationState.boxData.productId,
                stockOutId: locationState.boxData.stockOutId
              },
              detailId: locationState.detailId
            });
            
            // If we have a productId in the boxData, use it to find the matching detail
            if (locationState.boxData.productId && stockOut?.stock_out_details) {
              console.log('📷 [BARCODE] Using productId to find matching detail', {
                productId: locationState.boxData.productId,
                stockOutDetailsCount: stockOut.stock_out_details.length,
                availableProductIds: stockOut.stock_out_details.map(d => d.product_id)
              });
              
              // Find the detail that matches the product ID
              const matchingDetail = stockOut.stock_out_details.find(
                detail => detail.product_id === locationState.boxData.productId
              );
              
              if (matchingDetail) {
                console.log('📷 [BARCODE] Found matching detail by productId', {
                  detailId: matchingDetail.id,
                  productId: matchingDetail.product_id,
                  productName: matchingDetail.product?.name || 'Unknown'
                });
                return {
                  boxData: locationState.boxData,
                  detailId: matchingDetail.id
                };
              } else {
                console.log('📷 [BARCODE] No matching detail found for productId', locationState.boxData.productId);
              }
            } else {
              console.log('📷 [BARCODE] No productId in boxData or no stock_out_details available', {
                hasProductId: !!locationState.boxData.productId,
                hasStockOutDetails: !!stockOut?.stock_out_details
              });
            }
            
            // If we don't have a productId or couldn't find a match, fall back to the detailId
            if (locationState?.detailId) {
              console.log('📷 [BARCODE] Using detailId from location state', {
                detailId: locationState.detailId,
                fallbackReason: !locationState.boxData.productId ? 'No productId in boxData' : 'No matching detail found'
              });
              return {
                boxData: locationState.boxData,
                detailId: locationState.detailId
              };
            } else {
              console.log('📷 [BARCODE] No detailId in location state to fall back to');
            }
          }
          
          // If not in location state, try to get from session storage
          if (stockOut?.id) {
            const storageKey = `barcode-scanner-batch-item-${stockOut.id}`;
            const storedBoxDataStr = sessionStorage.getItem(storageKey);
            const detailIdFromStorage = sessionStorage.getItem(`stockout-detail-${stockOut.id}`);
            
            if (storedBoxDataStr && detailIdFromStorage) {
              try {
                const storedBoxData = JSON.parse(storedBoxDataStr);
                console.log('📷 [BARCODE] Retrieved box data from session storage', {
                  boxData: storedBoxData,
                  detailId: detailIdFromStorage
                });
                return {
                  boxData: storedBoxData,
                  detailId: detailIdFromStorage
                };
              } catch (error) {
                console.error('📷 [BARCODE] Error parsing stored box data', error);
              }
            } else {
              console.log('📷 [BARCODE] No backup box data found in session storage');
            }
          }
          
          return null;
        };
        
        // Get box data and detail ID from location state or session storage
        const boxDataAndDetailId = getBoxDataAndDetailId();
        
        // Process the scanned barcode data if available
        if (boxDataAndDetailId) {
          const { boxData, detailId } = boxDataAndDetailId;
          console.log('📷 [BARCODE] Processing barcode scan result', {
            boxData,
            detailId,
            stockOutId: stockOut?.id,
            source: locationState?.boxData ? 'location state' : 'session storage'
          });
          
          // Process the scanned barcode data with a slight delay to ensure dialog is open
          setTimeout(() => {
            handleBarcodeScanned(detailId, boxData);
            
            // Make sure the product is expanded
            setExpandedProducts(prev => {
              const newState = {
                ...prev,
                [detailId]: true
              };
              console.log('📷 [BARCODE] Expanding product section', { detailId, expandedProducts: newState });
              return newState;
            });
            
            // Save form state to session storage after processing
            saveFormStateToSession();
            
            // Clear the backup data from session storage after successful processing
            if (stockOut?.id) {
              const storageKey = `barcode-scanner-batch-item-${stockOut.id}`;
              sessionStorage.removeItem(storageKey);
              console.log('📷 [BARCODE] Cleared backup box data from session storage');
            }
          }, 100);
        } else {
          console.log('📷 [BARCODE] Missing box data or detail ID in both location state and session storage');
        }
      } else {
        console.log('📷 [BARCODE] StockOut ID mismatch:', {
          stockOutId: stockOut?.id,
          locationStockOutId: locationState.stockOutId
        });
      }
      
      // Clear the location state to prevent reprocessing on subsequent renders
      // This is crucial to prevent duplicate processing on page refreshes
      console.log('📷 [BARCODE] Clearing location state to prevent duplicate processing');
      setTimeout(() => {
        window.history.replaceState(
          {}, 
          document.title, 
          window.location.pathname
        );
        console.log('📷 [BARCODE] Location state cleared');
      }, 200); // Increased timeout to ensure processing completes first
    }
  }, [location.state, open, onOpenChange, stockOut?.id]);

  // Effect to check for reserved items and initialize product statuses
  useEffect(() => {
    const checkForReservedItems = async (): Promise<void> => {
      if (!stockOut || !stockOut.customer_inquiry_id || !userId) return;
      
      try {
        // Check if this is a reserved order by checking customer_inquiry.is_reserved
        const { data: customerInquiry } = await executeQuery('customer-inquiry', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .select('id, is_reserved')
            .eq('id', stockOut.customer_inquiry_id)
            .single();
        });
        
        if (customerInquiry?.is_reserved) {
          console.log('This is a reserved order:', customerInquiry);
          
          // Fetch reservation boxes for this inquiry
          await fetchReservedBoxes();
        }
      } catch (error) {
        console.error('Error checking for reserved items:', error);
      }
    };

    checkForReservedItems();
  }, [stockOut, userId]);

  // Function to fetch reserved boxes for products
  const fetchReservedBoxes = async (): Promise<void> => {
    if (!stockOut || !stockOut.customer_inquiry_id) return;

    try {
      const { data: reservationBoxes } = await executeQuery('reservation-boxes', async (supabase) => {
        return await supabase
          .from('custom_reservation_boxes')
          .select(`
            id, 
            custom_reservation_id, 
            batch_item_id, 
            barcode, 
            quantity, 
            reserved_quantity,
            batch_items!inner(product_id, warehouse_id, location_id),
            warehouses:warehouse_id(id, name),
            locations:location_id(id, name, floor, zone)
          `)
          .eq('custom_reservations.customer_inquiry_id', stockOut.customer_inquiry_id);
      });
      
      if (reservationBoxes && reservationBoxes.length > 0) {
        // Group reservation boxes by product_id
        const boxesByProduct: Record<string, ReservationBox[]> = {};
        
        reservationBoxes.forEach((box: any) => {
          const productId = box.batch_items.product_id;
          if (!boxesByProduct[productId]) {
            boxesByProduct[productId] = [];
          }
          
          boxesByProduct[productId].push({
            id: box.id,
            custom_reservation_id: box.custom_reservation_id,
            batch_item_id: box.batch_item_id,
            barcode: box.barcode,
            quantity: box.quantity,
            reserved_quantity: box.reserved_quantity,
            warehouse_id: box.batch_items.warehouse_id,
            warehouse_name: box.warehouses?.name,
            location_id: box.batch_items.location_id,
            location_name: box.locations?.name,
            floor: box.locations?.floor,
            zone: box.locations?.zone,
            notes: ''
          });
        });
        
        // Update product statuses with reserved boxes
        const updatedStatuses = { ...productStatuses };
        
        stockOut.stock_out_details?.forEach(detail => {
          const reservedBoxes = boxesByProduct[detail.product_id];
          if (reservedBoxes && reservedBoxes.length > 0) {
            // Convert to Box format and mark as reserved
            const boxesFormatted: Box[] = reservedBoxes.map((box: ReservationBox) => ({
              id: box.batch_item_id,
              barcode: box.barcode,
              quantity: box.reserved_quantity,
              warehouse_name: box.warehouse_name,
              location_name: box.location_name,
              floor: box.floor,
              zone: box.zone,
              notes: box.notes,
              is_reserved: true
            }));
            
            const processedQuantity = boxesFormatted.reduce((sum, box) => sum + box.quantity, 0);
            
            // Update product status to reserved
            updatedStatuses[detail.id] = {
              status: PRODUCT_STATUS.RESERVED,
              boxes: boxesFormatted,
              notes: updatedStatuses[detail.id]?.notes || '',
              processedQuantity
            };
            
            // Expand this product by default
            setExpandedProducts(prev => ({ ...prev, [detail.id]: true }));
          }
        });
        
        setProductStatuses(updatedStatuses);
      }
    } catch (error) {
      console.error('Error fetching reserved boxes:', error);
    }
  };

  // Return null if no stock out data
  if (!stockOut) return null;

  // Toggle product expanded state
  const toggleProductExpanded = (detailId: string): void => {
    console.log('🔍 [ACCORDION] Toggling product expansion', { detailId });
    setExpandedProducts(prev => {
      const updatedState = { ...prev };
      updatedState[detailId] = !prev[detailId];
      console.log('🔍 [ACCORDION] New expansion state', { 
        detailId, 
        isExpanded: updatedState[detailId] 
      });
      return updatedState;
    });
    
    // Save to session storage after toggling
    saveFormStateToSession();
  };

  // Save form state to session storage
  const saveFormStateToSession = (): void => {
    if (!stockOut) {
      console.log('💾 [SAVE STATE] No stockOut data available, skipping save');
      return;
    }
    
    const formState: FormState = {
      productStatuses,
      expandedProducts
    };
    
    console.log('💾 [SAVE STATE] Saving form state to sessionStorage', {
      stockOutId: stockOut.id,
      productStatusCount: Object.keys(productStatuses).length,
      expandedProductsCount: Object.keys(expandedProducts).length
    });
    
    sessionStorage.setItem(
      `stockout-form-${stockOut.id}`, 
      JSON.stringify(formState)
    );
    console.log('💾 [SAVE STATE] Form state saved successfully');
  };
  // Load form state from session storage on mount
  useEffect(() => {
    if (stockOut) {
      console.log('💾 [RESTORE] Attempting to restore form state for stockOut', stockOut.id);
      const storedState = sessionStorage.getItem(`stockout-form-${stockOut.id}`);
      if (storedState) {
        try {
          console.log('💾 [RESTORE] Found stored state in sessionStorage');
          const parsedState = JSON.parse(storedState) as FormState;
          console.log('💾 [RESTORE] Parsed state:', {
            productStatusCount: Object.keys(parsedState.productStatuses || {}).length,
            expandedProductsCount: Object.keys(parsedState.expandedProducts || {}).length
          });
          setProductStatuses(parsedState.productStatuses || {});
          setExpandedProducts(parsedState.expandedProducts || {});
          console.log('💾 [RESTORE] State restored successfully');
        } catch (error) {
          console.error('❌ [RESTORE] Error parsing stored form state:', error);
        }
      } else {
        console.log('💾 [RESTORE] No stored state found for stockOut', stockOut.id);
      }
    } else {
      console.log('💾 [RESTORE] No stockOut data available, skipping restore');
    }
  }, [stockOut]);
  
  // Keep the form expanded when returning from the barcode scanner
  useEffect(() => {
    if (location.state?.fromBarcodeScanner) {
      console.log('🔍 [ACCORDION] Processing barcode scanner return for accordion expansion', {
        fromBarcodeScanner: location.state.fromBarcodeScanner,
        productId: location.state.productId,
        detailId: location.state.detailId,
        stockOutId: location.state.stockOutId,
        hasStockOutDetails: !!stockOut?.stock_out_details,
        stockOutDetailsCount: stockOut?.stock_out_details?.length || 0
      });
      
      // If we have a productId in the location state, find the matching detail
      if (location.state.productId && stockOut?.stock_out_details) {
        console.log('🔍 [ACCORDION] Searching for detail matching productId', {
          productId: location.state.productId,
          availableProductIds: stockOut.stock_out_details.map(d => ({ 
            id: d.id, 
            productId: d.product_id, 
            productName: d.product?.name || 'Unknown' 
          }))
        });
        
        const matchingDetail = stockOut.stock_out_details.find(
          detail => detail.product_id === location.state.productId
        );
        
        if (matchingDetail) {
          console.log('🔍 [ACCORDION] Auto-expanding product from barcode scanner by productId', {
            productId: location.state.productId,
            detailId: matchingDetail.id,
            productName: matchingDetail.product?.name || 'Unknown'
          });
          
          setExpandedProducts(prev => {
            const newState = {
              ...prev,
              [matchingDetail.id]: true
            };
            console.log('🔍 [ACCORDION] Updated expansion state', {
              previouslyExpanded: Object.keys(prev).filter(key => prev[key]),
              newlyExpanded: matchingDetail.id,
              allExpanded: Object.keys(newState).filter(key => newState[key])
            });
            return newState;
          });
          return;
        } else {
          console.log('🔍 [ACCORDION] No matching detail found for productId', location.state.productId);
        }
      } else {
        console.log('🔍 [ACCORDION] No productId in location state or no stock_out_details available', {
          hasProductId: !!location.state.productId,
          hasStockOutDetails: !!stockOut?.stock_out_details
        });
      }
      
      // Fall back to using detailId if productId matching failed
      if (location.state.detailId) {
        console.log('🔍 [ACCORDION] Auto-expanding product from barcode scanner by detailId', {
          detailId: location.state.detailId,
          fallbackReason: !location.state.productId ? 'No productId in location state' : 'No matching detail found'
        });
        
        setExpandedProducts(prev => {
          const newState = {
            ...prev,
            [location.state.detailId]: true
          };
          console.log('🔍 [ACCORDION] Updated expansion state', {
            previouslyExpanded: Object.keys(prev).filter(key => prev[key]),
            newlyExpanded: location.state.detailId,
            allExpanded: Object.keys(newState).filter(key => newState[key])
          });
          return newState;
        });
      } else {
        console.log('🔍 [ACCORDION] No detailId in location state to fall back to');
      }
    }
  }, [location.state, stockOut?.stock_out_details]);

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
      const stockOutDetail = stockOut?.stock_out_details?.find(detail => detail.id === detailId);
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
    
    // Schedule saving the updated state to session storage
    // This is important to persist the changes between page navigations
    setTimeout(() => {
      console.log('📦 [SCAN] Saving updated form state to session storage');
      saveFormStateToSession();
      
      // Store dialog state in session storage to ensure it stays open
      if (stockOut?.id) {
        console.log('📦 [SCAN] Storing dialog open state in sessionStorage', stockOut.id);
        sessionStorage.setItem('stockout-dialog-open', stockOut.id);
        sessionStorage.setItem('dialogOpenForStockOut', stockOut.id);
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
      stockOutId: stockOut?.id
    });
    
    // Save current form state to session storage before navigating
    console.log('🔄 [NAVIGATION] Saving form state before navigation');
    saveFormStateToSession();
    
    // Store dialog state in session storage to ensure it stays open when returning
    if (stockOut?.id) {
      console.log('🔄 [NAVIGATION] Storing dialog open state in sessionStorage', stockOut.id);
      sessionStorage.setItem('stockout-dialog-open', stockOut.id);
    }
    
    // Navigate to barcode scanner page with stockOutId in the URL and product details in state
    // Use setTimeout to ensure navigation happens outside of any potential event handling
    console.log('🔄 [NAVIGATION] Scheduling navigation to barcode scanner');
    setTimeout(() => {
      navigate(`/barcode-scanner/${stockOut?.id || ''}`, {
        state: {
          returnPath: location.pathname,
          productId: detail.product_id,
          detailId,
          stockOutId: stockOut?.id,
          keepDialogOpen: true, // Ensure dialog stays open when returning
          fromBarcodeScanner: true, // Mark that we're coming from barcode scanner
          requiredQuantity: detail.quantity,
          processedQuantity: productStatuses[detailId]?.processedQuantity || 0,
        },
      });
    }, 0);
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
      const { data } = await executeQuery('batch-item-quantity', async (supabase) => {
        return await supabase
          .from('batch_items')
          .select('quantity, reserved_quantity')
          .eq('id', boxId)
          .single();
      });

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

  // Function to check if all products have been processed or reserved
  const areAllProductsProcessed = (): boolean => {
    if (!stockOut?.stock_out_details) {
      console.log('📝 [VALIDATION] No stock out details available');
      return false;
    }

    const allProcessed = stockOut.stock_out_details.every((detail) => {
      const status = productStatuses[detail.id];
      const isProcessed = status && (status.status === PRODUCT_STATUS.PROCESSED || status.status === PRODUCT_STATUS.RESERVED);

      if (!isProcessed) {
        console.log('📝 [VALIDATION] Product not fully processed:', {
          detailId: detail.id,
          productId: detail.product_id,
          status: status?.status || 'undefined',
          processedQuantity: status?.processedQuantity || 0,
          requiredQuantity: detail.quantity,
        });
      }

      return isProcessed;
    });

    console.log('📝 [VALIDATION] All products processed check:', { allProcessed });
    return allProcessed;
  };

  // Handle form submission for stock-out approval
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    console.log('💾 [SUBMIT] Form submission initiated');

    if (!areAllProductsProcessed()) {
      console.log('💾 [SUBMIT] Validation failed - not all products processed');
      toast.error('All products must be processed or reserved before approving the stock out.');
      return;
    }

    console.log('💾 [SUBMIT] All products validated, proceeding with submission');
    setIsSubmitting(true);

    try {
      console.log('💾 [SUBMIT] Preparing processed items data');
      
      // Prepare processed items data
      const processedItems: Array<{
        detail_id: string;
        batch_item_id: string;
        product_id: string;
        barcode: string;
        quantity: number;
        notes: any; // Using any for JSONB compatibility
      }> = [];

      // Maps to track quantities for inventory updates
      const productQuantityMap: Record<string, number> = {};
      const locationInventoryMap: Record<string, Record<string, number>> = {};

      for (const detail of stockOut.stock_out_details || []) {
        const status = productStatuses[detail.id];
        if (!status || status.boxes.length === 0) {
          console.log('💾 [SUBMIT] Skipping detail with no boxes:', detail.id);
          continue;
        }

        console.log('💾 [SUBMIT] Processing detail:', {
          detailId: detail.id,
          productId: detail.product_id,
          boxCount: status.boxes.length,
          status: status.status,
        });

        // Track total processed quantity for this product
        let totalProcessedQuantity = 0;

        for (const box of status.boxes) {
          // Create a structured notes object for location details
          const locationDetails = {
            warehouse_name: box.warehouse_name || '',
            location_name: box.location_name || '',
            floor: box.floor || '',
            zone: box.zone || '',
            box_notes: box.notes || ''
          };
          
          // Combine user notes with location details
          const notesObject = {
            user_notes: status.notes || '',
            location: locationDetails
          };
          
          // Add to processed items array
          processedItems.push({
            detail_id: detail.id,
            batch_item_id: box.id,
            product_id: detail.product_id,
            barcode: box.barcode,
            quantity: box.quantity,
            notes: notesObject
          });

          // Update quantity tracking
          totalProcessedQuantity += box.quantity;

          // Track by product for inventory updates
          if (!productQuantityMap[detail.product_id]) {
            productQuantityMap[detail.product_id] = 0;
          }
          productQuantityMap[detail.product_id] += box.quantity;

          // Track by location for inventory updates
          const locationKey = `${box.warehouse_name || 'unknown'}_${box.location_name || 'unknown'}`;
          if (!locationInventoryMap[locationKey]) {
            locationInventoryMap[locationKey] = {};
          }
          if (!locationInventoryMap[locationKey][detail.product_id]) {
            locationInventoryMap[locationKey][detail.product_id] = 0;
          }
          locationInventoryMap[locationKey][detail.product_id] += box.quantity;
        }
      }

      console.log('💾 [SUBMIT] Prepared processed items:', {
        count: processedItems.length,
        stockOutId: stockOut.id,
        productQuantityMap,
        locationInventoryMap
      });

      // Start transaction for database updates
      console.log('💾 [SUBMIT] Starting database transaction');
      
      // 1. Insert processed items into stock_out_processed_items table
      console.log('💾 [SUBMIT] 1. Inserting processed items');
      const { data: processedItemsData, error: processedItemsError } = await executeQuery('stock_out_processed_items', async (supabase) => {
        return await supabase
          .from('stock_out_processed_items')
          .insert(
            processedItems.map(item => ({
              stock_out_id: stockOut.id,
              stock_out_detail_id: item.detail_id,
              batch_item_id: item.batch_item_id,
              product_id: item.product_id,
              barcode: item.barcode,
              quantity: item.quantity,
              notes: item.notes,
              processed_by: userId,
              processed_at: new Date().toISOString()
            }))
          )
          .select();
      });

      if (processedItemsError) {
        console.error('❌ [SUBMIT] Error inserting processed items:', processedItemsError);
        throw processedItemsError;
      }
      
      // 2. Update stock_out_details with processed information
      console.log('💾 [SUBMIT] 2. Updating stock out details');
      for (const detail of stockOut.stock_out_details || []) {
        const status = productStatuses[detail.id];
        if (!status || status.boxes.length === 0) continue;
        
        const processedQuantity = status.boxes.reduce((sum, box) => sum + box.quantity, 0);
        
        const { error: detailUpdateError } = await executeQuery('stock_out_details', async (supabase) => {
          return await supabase
            .from('stock_out_details')
            .update({
              processed_quantity: processedQuantity,
              processed_at: new Date().toISOString(),
              processed_by: userId
              // Removed notes field as it doesn't exist in the stock_out_details table
            })
            .eq('id', detail.id);
        });
        
        if (detailUpdateError) {
          console.error('❌ [SUBMIT] Error updating stock out detail:', detailUpdateError);
          throw detailUpdateError;
        }
      }
      
      // 3. Update stock_out status to approved
      console.log('💾 [SUBMIT] 3. Updating stock out status to approved');
      const { error: stockOutUpdateError } = await stockOperations.processStockOut(
        stockOut.id,
        userId,
        'approved'
      );
      
      if (stockOutUpdateError) {
        console.error('❌ [SUBMIT] Error updating stock out:', stockOutUpdateError);
        throw stockOutUpdateError;
      }
      
      // 4. Update customer inquiry if linked
      if (stockOut.customer_inquiry_id) {
        console.log('💾 [SUBMIT] 4. Updating linked customer inquiry');
        const { error: inquiryUpdateError } = await executeQuery('customer_inquiries', async (supabase) => {
          return await supabase
            .from('customer_inquiries')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', stockOut.customer_inquiry_id);
        });
        
        if (inquiryUpdateError) {
          console.error('❌ [SUBMIT] Error updating customer inquiry:', inquiryUpdateError);
          throw inquiryUpdateError;
        }
      }
      
      // 5. Update batch items to deduct quantities
      console.log('💾 [SUBMIT] 5. Updating batch items');
      for (const item of processedItems) {
        const { error: batchItemUpdateError } = await executeQuery('batch_items', async (supabase) => {
          return await supabase
            .from('batch_items')
            .update({
              status: BATCH_STATUS.USED,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.batch_item_id);
        });
        
        if (batchItemUpdateError) {
          console.error('❌ [SUBMIT] Error updating batch item:', batchItemUpdateError);
          throw batchItemUpdateError;
        }
      }
      
      // 6. Update inventory for each location
      console.log('💾 [SUBMIT] 6. Updating inventory');
      
      // First, get warehouse and location IDs from names
      const warehouseLocationMap = new Map();
      
      for (const [locationKey, products] of Object.entries(locationInventoryMap)) {
        const [warehouseName, locationName] = locationKey.split('_');
        
        // Skip if we don't have valid names
        if (!warehouseName || warehouseName === 'unknown') {
          console.log('💾 [SUBMIT] Skipping inventory update for unknown warehouse');
          continue;
        }
        
        // Find warehouse ID
        let warehouseId = null;
        let locationId = null;
        
        try {
          // Try to get warehouse ID by name
          const { data: warehouseData } = await executeQuery('warehouses', async (supabase) => {
            return await supabase
              .from('warehouses')
              .select('id')
              .eq('name', warehouseName)
              .single();
          });
          
          if (warehouseData) {
            warehouseId = warehouseData.id;
            
            // If we have a location name, try to get its ID
            if (locationName && locationName !== 'unknown') {
              const { data: locationData } = await executeQuery('locations', async (supabase) => {
                return await supabase
                  .from('locations')
                  .select('id')
                  .eq('name', locationName)
                  .eq('warehouse_id', warehouseId)
                  .single();
              });
              
              if (locationData) {
                locationId = locationData.id;
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ [SUBMIT] Error finding warehouse/location IDs:', error);
          // Continue with the process even if we can't find IDs
        }
        
        // Store the IDs for this location key
        warehouseLocationMap.set(locationKey, { warehouseId, locationId });
        
        // Update inventory for each product in this location
        for (const [productId, quantity] of Object.entries(products)) {
          // Find existing inventory record
          const { data: inventoryData, error: inventoryQueryError } = await executeQuery('inventory', async (supabase) => {
            const query = supabase
              .from('inventory')
              .select('*')
              .eq('product_id', productId);
            
            // Add warehouse ID filter if available
            if (warehouseId) {
              query.eq('warehouse_id', warehouseId);
            } else {
              // Fall back to warehouse name if ID not found
              query.eq('warehouse_name', warehouseName);
            }
            
            // Add location ID filter if available
            if (locationId) {
              query.eq('location_id', locationId);
            } else if (locationName && locationName !== 'unknown') {
              // Fall back to location name if ID not found
              query.eq('location_name', locationName);
            }
            
            return await query.single();
          });
          
          if (inventoryQueryError && inventoryQueryError.code !== 'PGRST116') { // PGRST116 is not found
            console.warn('⚠️ [SUBMIT] Error querying inventory:', inventoryQueryError);
            // Continue with the process even if we can't find inventory
            continue;
          }
          
          if (inventoryData) {
            // Update existing inventory record
            const { error: inventoryUpdateError } = await executeQuery('inventory', async (supabase) => {
              return await supabase
                .from('inventory')
                .update({
                  quantity: Math.max(0, (inventoryData.quantity || 0) - quantity),
                  available_quantity: Math.max(0, (inventoryData.available_quantity || 0) - quantity),
                  updated_at: new Date().toISOString()
                })
                .eq('id', inventoryData.id);
            });
            
            if (inventoryUpdateError) {
              console.warn('⚠️ [SUBMIT] Error updating inventory:', inventoryUpdateError);
              // Continue with the process even if we can't update inventory
            }
          }
        }
      }
      
      // Skip inventory refresh as it's causing errors
      console.log('💾 [SUBMIT] 7. Skipping inventory refresh due to potential errors');
      // The refresh_inventory_details RPC function seems to have issues with array parameters

      console.log('💾 [SUBMIT] Stock out processed successfully, cleaning up');

      // Special handling for reserved items
      if (stockOut.is_reserved) {
        console.log('💾 [SUBMIT] Processing reserved stock out');
        
        try {
          // Update reserved quantities in inventory
          console.log('💾 [SUBMIT] 8. Updating reserved quantities in inventory');
          
          // Use the warehouse/location map we created earlier
          for (const [locationKey, products] of Object.entries(locationInventoryMap)) {
            const [warehouseName, locationName] = locationKey.split('_');
            const { warehouseId, locationId } = warehouseLocationMap.get(locationKey) || {};
            
            for (const [productId, quantity] of Object.entries(products)) {
              try {
                // Find existing inventory record
                const { data: inventoryData } = await executeQuery('inventory', async (supabase) => {
                  const query = supabase
                    .from('inventory')
                    .select('*')
                    .eq('product_id', productId);
                  
                  // Add warehouse ID filter if available
                  if (warehouseId) {
                    query.eq('warehouse_id', warehouseId);
                  } else {
                    // Fall back to warehouse name if ID not found
                    query.eq('warehouse_name', warehouseName);
                  }
                  
                  // Add location ID filter if available
                  if (locationId) {
                    query.eq('location_id', locationId);
                  } else if (locationName && locationName !== 'unknown') {
                    // Fall back to location name if ID not found
                    query.eq('location_name', locationName);
                  }
                  
                  return await query.single();
                });
                
                if (inventoryData && inventoryData.reserved_quantity > 0) {
                  // Update existing inventory record to reduce reserved quantity
                  await executeQuery('inventory', async (supabase) => {
                    return await supabase
                      .from('inventory')
                      .update({
                        reserved_quantity: Math.max(0, (inventoryData.reserved_quantity || 0) - quantity),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', inventoryData.id);
                  });
                }
              } catch (error) {
                console.warn('⚠️ [SUBMIT] Error processing reserved inventory:', error);
                // Continue with the process even if we can't update inventory
              }
            }
          }
          
          // Update reservation status
          if (stockOut.customer_inquiry_id) {
            console.log('💾 [SUBMIT] 9. Updating reservation status');
            await executeQuery('custom_reservations', async (supabase) => {
              return await supabase
                .from('custom_reservations')
                .update({
                  status: 'fulfilled',
                  fulfilled_at: new Date().toISOString(),
                  fulfilled_by: userId
                })
                .eq('customer_inquiry_id', stockOut.customer_inquiry_id);
            });
          }
        } catch (error) {
          console.warn('⚠️ [SUBMIT] Error processing reservation:', error);
          // Non-critical error, continue with the process
        }
      }

      // Clear ALL session storage related to this stock out
      try {
        sessionStorage.removeItem(`stockout-form-${stockOut.id}`);
        sessionStorage.removeItem('stockout-dialog-open');
        sessionStorage.removeItem(`batch-items-${stockOut.id}`);
        
        // Clear any product-specific session storage
        if (stockOut.stock_out_details) {
          for (const detail of stockOut.stock_out_details) {
            sessionStorage.removeItem(`batch-items-${stockOut.id}-${detail.product_id}`);
          }
        }
        
        console.log('💾 [SUBMIT] All session storage cleared');
      } catch (error) {
        console.warn('⚠️ [SUBMIT] Error clearing session storage:', error);
      }

      // Show success message
      toast.success('Stock out approved successfully', {
        duration: 5000,
      });

      // Invalidate queries to refresh data
      try {
        // Invalidate all stock-out-requests queries regardless of filters
        await queryClient.invalidateQueries({ 
          queryKey: ['stock-out-requests'] 
        });
        
        // Invalidate related queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['customerInquiries'] }),
          queryClient.invalidateQueries({ queryKey: ['inventory'] })
        ]);
      } catch (error) {
        console.warn('⚠️ [SUBMIT] Error invalidating queries:', error);
      }

      // Close dialog
      onOpenChange(false);

      // Force a refresh after a short delay to ensure the list is updated
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['stock-out-requests'],
          refetchType: 'active' // Only refetch active queries
        });
      }, 300);
    } catch (error) {
      console.error('❌ [SUBMIT] Error approving stock out:', error);
      toast.error(`Error approving stock out: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render product details using Accordion component
  const renderProductDetails = (detail: StockOutDetail): JSX.Element => {
    const detailId = detail.id;
    const status = productStatuses[detailId] || { 
      status: PRODUCT_STATUS.PENDING, 
      boxes: [], 
      notes: '', 
      processedItems: [],
      processedQuantity: 0
    };
    const processedQuantity = status.processedQuantity || 
      status.boxes?.reduce((sum, box) => sum + box.quantity, 0) || 0;
    const remainingQuantity = Math.max(0, detail.quantity - processedQuantity);
  
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
                  <Button 
                    onClick={(e) => handleScanBarcode(detail, detailId, e)}
                    className="flex items-center gap-2"
                    disabled={status.boxes.some(box => box.is_reserved === true)}
                  >
                    <ScanLine className="h-4 w-4" />
                    Scan Barcode
                  </Button>
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

  const handleNotesChange = (detailId: string, notes: string) => {
    setProductStatuses(prev => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        notes
      }
    }));
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // First update the parent's state
      onOpenChange(false);
      // Then navigate after a small delay to allow the dialog to close smoothly
      setTimeout(() => {
        navigate('/warehouse/stock-out');
      }, 100);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="stock-out-form-description">
        <div id="stock-out-form-description" className="sr-only">Process stock out form for approving scanned items</div>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Process Stock-Out: {stockOut.reference_number || `Order #${stockOut.id.substring(0, 8)}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md">
          <div>
            <span className="text-sm font-medium">Status:</span>
            <Badge variant="outline" className="ml-2">{stockOut.status}</Badge>
          </div>
          <div>
            <span className="text-sm font-medium">Date:</span>
            <span className="ml-2">{format(new Date(stockOut.created_at), 'MMM d, yyyy')}</span>
          </div>
          <div>
            <span className="text-sm font-medium">Total Products:</span>
            <span className="ml-2">{stockOut.stock_out_details?.length || 0}</span>
          </div>
          {stockOut.is_reserved && (
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
              stockOut.stock_out_details?.forEach(detail => {
                const detailId = detail.id;
                newExpandedProducts[detailId] = value.includes(detailId);
              });
              
              setExpandedProducts(newExpandedProducts);
              // Save to session storage to persist the expansion state
              saveFormStateToSession();
            }}
            className="space-y-2"
          >
            {stockOut.stock_out_details?.map(detail => renderProductDetails(detail))}
          </Accordion>

          {stockOut.stock_out_details && stockOut.stock_out_details.length > 0 ? (
            <DialogFooter>
              <Button
                type="submit"
                disabled={!areAllProductsProcessed() || isSubmitting}
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