import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStockOutRequests } from '@/hooks/useStockOutRequests';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
import { format } from 'date-fns';
import { ArrowLeft, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ApproveStockOutDialog from '@/components/warehouse/ApproveStockOutDialog';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';

const StockOutManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStockOut, setSelectedStockOut] = useState<any | null>(null);
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Handle back navigation
  const handleBackClick = () => {
    navigate('/admin');
  };

  // Fetch stock out requests using the hook
  const { data: stockOutResult, isLoading } = useStockOutRequests(
    { status: statusFilter === 'all' ? undefined : statusFilter },
    page,
    pageSize
  );

  const stockOutRequests = stockOutResult?.data ?? [];
  const totalCount = stockOutResult?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Check available inventory for a product
  const getAvailableInventory = async (productId: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('status', 'in_stock');
    if (error) throw error;
    const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
    return totalQuantity;
  };

  // Update stock out status mutation
  const updateStockOutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { 
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('stock_out')
        .update(updateData)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      setIsProcessingDialogOpen(false);
      setIsApproveDialogOpen(false);
      setIsScannerOpen(false);
      toast.success('The stock out request has been updated successfully.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update stock out status');
    },
  });

  const handleStatusUpdate = (id: string, status: 'rejected') => {
    updateStockOutMutation.mutate({ id, status });
  };

  const handleApprove = async (stockOut: any) => {
    try {
      const productId = stockOut.product_id;
      
      if (!productId) {
        throw new Error('Product ID not found in stock out request');
      }
      
      const availableQuantity = await getAvailableInventory(productId);
      if (availableQuantity < stockOut.total_quantity) {
        toast.error(`Not enough inventory available. Only ${availableQuantity} units in stock.`);
        return;
      }

      setSelectedStockOut(stockOut);
      setIsApproveDialogOpen(true);
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to check available inventory');
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    setIsScannerOpen(false);
    
    if (!selectedStockOut) return;

    const transformedStockOut = {
      id: selectedStockOut.id,
      product: {
        id: selectedStockOut.product_id,
        name: selectedStockOut.product_name,
        sku: selectedStockOut.product_sku
      },
      quantity: selectedStockOut.total_quantity,
      destination: selectedStockOut.destination,
      notes: selectedStockOut.notes,
      customer: {
        name: selectedStockOut.requester_name,
        email: selectedStockOut.requester_email
      },
      stock_out_details: [{
        id: selectedStockOut.id,
        product_id: selectedStockOut.product_id,
        quantity: selectedStockOut.total_quantity,
        product: {
          id: selectedStockOut.product_id,
          name: selectedStockOut.product_name,
          sku: selectedStockOut.product_sku
        }
      }],
      scanned_barcode: barcode
    };

    setSelectedStockOut(transformedStockOut);
    setIsApproveDialogOpen(false);
    setIsProcessingDialogOpen(true);
  };

  const handleProcess = (stockOut: any) => {
    const transformedStockOut = {
      id: stockOut.id,
      product: {
        id: stockOut.product_id,
        name: stockOut.product_name,
        sku: stockOut.product_sku
      },
      quantity: stockOut.total_quantity,
      destination: stockOut.destination,
      notes: stockOut.notes,
      customer: {
        name: stockOut.requester_name,
        email: stockOut.requester_email
      },
      stock_out_details: [{
        id: stockOut.id,
        product_id: stockOut.product_id,
        quantity: stockOut.total_quantity,
        product: {
          id: stockOut.product_id,
          name: stockOut.product_name,
          sku: stockOut.product_sku
        }
      }]
    };
    setSelectedStockOut(transformedStockOut);
    setIsProcessingDialogOpen(true);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'processing':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
          Back to Admin Dashboard
        </Button>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by status:</span>
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Stock Out Requests</CardTitle>
              <CardDescription>
                Monitor and manage outgoing stock requests across warehouses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading stock out requests...</div>
          ) : stockOutRequests && stockOutRequests.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockOutRequests.map((stockOut) => {
                    // Friendly order code logic
                    const orderCode = stockOut.reference_number || (stockOut.id ? `ORDER-${stockOut.id.substring(0, 8).toUpperCase()}` : 'N/A');
                    const customerName = stockOut.customer_name || stockOut.requester_name || stockOut.requested_by || 'Unknown';
                    return (
                      <TableRow key={stockOut.id}>
                        <TableCell>
                          {format(new Date(stockOut.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {orderCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          {stockOut.product_name || 'Unknown Product'}
                          {stockOut.product_sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {stockOut.product_sku}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{stockOut.requester_name || stockOut.requested_by || 'Unknown'}</TableCell>
                        <TableCell>{customerName}</TableCell>
                        <TableCell>{stockOut.total_quantity}</TableCell>
                        <TableCell>{stockOut.destination || 'N/A'}</TableCell>
                        <TableCell>{stockOut.notes || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(stockOut.status)}>
                            {formatStatus(stockOut.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {stockOut.status === 'pending' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprove(stockOut)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(stockOut.id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {stockOut.status === 'processing' && (
                              <Button
                                size="sm"
                                onClick={() => handleProcess(stockOut)}
                              >
                                Continue
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Showing page {page} of {totalPages} ({totalCount} requests)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="h-8 w-8"
                    >
                      {'<<'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8"
                    >
                      {'<'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8"
                    >
                      {'>'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      className="h-8 w-8"
                    >
                      {'>>'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">No stock out requests found.</div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      {selectedStockOut && (
        <ApproveStockOutDialog
          open={isApproveDialogOpen}
          onOpenChange={setIsApproveDialogOpen}
          onScanBarcode={() => setIsScannerOpen(true)}
          product={{
            name: selectedStockOut.product_name
          }}
          requestedQuantity={selectedStockOut.total_quantity}
          destination={selectedStockOut.destination}
        />
      )}

      {/* Processing Dialog */}
      <Dialog open={isProcessingDialogOpen} onOpenChange={setIsProcessingDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Process Stock Out Request</DialogTitle>
          </DialogHeader>
          <ProcessStockOutForm
            open={isProcessingDialogOpen}
            onOpenChange={setIsProcessingDialogOpen}
            stockOut={selectedStockOut}
            userId={user?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <MobileBarcodeScanner
            onBarcodeScanned={handleBarcodeScanned}
            onClose={() => setIsScannerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockOutManagement;
