import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  Package, 
  Scan, 
  Trash2, 
  CheckCircle 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStockOut } from '@/hooks/useStockOut';
import BarcodeScanner from '@/components/warehouse/stockout/BarcodeScanner';
import BatchItemDetails from '@/components/warehouse/stockout/BatchItemDetails';
import StockOutProgress from '@/components/warehouse/stockout/StockOutProgress';
import { executeQuery } from '@/lib/supabase';
import { StockOutRequest, ProcessedItem, BatchItem } from '@/services/stockout/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * BarcodeScannerPage Component
 * 
 * This page is used for processing stock out requests by scanning barcodes of boxes.
 * It is accessed via the route: /barcode-scanner/:stockOutId
 * 
 * This component handles:
 * - Displaying product information
 * - Scanning barcodes
 * - Processing batch items
 * - Approving stock out requests
 * 
 * It uses the useStockOut hook for all stockout-related functionality.
 */
const BarcodeScannerPage = (): React.ReactNode => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ stockOutId?: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if stockOutRequestId is in URL params or location state
  const stockOutRequestId = params.stockOutId || (location.state as { stockOutRequestId?: string })?.stockOutRequestId;

  // Fetch stock out request data
  const { data: stockOutRequestData, isLoading, error } = useQuery({
    queryKey: ['stockOutRequest', stockOutRequestId],
    queryFn: async () => {
      if (!stockOutRequestId) {
        throw new Error('Stock out request ID is required');
      }
      const { data, error } = await executeQuery('stock_out_requests', async (supabase) => {
        return await supabase
          .rpc('get_stock_out_request_details', {
            request_id: stockOutRequestId
          });
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as StockOutRequest;
    },
    enabled: !!stockOutRequestId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Use the stock out hook
  const {
    state,
    handleBarcodeScanned,
    handleQuantityChange,
    processBatchItem,
    handleCompleteStockOut,
    resetForm,
    isReadyForApproval,
    updateState
  } = useStockOut({
    initialStockOutRequest: stockOutRequestData,
    userId: user?.id || '',
    initialBarcode: undefined
  });
  
  // Update stock out request in state when data is loaded
  useEffect(() => {
    if (stockOutRequestData) {
      console.log('Stock out request data received:', stockOutRequestData);
      console.log('Current state.stockOutRequest:', state.stockOutRequest);
      
      // Extract product information from items array if available
      let productId = '';
      let productName = 'Unknown Product';
      let quantity = 0;
      
      // Check if items array exists and has at least one item
      if (stockOutRequestData.items && stockOutRequestData.items.length > 0) {
        const firstItem = stockOutRequestData.items[0];
        
        // Extract product information from the first item
        if (firstItem.product_id) {
          productId = String(firstItem.product_id);
          console.log('Found product ID in items array:', productId);
        }
        
        if (firstItem.product_name) {
          productName = firstItem.product_name;
          console.log('Found product name in items array:', productName);
        }
        
        if (firstItem.quantity) {
          quantity = firstItem.quantity;
          console.log('Found quantity in items array:', quantity);
        }
      } else {
        // Fallback to direct properties if items array is not available
        productId = stockOutRequestData.product_id ? String(stockOutRequestData.product_id) : '';
        productName = stockOutRequestData.product_name || 'Unknown Product';
        quantity = stockOutRequestData.quantity || 0;
      }
      
      if (!productId) {
        console.warn('Warning: product_id is missing in stock out request data', stockOutRequestData);
      }
      
      const normalizedStockOutRequest = {
        id: stockOutRequestData.id,
        product_id: productId,
        product_name: productName,
        quantity: quantity,
        remaining_quantity: stockOutRequestData.remaining_quantity || quantity,
        status: stockOutRequestData.status,
        requested_by: stockOutRequestData.requested_by || stockOutRequestData.requester_id,
        requested_at: stockOutRequestData.created_at,
        processed_by: stockOutRequestData.processed_by,
        processed_at: stockOutRequestData.processed_at
      };
      
      console.log('Normalized stock out request:', normalizedStockOutRequest);
      console.log('Product ID in normalized request:', normalizedStockOutRequest.product_id);
      console.log('Product name in normalized request:', normalizedStockOutRequest.product_name);
      
      // Always update the state to ensure the latest data is used
      updateState({ stockOutRequest: normalizedStockOutRequest });
    }
  }, [stockOutRequestData, updateState]);

  // Handle navigation back to stock out list
  const handleBackToList = () => {
    navigate('/warehouse/stock-out');
  };

  // Handle success state after completing stock out
  const handleSuccess = async () => {
    setIsSuccess(true);
    // Invalidate queries
    queryClient.invalidateQueries({
      queryKey: ['stockOutRequest', stockOutRequestId]
    });
    queryClient.invalidateQueries({
      queryKey: ['stockOutRequests']
    });
  };

  // Handle complete stock out
  const handleComplete = async () => {
    try {
      await handleCompleteStockOut();
      toast({
        title: 'Stock out completed successfully',
        description: 'The stock out request has been completed.',
        variant: 'default',
      });
      handleSuccess();
    } catch (error) {
      toast({
        title: 'Error completing stock out',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // Handle removing a processed item
  const handleRemoveProcessedItem = (itemId: string) => {
    const updatedItems = state.processedItems.filter(item => item.id !== itemId);
    const updatedProgress = state.stockOutRequest ? 
      (updatedItems.reduce((sum, item) => sum + item.quantity, 0) / state.stockOutRequest.quantity) * 100 : 0;
    
    updateState({
      processedItems: updatedItems,
      progress: updatedProgress
    });
  };

  // Update scanner enabled state
  const updateScannerEnabled = (enabled: boolean) => {
    updateState({
      scannerEnabled: enabled
    });
  };
  
  // Add debug logging for barcode scanning
  useEffect(() => {
    console.log('Barcode scanner component is using handleBarcodeScanned from useStockOut hook');
  }, []);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Stock Out Request</CardTitle>
            <CardDescription>Please wait while we load the stock out request data...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Stock Out Request</CardTitle>
            <CardDescription>There was an error loading the stock out request data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If no stock out request ID, show error
  if (!stockOutRequestId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Out Request Not Found</CardTitle>
            <CardDescription>No stock out request ID was provided.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Stock out request ID is required to process a stock out.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If success, show success state
  if (isSuccess) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Out Complete</CardTitle>
            <CardDescription>The stock out request has been successfully processed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Success!</h3>
            <p className="text-gray-500 text-center mb-6">
              All items have been successfully processed and the stock out request is complete.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleBackToList}>Back to Stock Out List</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Main component render
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="outline" onClick={handleBackToList} className="mr-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Process Stock Out Request</h1>
        </div>
        {state.stockOutRequest && (
          <div className="flex items-center bg-muted/30 px-3 py-1 rounded-md text-sm">
            <span className="font-medium mr-2">Status:</span>
            <span className="capitalize">{state.stockOutRequest.status}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Product Info and Stock Out Progress */}
        <div className="lg:col-span-4 space-y-6">
          {/* Product Information Card */}
          {state.stockOutRequest && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                    <p className="font-medium">{state.stockOutRequest.product_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Quantity</p>
                    <p className="font-medium">{state.stockOutRequest.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Remaining Quantity</p>
                    <p className="font-medium">{state.stockOutRequest.remaining_quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                    <p className="font-medium">{state.stockOutRequest.requested_by}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Stock Out Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Stock Out Progress
                </CardTitle>
                {state.isLoading && (
                  <div className="flex items-center text-sm text-amber-500 animate-pulse">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {state.stockOutRequest && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(state.progress)}%</span>
                    </div>
                    <Progress value={state.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Processed: {state.processedItems.reduce((sum, item) => sum + item.quantity, 0)} / {state.stockOutRequest.quantity}
                      </span>
                      <span>
                        Remaining: {state.stockOutRequest.remaining_quantity}
                      </span>
                    </div>
                  </div>
                  
                  {/* Processed Items Summary */}
                  {state.processedItems.length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Processed Items</h4>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Batch</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {state.processedItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.batch_number}</TableCell>
                                <TableCell>{item.location_info?.location_name || 'Unknown'}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRemoveProcessedItem(item.id)}
                                    className="h-8 w-8 p-0"
                                    title="Remove item"
                                    aria-label="Remove processed item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button 
                onClick={handleComplete} 
                disabled={!isReadyForApproval() || state.isProcessing} 
                className="w-full"
                variant={isReadyForApproval() ? "default" : "outline"}
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Stock Out'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right column: Barcode Scanner and Batch Item Details */}
        <div className="lg:col-span-8">
          <div className="space-y-6">
            {/* Barcode Scanner */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scan Barcode
                </CardTitle>
                <CardDescription>Scan or enter a barcode to process a batch item</CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner 
                  onBarcodeScanned={(barcode: string) => {
                    console.log('Barcode scanned in BarcodeScannerPage, forwarding to useStockOut hook:', barcode);
                    handleBarcodeScanned(barcode);
                  }} 
                  isProcessing={state.isProcessing}
                  isEnabled={state.scannerEnabled}
                  currentBatchItem={state.currentBatchItem}
                />
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowRescan"
                    className="mr-2"
                    checked={state.scannerEnabled}
                    onChange={() => updateScannerEnabled(!state.scannerEnabled)}
                  />
                  <label htmlFor="allowRescan" className="text-sm">
                    {state.scannerEnabled ? 'Scanner Enabled (click to disable)' : 'Scanner Disabled (click to enable)'}
                  </label>
                </div>
              </CardFooter>
            </Card>

            {/* Batch Item Details */}
            {state.currentBatchItem && (
              <BatchItemDetails
                batchItem={state.currentBatchItem}
                quantity={state.quantity}
                onQuantityChange={handleQuantityChange}
                onProcess={processBatchItem}
                isProcessing={state.isProcessing}
                maxQuantity={state.stockOutRequest?.remaining_quantity || 0}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerPage;
