/**
 * StockOutHistoryPage Component
 * 
 * This page displays a history of processed stock-outs with detailed information
 * about which items were processed, by whom, and from which locations.
 * 
 * @author Cascade AI
 * @lastModified 2025-07-16
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, FileDown, Eye, X, ChevronDown, Download, Filter } from 'lucide-react';
import { executeQuery } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StockOutDetailsView } from '@/components/stock-out/StockOutDetailsView';

// Format date helper function
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'PPP');
};

// Define the interface for processed items
interface ProcessedItem {
  id: string;
  stock_out_detail_id: string;
  batch_item_id: string;
  quantity: number;
  processed_by: string;
  processed_at: string;
  notes?: any;
  barcode?: string;
  product_name?: string;
  product_sku?: string;
  user_name?: string;
  user_role?: string;
  warehouse_name?: string;
  floor?: number | string;
  zone?: string;
  location_data?: {
    warehouse_name?: string;
    floor?: number | string;
    zone?: string;
  };
}

interface StockOutHistory {
  id: string;
  reference_number: string;
  customer_inquiry_id: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  customer_name: string;
  user_name: string;
  processed_items?: ProcessedItem[];
  sales_order_number?: string; // <-- Add this field
}

interface DateRange {
  start?: string;
  end?: string;
}

/**
 * StockOutHistoryPage Component
 * 
 * This page displays a history of processed stock-outs with detailed information
 * about which items were processed, by whom, and from which locations.
 */
const StockOutHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStockOut, setSelectedStockOut] = useState<StockOutHistory | null>(null);
  const [salesOrderMap, setSalesOrderMap] = useState<Record<string, string>>({});
  
  // Get status variant for badge styling
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
      case 'pending':
        return 'secondary';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Fetch stock-out history data
  const { data, isLoading, error } = useQuery({
    queryKey: ['stock-out-history', page, pageSize, searchTerm, dateRange, statusFilter],
    queryFn: async () => {
      try {
        // First, get the count for pagination
        const { count, error: countError } = await executeQuery('stock-out-count', async (supabase) => {
          let countQuery = supabase
            .from('stock_out')
            .select('*', { count: 'exact', head: true });
            
          // Apply the same filters to count query
          if (searchTerm) {
            countQuery = countQuery.or(`reference_number.ilike.%${searchTerm}%`);
          }
          
          if (dateRange.start) {
            countQuery = countQuery.gte('created_at', dateRange.start);
          }
          
          if (dateRange.end) {
            countQuery = countQuery.lte('created_at', dateRange.end);
          }
          
          if (statusFilter !== 'all') {
            countQuery = countQuery.eq('status', statusFilter);
          }
          
          return await countQuery;
        });
        
        if (countError) {
          console.error('Error getting count:', countError);
        }
        
        // Now get the actual data
        const { data, error } = await executeQuery('stock_out', async (supabase) => {
          let query = supabase
            .from('stock_out_requests_detailed')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

          // Apply filters
          if (searchTerm) {
            query = query.or(`reference_number.ilike.%${searchTerm}%,requester_name.ilike.%${searchTerm}%`);
          }
          if (dateRange.start) {
            query = query.gte('created_at', dateRange.start);
          }
          if (dateRange.end) {
            query = query.lte('created_at', dateRange.end);
          }
          if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
          }

          // Pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          return query.range(from, to);
        });
        
        if (error) throw new Error(error.message);
        
        const stockOutsWithDetails = (data || []).map((stockOut: any) => {
          return {
            id: stockOut.id,
            reference_number: stockOut.reference_number || '',
            customer_inquiry_id: stockOut.customer_inquiry_id || null,
            status: stockOut.status || 'unknown',
            created_at: stockOut.created_at || '',
            processed_at: stockOut.processed_at || null,
            processed_by: stockOut.processed_by || null,
            customer_name: stockOut.customer_name || '',
            user_name: stockOut.requester_full_name || stockOut.requester_name || '',
            processed_items: [],
            sales_order_number: stockOut.sales_order_number || '', // Use the field from the view
          };
        });
        
        return {
          stock_outs: stockOutsWithDetails,
          total_count: count || stockOutsWithDetails.length
        };
      } catch (err: any) {
        console.error('Error in stock-out-history query:', err);
        throw new Error(err.message || 'Failed to load stock-out history');
      }
    },
    refetchOnWindowFocus: false
  });
  
  const totalPages = data ? Math.ceil(data.total_count / pageSize) : 0;
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch (err) {
      return 'Invalid date';
    }
  };
  
  // Format date already defined above, no need for duplicate function
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
  };
  
  // Export data as CSV
  const handleExport = () => {
    if (!data?.stock_outs || data.stock_outs.length === 0) {
      toast.error('No data to export', {
        description: 'There are no stock-out records to export.'
      });
      return;
    }
    
    try {
      // Prepare CSV content
      const headers = [
        'Reference Number',
        'Status',
        'Created Date'
      ].join(',');
      
      const rows = data.stock_outs.map(stockOut => [
        `"${stockOut.reference_number}"`,
        `"${stockOut.status}"`,
        `"${formatDate(stockOut.created_at)}"`
      ].join(',')).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `stock-out-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Export successful', {
        description: 'Stock-out history has been exported to CSV.'
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Export failed', {
        description: 'Failed to export stock-out history.'
      });
    }
  };

  // Fetch sales order numbers for stock-outs with customer_inquiry_id
  useEffect(() => {
    if (!data?.stock_outs) return;
    const missing = data.stock_outs.filter(
      s => s.customer_inquiry_id && !salesOrderMap[s.customer_inquiry_id]
    );
    if (missing.length === 0) return;
    // Fetch all missing sales order numbers in parallel
    Promise.all(
      missing.map(async (stockOut) => {
        // Replace this with your MCP server fetch logic
        // Example: fetch(`/mcp-api/inquiries/${stockOut.customer_inquiry_id}`)
        // Here, we use fetch as a placeholder
        try {
          const res = await fetch(`/mcp-api/inquiries/${stockOut.customer_inquiry_id}`);
          if (!res.ok) return null;
          const inquiry = await res.json();
          return { id: stockOut.customer_inquiry_id, salesOrderNumber: inquiry.sales_order_number || '' };
        } catch {
          return null;
        }
      })
    ).then(results => {
      const newMap: Record<string, string> = {};
      results.forEach(r => {
        if (r && r.id) newMap[r.id] = r.salesOrderNumber;
      });
      if (Object.keys(newMap).length > 0) {
        setSalesOrderMap(prev => ({ ...prev, ...newMap }));
      }
    });
  }, [data?.stock_outs]);
  
  return (
      <div className="flex-1 w-full h-full bg-white px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Stock-Out History</h1>
          <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
            <FileDown size={16} />
            Export CSV
          </Button>
        </div>
        
        {/* Filters */}
        <Card className="mb-6 shadow-sm border">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter stock-out history by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Input
                    type="text"
                    placeholder="Search by reference number"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0"
                  />
                  <Button type="submit" variant="ghost" className="px-3">
                    <Search size={18} />
                  </Button>
                </div>
              </div>
              
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin mr-2" />
            <span>Loading history data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            <p className="font-medium">Error loading stock-out history</p>
            <p className="text-sm mt-1">{error.message}</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries(['stock-out-history'])}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="relative w-full overflow-hidden">
              <Table className="w-full border-collapse table-auto">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.stock_outs?.length ? (
                    data.stock_outs.map((stockOut) => {
                      const salesOrderNumber = stockOut.sales_order_number || 'N/A';
                      return (
                        <TableRow key={stockOut.id}>
                          <TableCell className="font-medium">{salesOrderNumber}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(stockOut.status)}>
                              {stockOut.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(stockOut.created_at)}</TableCell>
                          <TableCell>
                            <div className="relative group">
                              <Button 
                                variant={stockOut.status === 'completed' ? 'outline' : 'ghost'} 
                                size="sm"
                                onClick={() => setSelectedStockOut({ ...stockOut, sales_order_number: salesOrderNumber })}
                                aria-label={`View details for stock-out ${salesOrderNumber}`}
                              >
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No stock-out history found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data?.total_count || 0)} of {data?.total_count || 0} entries
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Show pages around current page
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
            
            {/* Stock-out details dialog */}
            {selectedStockOut && (
              <Dialog open={!!selectedStockOut} onOpenChange={() => setSelectedStockOut(null)}>
                <DialogContent className="max-w-4xl p-6 overflow-visible">
                  <DialogHeader className="pb-4 flex justify-between items-start">
                    <div>
                      <DialogTitle className="text-xl font-semibold">Stock-Out Details - {selectedStockOut.sales_order_number || 'N/A'}</DialogTitle>
                      <DialogDescription>
                        View detailed information about this stock-out order
                      </DialogDescription>
                    </div>
                  </DialogHeader>
                  
                  {selectedStockOut.status.toLowerCase() === 'completed' ? (
                    <ErrorBoundary fallback={(
                      <div className="text-center p-6 border rounded-lg bg-gray-50">
                        <div className="rounded-full bg-amber-100 p-3 inline-flex mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                        </div>
                        <p className="text-lg font-medium">Connection Error</p>
                        <p className="text-sm text-gray-500 mt-1 mb-4">
                          Unable to load stock-out details. This may be due to a connection issue.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedStockOut(null)}
                        >
                          Close
                        </Button>
                      </div>
                    )}>
                      <StockOutDetailsView stockOutId={selectedStockOut.id} />
                    </ErrorBoundary>
                  ) : (
                    <div className="text-center p-6 border rounded-lg bg-gray-50">
                      <div className="mb-4">
                        <p className="text-lg font-medium">Detailed information unavailable</p>
                        <div className="text-sm text-gray-500 mt-1">
                          This order has a status of{' '}
                          <Badge variant={getStatusVariant(selectedStockOut.status)}>
                            {selectedStockOut.status}
                          </Badge>
                          {' '}and has not been fully processed yet.
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              onClick={() => toast.info('This is not a completed order', {
                                description: 'Detailed information is only available for completed orders.'
                              })}
                            >
                              Request Details
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Only completed orders have detailed information</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  

                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>
  );
};

export default StockOutHistoryPage;