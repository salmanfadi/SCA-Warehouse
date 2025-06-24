import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import BarcodeStockOutForm from '@/components/warehouse/BarcodeStockOutForm';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const { data: stockOutRequest, isLoading: isLoadingRequest, error: requestError } = useQuery({
    queryKey: ['stock-out-request', stockOutId],
    queryFn: async () => {
      if (!stockOutId) return null;
      
      const { data, error } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .select(`
            *,
            stock_out_details(*, product:products(*)),
            profiles:requested_by(full_name)
          `)
          .eq('id', stockOutId)
          .single();
      });

      if (error) throw error;
      return data;
    },
    enabled: !!stockOutId,
  });
  
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Process Stock Out</h1>
          <p className="text-muted-foreground">
            {stockOutId ? 'Process the selected stock out request' : 'Scan a barcode to process stock out'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stock Out
        </Button>
      </div>

      {isLoadingRequest && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading stock out request...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {requestError && (
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Error loading stock out request: {requestError instanceof Error ? requestError.message : 'Unknown error'}
              </AlertDescription>
            </Alert>
            <Button
              className="w-full mt-4"
              onClick={handleBackClick}
            >
              Return to Stock Out
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoadingRequest && !requestError && (
        <Card>
          <CardHeader>
            <CardTitle>
              {stockOutId ? 'Process Stock Out Request' : 'Scan Barcode'}
            </CardTitle>
            {stockOutRequest && (
              <CardDescription>
                Request #{stockOutRequest.id.substring(0, 8)} • 
                {stockOutRequest.profiles?.full_name || 'Unknown'} • 
                {new Date(stockOutRequest.created_at).toLocaleDateString()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isProcessComplete ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <p className="text-green-800 font-medium">Stock out processed successfully!</p>
                <p className="text-green-600 text-sm mt-1">Redirecting to stock out page...</p>
              </div>
            ) : null}
            
            <BarcodeStockOutForm 
              userId={user.id} 
              onComplete={handleComplete}
              initialBarcode={initialBarcode}
              stockOutRequest={stockOutRequest}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BarcodeStockOutPage;
