import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell, 
  Table 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Box, AlertTriangle } from 'lucide-react';
import { useStockInRequests, StockInRequestData } from '@/hooks/useStockInRequests';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ProcessStockInForm from './ProcessStockInForm';
import { toast } from 'sonner';

interface StockInRequestsTableProps {
  status?: string;
  filters?: Record<string, unknown>;
  onReject?: (stockIn: StockInRequestData) => void;
  userId?: string;
  adminMode?: boolean;
}

export const StockInRequestsTable: React.FC<StockInRequestsTableProps> = ({
  status = '',
  filters = {},
  onReject,
  userId,
  adminMode = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State for the process form dialog
  const [selectedStockIn, setSelectedStockIn] = useState<StockInRequestData | null>(null);
  const [isProcessFormOpen, setIsProcessFormOpen] = useState(false);
  
  // Use the shared hook for stock in requests
  const { 
    data: stockInResult, 
    isLoading, 
    error,
    refetch 
  } = useStockInRequests({
    status: status || undefined,
    ...filters
  }, page, pageSize);
  
  const stockInRequests = stockInResult?.data ?? [];
  const totalCount = stockInResult?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Handle process button click - Open the form dialog
  const handleProcess = (stockIn: StockInRequestData) => {
    console.log("Opening process form for stock in with ID:", stockIn.id);
    
    // Validate that userId is available
    if (!userId) {
      console.error("User ID is missing when trying to process stock in");
      toast.error('Unable to identify the current user. Please try logging in again.');
      return;
    }
    
    setSelectedStockIn(stockIn);
    setIsProcessFormOpen(true);
  };
  
  useEffect(() => {
    setPage(1); // Reset to first page when filters/status change
  }, [status, JSON.stringify(filters)]);
  
  // Log when the dialog opens/closes
  useEffect(() => {
    console.log("Process dialog state changed:", { 
      isOpen: isProcessFormOpen, 
      selectedStockIn: selectedStockIn?.id
    });
  }, [isProcessFormOpen, selectedStockIn]);
  
  // Handle continue processing for requests that are already in processing status
  const handleContinueProcessing = (stockIn: StockInRequestData) => {
    console.log("Continuing processing with ID:", stockIn.id);
    // Redirect to the unified batch processing page with the correct route based on user role
    const baseUrl = adminMode ? 
      '/admin/stock-in/unified/' : 
      '/manager/stock-in/unified/';
    
    navigate(`${baseUrl}${stockIn.id}`);
  };

  const handleReject = (stockIn: StockInRequestData) => {
    console.log("Rejecting stock in with ID:", stockIn.id);
    if (onReject) {
      onReject(stockIn);
    }
  };
  
  if (isLoading) {
    return (
      <div className="w-full py-10 flex justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full py-10 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-lg font-medium">Error loading stock in requests</p>
        <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  if (!stockInRequests || stockInRequests.length === 0) {
    return (
      <div className="w-full py-10 text-center border rounded-md bg-gray-50">
        <Box className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-lg font-medium text-gray-600">No stock in requests found</p>
        <p className="text-gray-500 mt-1">
          {status ? `No ${status} requests available.` : 'Try adjusting your filters.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Table for desktop/tablet */}
      <div className="hidden sm:block relative">
        <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-md border">
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Product</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Boxes</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Source</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Submitted By</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Date</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockInRequests.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[150px] lg:max-w-xs" title={item.product?.name}>
                          {item.product?.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.boxes}</TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="hidden md:table-cell">{item.source}</TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[120px]" title={item.submitter?.name || 'Unknown'}>
                        {item.submitter?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[150px]" title={item.notes || '-'}>
                        {item.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 'pending' && (
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => handleProcess(item)}
                              className="whitespace-nowrap"
                            >
                              <Box className="h-4 w-4 mr-1 sm:mr-0 md:mr-1" />
                              <span className="hidden sm:inline-block md:hidden lg:inline-block">Process</span>
                            </Button>
                          )}
                          
                          {item.status === 'processing' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleContinueProcessing(item)}
                              className="whitespace-nowrap"
                            >
                              <span className="hidden sm:inline-block md:hidden lg:inline-block">Continue </span>Processing
                            </Button>
                          )}
                          
                          {item.status === 'pending' && onReject && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReject(item)}
                              className="whitespace-nowrap"
                            >
                              Reject
                            </Button>
                          )}
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
      {/* Stacked card view for mobile */}
      <div className="sm:hidden space-y-4">
        {stockInRequests.map((item) => (
          <div key={item.id} className="rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900">
            <div className="flex justify-between items-center mb-3">
              <div className="font-bold text-base line-clamp-1">{item.product?.name}</div>
              <StatusBadge status={item.status} />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="col-span-2 flex items-center justify-between border-b pb-2 mb-1">
                <div className="flex gap-4">
                  <span>Boxes: <span className="font-semibold">{item.boxes}</span></span>
                  <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground block">Source</span>
                <span className="font-medium truncate block">{item.source}</span>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground block">Submitted By</span>
                <span className="font-medium truncate block">{item.submitter?.name || 'Unknown'}</span>
              </div>
            </div>
            
            {item.notes && (
              <div className="text-xs mb-3">
                <span className="text-muted-foreground block">Notes</span>
                <span className="font-medium line-clamp-2">{item.notes}</span>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              {item.status === 'pending' && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => handleProcess(item)}
                  className="w-full"
                >
                  <Box className="mr-2 h-4 w-4" />
                  Process
                </Button>
              )}
              {item.status === 'processing' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleContinueProcessing(item)}
                  className="w-full"
                >
                  Continue Processing
                </Button>
              )}
              {item.status === 'pending' && onReject && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleReject(item)}
                  className="w-full"
                >
                  Reject
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} ({totalCount} requests)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="h-8 w-8 hidden sm:flex"
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
              <span className="mx-2 text-sm font-medium whitespace-nowrap">
                <span className="sm:hidden">Page </span>{page}<span className="hidden sm:inline"> of {totalPages}</span><span className="inline sm:hidden">/{totalPages}</span>
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
                className="h-8 w-8 hidden sm:flex"
              >
                {'>>'}
              </Button>
            </div>
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

      {/* Process Stock In Form Dialog */}
      <ProcessStockInForm
        open={isProcessFormOpen}
        onOpenChange={setIsProcessFormOpen}
        stockIn={selectedStockIn}
        userId={userId}
        adminMode={adminMode}
      />
    </>
  );
};
