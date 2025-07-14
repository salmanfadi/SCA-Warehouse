import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import StockOutForm from '@/components/warehouse/stockout/StockOutForm';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockOutRequest, ProcessedItem } from '@/services/stockout/types';

interface LocationState {
  barcode?: string;
  returnPath?: string;
  productId?: string;
  detailId?: string;
  quantity?: number;
  processedQuantity?: number;
  productName?: string;
  stockOutId?: string;

}

interface BarcodeStockOutPageProps {
  isAdminView?: boolean;
  overrideBackNavigation?: () => boolean;
}

const BarcodeStockOutPage: React.FC<BarcodeStockOutPageProps> = ({
  isAdminView = false,
  overrideBackNavigation
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { stockOutId } = useParams<{ stockOutId?: string }>();
  const { user } = useAuth();
  const [isProcessComplete, setIsProcessComplete] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState<string | undefined>(undefined);
  

  // Get stockOutId from URL params or location state
  const [effectiveStockOutId, setEffectiveStockOutId] = useState<string | undefined>(stockOutId);
  
  useEffect(() => {
    // If stockOutId is not in URL params, try to get it from location state
    if (!stockOutId) {
      const state = location.state as LocationState;
      if (state?.stockOutId) {
        // We have the stock out ID in the location state
        console.log('Using stock out ID from location state:', state.stockOutId);
        setEffectiveStockOutId(state.stockOutId);
      } else if (state?.detailId) {
        // We don't have the stock out ID in this case, but we have the detail ID
        // which is sufficient for the barcode scanning process
        console.log('Using detail ID from location state:', state.detailId);
      }
    }
  }, [stockOutId, location]);
  
  // Create a stock out request directly from location state if available
  const stockOutFromLocationState = React.useMemo(() => {
    const state = location.state as LocationState;
    if (state?.productId && state?.detailId) {
      console.log('Creating stock out request from location state:', state);
      return {
        id: state.stockOutId || ('temp-' + state.detailId),
        product_id: state.productId,
        product_name: state.productName || 'Product',
        quantity: state.quantity || 0,
        processed_quantity: state.processedQuantity || 0,
        detailId: state.detailId,
        returnPath: state.returnPath,
        stock_out_details: [
          {
            id: state.detailId,
            product_id: state.productId,
            quantity: state.quantity || 0,
            processed_quantity: state.processedQuantity || 0,
            product: {
              id: state.productId,
              name: state.productName || 'Product'
            }
          }
        ]
      };
    }
    return null;
  }, [location.state]);

  // Fetch stock out request details if ID is provided
  const { data: stockOutRequestRaw, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['stock-out-request', effectiveStockOutId],
    queryFn: async () => {
      try {
        // If we have location state with product info, use that instead of making a query
        if (stockOutFromLocationState) {
          console.log('Using stock out request from location state');
          return stockOutFromLocationState;
        }
        
        if (!effectiveStockOutId) {
          console.log('No effectiveStockOutId available, returning null');
          return null;
        }
        
        console.log('Fetching stock out data with ID:', effectiveStockOutId);
        
        // First, get the basic stock out information
        const { data: stockOutData, error: stockOutError } = await executeQuery('stock_out', async (supabase) => {
          console.log('Executing basic stock out query for ID:', effectiveStockOutId);
          return await supabase
            .from('stock_out')
            .select('*')
            .eq('id', effectiveStockOutId)
            .single();
        });
        
        if (stockOutError) {
          console.error('Error fetching basic stock out data:', stockOutError);
          // If we have location state as a fallback, use it
          if (stockOutFromLocationState) {
            return stockOutFromLocationState;
          }
          throw stockOutError;
        }
        
        if (!stockOutData) {
          if (stockOutFromLocationState) {
            return stockOutFromLocationState;
          }
          throw new Error('Stock out request not found');
        }
        
        // Now get the stock out details separately
        const { data: detailsData, error: detailsError } = await executeQuery('stock_out_details', async (supabase) => {
          console.log('Fetching stock out details for stock out ID:', effectiveStockOutId);
          return await supabase
            .from('stock_out_details')
            .select('*')
            .eq('stock_out_id', effectiveStockOutId);
        });
        
        if (detailsError) {
          console.error('Error fetching stock out details:', detailsError);
        }
        
        // Now fetch product data for each detail
        if (detailsData && detailsData.length > 0) {
          const firstDetail = detailsData[0];
          const productId = firstDetail.product_id;
          
          if (productId) {
            const { data: productData, error: productError } = await executeQuery('products', async (supabase) => {
              console.log('Fetching product data for product ID:', productId);
              return await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            });
            
            if (productError) {
              console.error('Error fetching product data:', productError);
            } else if (productData) {
              // Attach product data to the detail
              firstDetail.product = productData;
            }
          }
          
          // Attach the details to the stock out data
          stockOutData.stock_out_details = detailsData;
        }
        
        // Get the user profile information if we have a requested_by field
        if (stockOutData.requested_by) {
          const { data: profileData, error: profileError } = await executeQuery('profiles', async (supabase) => {
            console.log('Fetching profile data for user ID:', stockOutData.requested_by);
            return await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', stockOutData.requested_by)
              .single();
          });
          
          if (profileError) {
            console.error('Error fetching profile data:', profileError);
          } else if (profileData) {
            stockOutData.profiles = profileData;
          }
        }
        
        console.log('Final stock out data response:', stockOutData);
        return stockOutData;
      } catch (error) {
        console.error('Error in stock out request query:', error);
        // If we have location state as a fallback, use it
        if (stockOutFromLocationState) {
          return stockOutFromLocationState;
        }
        throw error;
      }
    },

    enabled: !!effectiveStockOutId || !!stockOutFromLocationState,

  });
  
  // Transform the raw stock out request into a format suitable for the StockOutForm
  const stockOutRequest = React.useMemo<StockOutRequest | null>(() => {

    // First priority: Use location state directly if available
    const state = location.state as LocationState;
    if (state?.productId && state?.detailId) {
      console.log('Creating StockOutRequest directly from location state');
      const quantity = state.quantity || 0;
      return {
        id: state.stockOutId || ('temp-' + state.detailId),
        product_id: state.productId,
        product_name: state.productName || 'Unknown Product',
        product_sku: '', // No SKU in location state
        quantity: quantity,
        processed_quantity: state.processedQuantity || 0,
        barcode: '',
        status: 'pending',
        remaining_quantity: quantity, // Required by StockOutRequest type
        requested_by: 'System', // Required by StockOutRequest type
        requested_at: new Date().toISOString() // Required by StockOutRequest type
      };
    }

    
    // Second priority: Use stockOutRequestRaw if available
    if (!stockOutRequestRaw) {
      console.log('No stock out request data available');
      return null;
    }
    
    console.log('Processing stock out request raw data:', stockOutRequestRaw);
    
    try {
      // Extract the product details from the first stock_out_detail
      let details = stockOutRequestRaw.stock_out_details;
      
      // Check if details is an array or a single object
      if (!Array.isArray(details) && details) {
        console.log('Converting stock_out_details object to array');
        details = [details];
      }
      
      const detail = Array.isArray(details) ? details[0] : null;
      
      // If we have a detail with product information
      if (detail) {
        console.log('Processing stock out detail:', detail);
        
        // Extract product information
        const product = detail.product;
        const productId = product?.id || detail.product_id || '';
        const productName = product?.name || 'Unknown Product';
        const originalQuantity = detail.quantity || 0;
        
        console.log('Product from relation:', product);
        console.log('Extracted product ID:', productId);
        console.log('Extracted product name:', productName);
        
        return {
          id: stockOutRequestRaw.id,
          status: stockOutRequestRaw.status || 'pending',
          requested_by: stockOutRequestRaw.profiles?.full_name || 'Unknown',
          requested_at: stockOutRequestRaw.created_at || new Date().toISOString(),
          quantity: originalQuantity,
          remaining_quantity: originalQuantity,
          product_id: productId,
          product_name: productName,
          product_sku: product?.sku || '',
          barcode: ''
        };
      }
      
      // If we don't have details but have basic stock out info
      if (stockOutRequestRaw.id) {
        console.log('Creating minimal StockOutRequest from raw data without details');
        return {
          id: stockOutRequestRaw.id,
          product_id: stockOutRequestRaw.product_id || '',
          product_name: stockOutRequestRaw.product_name || 'Unknown Product',
          product_sku: '',
          quantity: stockOutRequestRaw.quantity || 0,
          processed_quantity: stockOutRequestRaw.processed_quantity || 0,
          barcode: '',
          status: stockOutRequestRaw.status || 'pending',
          remaining_quantity: stockOutRequestRaw.quantity || 0,
          requested_by: stockOutRequestRaw.profiles?.full_name || 'Unknown',
          requested_at: stockOutRequestRaw.created_at || new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error transforming stock out request:', error);
      return null;
    }

  }, [stockOutRequestRaw, location.state]);

  
  // Log the processed stock out request for debugging
  React.useEffect(() => {
    if (stockOutRequest) {
      console.log('Final processed Stock Out Request:', stockOutRequest);
      console.log('Product ID in final request:', stockOutRequest.product_id);
      console.log('Product name in final request:', stockOutRequest.product_name);
    }
  }, [stockOutRequest]);
  
  // Extract barcode from location state if available
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.barcode) {
      console.log('Received barcode from redirect:', state.barcode);
      setInitialBarcode(state.barcode);
      
      // Clear the location state to prevent reprocessing on refresh
      navigate(location.pathname, { replace: true, state: { reservationDetails: state.reservationDetails } });
    }
  }, [location, navigate]);

  const handleBackClick = () => {
    if (overrideBackNavigation && overrideBackNavigation()) {
      return;
    }
    navigate(isAdminView ? '/admin/stock-out' : '/manager/stock-out');
  };

  const handleComplete = (processedItems: ProcessedItem[]) => {
    // Get the return path from location state
    const state = location.state as LocationState;
    const returnPath = state?.returnPath;
    const detailId = state?.detailId;
    
    console.log('Handle complete called with processed items:', processedItems);
    console.log('Location state:', state);
    
    if (returnPath && detailId) {
      // Transform processed items into boxes for the ProcessStockOutForm
      const boxes = processedItems.map(item => ({
        id: item.batch_item_id,
        barcode: item.barcode,
        quantity: item.quantity,
        warehouse_name: item.location_info?.warehouse_name || 'Unknown',
        floor: item.location_info?.floor || '1',
        zone: item.location_info?.zone || 'A',
        processed_at: item.processed_at || new Date().toISOString()
      }));
      
      // Calculate total processed quantity
      const totalProcessedQuantity = boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
      
      // Save the processed items to sessionStorage for the ProcessStockOutForm
      const scanResults = {
        detailId,
        boxes,
        processedItems, // Also store the original processed items for reference
        totalProcessedQuantity,
        stockOutId: state.stockOutId,
        productId: state.productId,
        timestamp: new Date().toISOString()
      };
      
      console.log('Saving barcode scan results to sessionStorage:', scanResults);
      sessionStorage.setItem('barcodeScanResults', JSON.stringify(scanResults));
      
      setIsProcessComplete(true);
      toast.success(`${boxes.length} items scanned successfully. Returning to stock-out form...`);
      
      // Navigate back to the original page
      setTimeout(() => {
        console.log('Navigating back to:', returnPath);
        navigate(returnPath);
      }, 1000);
    } else {
      // Navigate back to stock out page after a delay if no return path
      setIsProcessComplete(true);
      toast.success(`${processedItems.length} items scanned successfully`);
      
      console.log('No return path specified, navigating to stock-out page');
      setTimeout(() => {
        navigate(isAdminView ? '/admin/stock-out' : '/manager/stock-out');
      }, 2000);
    }
  };

  if (!user?.id) {
    return (
      <div className="container mx-auto p-4">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Process Stock Out</h1>
          <p className="text-muted-foreground">
            {reservationDetails ? 'Process stock out from reservation' : 'Scan barcodes to process stock out request'}
          </p>
        </div>
        <Button variant="outline" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stock Out List
        </Button>
      </div>
      
      {isLoadingRequest && !reservationDetails && (
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading stock out request...</span>
          </CardContent>
        </Card>
      )}

      {requestError && !reservationDetails && (
        <Alert variant="destructive">
          <AlertDescription>
            Error loading stock out request: {requestError instanceof Error ? requestError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      )}

      
      {isProcessComplete ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <h3 className="text-xl font-medium text-center">Stock Out Completed Successfully</h3>
              <p className="text-center text-muted-foreground">
                All items have been processed and the stock out has been completed.
              </p>
              <Button onClick={handleBackClick}>Return to Stock Out List</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        stockOutRequest && user && (
          <StockOutForm
            stockOutRequest={stockOutRequest}
            userId={user.id}
            initialBarcode={initialBarcode}
            onComplete={handleComplete}
            skipStockOutCompletion={true} // Skip completing the stock out in this component
          />
        )

      )}
    </div>
  );
};

export default BarcodeStockOutPage;
