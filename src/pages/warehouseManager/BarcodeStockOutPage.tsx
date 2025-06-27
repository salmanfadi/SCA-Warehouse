import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import StockOutForm from '@/components/warehouse/stockout/StockOutForm';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockOutRequest } from '@/services/stockout/types';

interface LocationState {
  barcode?: string;
}

const BarcodeStockOutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { stockOutId } = useParams<{ stockOutId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessComplete, setIsProcessComplete] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState<string | undefined>(undefined);
  
  // Fetch stock out request details if ID is provided
  const { data: stockOutRequestRaw, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['stock-out-request', stockOutId],
    queryFn: async () => {
      if (!stockOutId) return null;
      
      // First, get the stock out details with product information
      const { data: stockOutData, error: stockOutError } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .select(`
            *,
            stock_out_details!inner(*, product_id),
            profiles:requested_by(full_name)
          `)
          .eq('id', stockOutId)
          .single();
      });

      if (stockOutError) throw stockOutError;
      if (!stockOutData) throw new Error('Stock out request not found');
      
      // If we have stock_out_details, fetch the product information directly
      if (stockOutData.stock_out_details && stockOutData.stock_out_details.length > 0) {
        const productId = stockOutData.stock_out_details[0].product_id;
        
        if (productId) {
          console.log('Found product ID in stock out details:', productId);
          
          // Get product details
          const { data: productData, error: productError } = await executeQuery('products', async (supabase) => {
            return await supabase
              .from('products')
              .select('*')
              .eq('id', productId)
              .single();
          });
          
          if (!productError && productData) {
            console.log('Found product details:', productData);
            
            // Attach product data to the first stock_out_detail
            stockOutData.stock_out_details[0].product = productData;
          } else {
            console.error('Error fetching product details:', productError);
          }
        } else {
          console.warn('No product ID found in stock out details');
        }
      }

      return stockOutData;
    },
    enabled: !!stockOutId,
  });
  
  // Process the stock out request to ensure remaining_quantity is properly initialized
  const stockOutRequest = React.useMemo<StockOutRequest | null>(() => {
    if (!stockOutRequestRaw) return null;
    
    // Get the details from the first stock out detail
    const stockOutDetail = stockOutRequestRaw.stock_out_details?.[0];
    if (!stockOutDetail) {
      console.error('No stock out details found in the request');
      return null;
    }
    
    const originalQuantity = stockOutDetail.quantity || 0;
    
    // Extract product information directly from the product relation
    // or from the product_id if the relation is not available
    const product = stockOutDetail.product;
    
    // Ensure we have a valid product ID
    const productId = product?.id || stockOutDetail.product_id || '';
    const productName = product?.name || 'Unknown Product';
    
    console.log('Stock out detail:', stockOutDetail);
    console.log('Product from relation:', product);
    console.log('Extracted product ID:', productId);
    console.log('Extracted product name:', productName);
    
    if (!productId) {
      console.error('Failed to extract product ID from stock out request');
    }
    
    // Initialize the remaining quantity to the original quantity
    // This ensures the progress bar starts at 0%
    return {
      id: stockOutRequestRaw.id,
      status: stockOutRequestRaw.status,
      requested_by: stockOutRequestRaw.profiles?.full_name || 'Unknown',
      requested_at: stockOutRequestRaw.created_at,
      quantity: originalQuantity,
      remaining_quantity: originalQuantity,
      product_id: productId,
      product_name: productName
    };
  }, [stockOutRequestRaw]);
  
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
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleBackClick = () => {
    navigate('/manager/stock-out');
  };

  const handleComplete = () => {
    setIsProcessComplete(true);
    toast({
      title: 'Success',
      description: 'Stock out processed successfully',
    });
    
    // Navigate back to stock out page after a delay
    setTimeout(() => {
      navigate('/manager/stock-out');
    }, 2000);
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
            Scan barcodes to process stock out request
          </p>
        </div>
        <Button variant="outline" onClick={handleBackClick}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stock Out List
        </Button>
      </div>
      
      {isLoadingRequest && (
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading stock out request...</span>
          </CardContent>
        </Card>
      )}
      
      {requestError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load stock out request. Please try again later.
          </AlertDescription>
        </Alert>
      )}
      
      {!isLoadingRequest && !requestError && !stockOutRequest && (
        <Alert variant="destructive">
          <AlertDescription>
            Stock out request not found. Please check the URL and try again.
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
          />
        )
      )}
    </div>
  );
};

export default BarcodeStockOutPage;
