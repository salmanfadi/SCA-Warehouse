import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStockOutRequests } from '@/hooks/useStockOutRequests';
import ProcessStockOutForm from '@/components/warehouse/ProcessStockOutForm';
import { executeQuery } from '@/lib/supabase';

interface StockOutApprovalProps {
  isAdminView?: boolean;
}

const StockOutApproval: React.FC<StockOutApprovalProps> = ({ isAdminView = false }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedStockOut, setSelectedStockOut] = useState<any | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch paginated pending stock out requests
  const {
    data: stockOutResult,
    isLoading,
    error
  } = useStockOutRequests({ status: 'pending' }, page, pageSize);

  const stockOutRequests = stockOutResult?.data || [];
  const totalCount = stockOutResult?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Update stock out status mutation for rejection only
  const rejectStockOutMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await executeQuery('stock_out', async (supabase) => {
        return await supabase
          .from('stock_out')
          .update({
            status: 'rejected',
            rejected_by: user?.id,
            rejected_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-out-requests'] });
      toast.success('Stock out request has been rejected.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reject stock out request');
    },
  });

  const handleReject = (id: string) => {
    rejectStockOutMutation.mutate(id);
  };

  const handleApprove = async (stockOut: any) => {
    try {
      // Transform the stock out data to match the format expected by ProcessStockOutForm
      // Map all products from the details array to ensure multiple products are handled correctly
      const stock_out_details = stockOut.details?.map((detail: any) => ({
        id: detail.id,
        product_id: detail.product_id,
        quantity: detail.quantity,
        processed_quantity: detail.processed_quantity || 0,
        product: {
          id: detail.product_id,
          name: detail.product_name,
          sku: detail.product_sku,
          description: detail.product_description
        },
        notes: detail.notes,
        status: detail.status || 'pending'
      })) || [];

      // If there are no details or the details array is empty, fallback to the old structure
      // This ensures backward compatibility with older data formats
      if (stock_out_details.length === 0 && stockOut.product_id) {
        stock_out_details.push({
          id: stockOut.stock_out_detail_id,
          product_id: stockOut.product_id,
          quantity: stockOut.quantity,
          processed_quantity: stockOut.processed_quantity || 0,
          product: {
            id: stockOut.product_id,
            name: stockOut.product_name,
            sku: stockOut.product_sku
          }
        });
      }

      const transformedStockOut = {
        id: stockOut.id,
        reference_number: stockOut.reference_number,
        destination: stockOut.destination,
        notes: stockOut.notes,
        status: stockOut.status,
        customer_name: stockOut.customer_name,
        customer_email: stockOut.customer_email,
        customer_phone: stockOut.customer_phone,
        customer_company: stockOut.customer_company,
        customer_inquiry_id: stockOut.customer_inquiry_id,
        created_at: stockOut.created_at,
        stock_out_details: stock_out_details
      };
      
      console.log('Transformed stock out with multiple products:', transformedStockOut);
      setSelectedStockOut(transformedStockOut);
      setIsApprovalDialogOpen(true);
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open approval dialog');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Stock Out Approval"
          description="Approve or reject stock out requests."
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending Stock Out Requests</CardTitle>
          <CardDescription>Review and approve outgoing stock requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : !stockOutRequests || stockOutRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending stock out requests
            </div>
          ) : (
            <>
              {/* Desktop/tablet table with scroll hint */}
              <div className="hidden sm:block relative">
                <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden rounded-md border">
                      <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Requested By</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockOutRequests.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product_name || 'Unknown Product'}</TableCell>
                              <TableCell>{item.requester_name || 'Unknown'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.destination}</TableCell>
                              <TableCell>{item.reason || '-'}</TableCell>
                              <TableCell><StatusBadge status={item.status} /></TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleApprove(item)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleReject(item.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                {/* Scroll hints */}
                <div className="pointer-events-none absolute top-0 right-0 bottom-0 h-full w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent opacity-75" />
                <div className="pointer-events-none absolute top-0 left-0 bottom-0 h-full w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent opacity-75" />
              </div>
              
              {/* Mobile stacked card view */}
              <div className="sm:hidden space-y-4">
                {stockOutRequests.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-base line-clamp-1">{item.product_name || 'Unknown Product'}</div>
                      <StatusBadge status={item.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="col-span-2 flex items-center justify-between border-b pb-2 mb-1">
                        <div className="flex gap-2">
                          <span>Quantity: <span className="font-semibold">{item.quantity}</span></span>
                        </div>
                      </div>
                      
                      <div className="text-xs">
                        <span className="text-muted-foreground block mb-1">Requested By</span>
                        <span className="font-medium truncate block">{item.requester_name || 'Unknown'}</span>
                      </div>
                      
                      <div className="text-xs">
                        <span className="text-muted-foreground block mb-1">Destination</span>
                        <span className="font-medium truncate block">{item.destination}</span>
                      </div>
                    </div>
                    
                    {item.reason && (
                      <div className="text-xs mb-3">
                        <span className="text-muted-foreground block mb-1">Reason</span>
                        <span className="font-medium line-clamp-2">{item.reason}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2 mt-3">
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(item)}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(item.id)}
                        className="w-full"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
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
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="h-8 w-8"
                    >
                      {'<'}
                    </Button>
                    <span className="mx-2 text-sm font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="h-8 w-8"
                    >
                      {'>'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      className="h-8 w-8"
                    >
                      {'>>'}
                    </Button>
                    <select
                      className="ml-4 border rounded px-2 py-1 text-sm"
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size} per page</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Process Stock Out Form */}
      {isApprovalDialogOpen && selectedStockOut && (
        <ProcessStockOutForm
          open={isApprovalDialogOpen}
          onOpenChange={setIsApprovalDialogOpen}
          stockOut={selectedStockOut}
          userId={user?.id}
        />
      )}
    </div>
  );
};

export default StockOutApproval;
