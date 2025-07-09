import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProcessStockOutForm from '@/components/warehouse/ProcessStockOutForm';
import { CreateStockOutForm } from '@/components/warehouse/CreateStockOutForm';
import { format } from 'date-fns';
import { ArrowLeft, Plus, ScanLine, Barcode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { useNavigate } from 'react-router-dom';

interface StockOutRequestItem {
  id: string;
  created_at: string;
  destination: string;
  status: string;
  notes?: string;
  stock_out_details?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    product?: { id: string; name: string; sku?: string };
  }>;
  product?: { id: string; name: string; sku?: string } | null;
  quantity?: number;
}

interface RawStockOutDetail {
  id: string;
  product_id: string;
  quantity: number;
  product?: { id: string; name: string; sku?: string };
}

interface RawStockOut {
  id: string;
  created_at: string;
  destination: string;
  status: string;
  notes?: string;
  stock_out_details?: RawStockOutDetail[];
}

interface StockOutPageProps {
  isAdminView?: boolean;
  overrideBackNavigation?: () => boolean;
}

const StockOutPage: React.FC<StockOutPageProps> = ({
  isAdminView = false,
  overrideBackNavigation
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedStockOut, setSelectedStockOut] = useState<StockOutRequestItem | null>(null);
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');

  // Handle back navigation
  const handleBackClick = () => {
    if (overrideBackNavigation && overrideBackNavigation()) {
      return;
    }
    navigate('/manager');
  };

  // Fetch stock out requests
  const { data: stockOutRequests, isLoading } = useQuery<StockOutRequestItem[]>({
    queryKey: ['stock-out-requests', isAdminView],
    queryFn: async () => {
      const { data, error } = await executeQuery('stock_out', async (supabase) => {
        const query = supabase
          .from('stock_out')
          .select(`
            *,
            stock_out_details(*, product:products(*)),
            profiles:requested_by(full_name)
          `)
          .not('status', 'eq', 'completed') // Show all stock outs that are not completed
          .order('created_at', { ascending: false });
        
        return query;
      });

      if (error) throw error;
      
      // Transform the data to make it easier to work with
      return data?.map((stockOut: RawStockOut) => ({
        ...stockOut,
        stock_out_details: (stockOut.stock_out_details || []).map((detail: RawStockOutDetail) => ({
          id: detail.id,
          product_id: detail.product_id,
          quantity: detail.quantity,
          product: detail.product ? {
            id: detail.product.id,
            name: detail.product.name,
            sku: detail.product.sku
          } : undefined
        })),
        // Extract the first product for display in the table
        // (We'll handle multiple products in the ProcessStockOutForm)
        product: stockOut.stock_out_details?.[0]?.product || null,
        quantity: stockOut.stock_out_details?.[0]?.quantity || 0
      })) || [];
    },
  });

  const handleProcess = (stockOut: StockOutRequestItem) => {
    // Make sure we pass the full stock_out_details to the form
    setSelectedStockOut(stockOut);
    setIsProcessingDialogOpen(true);
  };

  const handleReject = async (stockOut: StockOutRequestItem) => {
    try {
      const { error } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .update({
            status: 'rejected',
            rejected_by: user?.id,
            rejected_at: new Date().toISOString(),
          })
          .eq('id', stockOut.id);
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Stock out request has been rejected.',
      });
    } catch (error) {
      console.error('Error rejecting stock out:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject stock out request',
        variant: 'destructive',
      });
    }
  };

  // Handle barcode scanning
  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    setIsScannerOpen(false);
    
    // Show a toast notification for the scanned barcode
    toast({
      title: "Barcode Scanned",
      description: `Scanned barcode: ${barcode}`,
    });
    
    // Automatically open create dialog with the scanned barcode
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {isAdminView ? "Admin" : "Manager"} Dashboard
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Stock Out Requests</CardTitle>
              <CardDescription>
                {isAdminView 
                  ? "Monitor and manage outgoing stock requests across warehouses" 
                  : "Process outgoing stock requests"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                Quick Scan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${isAdminView ? '/admin' : '/manager'}/stock-out/barcode-stock-out`)}
              >
                <Barcode className="mr-2 h-4 w-4" />
                Barcode Stock Out
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Stock Out
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : !stockOutRequests?.length ? (
            <div className="text-center py-4">No pending stock out requests</div>
          ) : (
            <>
              {/* Table for desktop/tablet */}
              <div className="hidden sm:block relative overflow-x-auto">
                <div className="absolute top-0 right-0 h-full w-8 pointer-events-none bg-gradient-to-l from-white/90 to-transparent z-10" />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOutRequests.map((stockOut: StockOutRequestItem) => (
                      <TableRow key={stockOut.id}>
                        <TableCell>
                          {format(new Date(stockOut.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{stockOut.destination}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              stockOut.status === 'pending'
                                ? 'default'
                                : stockOut.status === 'approved'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {stockOut.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{stockOut.notes || 'N/A'}</TableCell>
                        <TableCell>
                          {stockOut.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleProcess(stockOut)}
                              >
                                Process
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(stockOut)}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Stacked card view for mobile */}
              <div className="sm:hidden flex flex-col gap-4">
                {stockOutRequests.map((stockOut: StockOutRequestItem) => (
                  <div key={stockOut.id} className="rounded-lg border p-4 shadow-sm bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">{format(new Date(stockOut.created_at), 'MMM d, yyyy')}</span>
                      <Badge
                        variant={
                          stockOut.status === 'pending'
                            ? 'default'
                            : stockOut.status === 'approved'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {stockOut.status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-base mb-1">{stockOut.destination}</div>
                    <div className="text-sm text-gray-700 mb-1">Notes: {stockOut.notes || 'N/A'}</div>
                    {stockOut.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleProcess(stockOut)}
                        >
                          Process
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleReject(stockOut)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isProcessingDialogOpen && selectedStockOut && (
        <ProcessStockOutForm
          open={isProcessingDialogOpen}
          onOpenChange={setIsProcessingDialogOpen}
          stockOut={selectedStockOut}
          userId={user?.id}
        />
      )}

      <CreateStockOutForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        userId={user?.id}
        initialBarcode={scannedBarcode}
      />
      
      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MobileBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              allowManualEntry={true}
              scanButtonLabel="Start Scanning"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockOutPage;
