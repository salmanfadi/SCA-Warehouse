import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Loader2, Search, FileDown, Eye, X } from 'lucide-react';
import { executeQuery } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { toast } from 'sonner';

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
  processed_items: ProcessedItem[];
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
  
  // Function to fetch detailed processed items for a stock-out
  const fetchProcessedItems = async (stockOutId: string) => {
    try {
      // Try using the database function first
      try {
        const { data, error } = await executeQuery('stock-out-processed-items', async (supabase) => {
          return await supabase.rpc('get_stock_out_details', { p_stock_out_id: stockOutId });
        });

        if (!error && data && data.length > 0) {
          // Transform the data to match our ProcessedItem interface
          return data.map((item: any) => ({
            id: item.id || '',
            stock_out_detail_id: item.stock_out_detail_id || '',
            batch_item_id: item.batch_item_id || '',
            quantity: item.quantity || 0,
            processed_by: item.processed_by || '',
            processed_at: item.processed_at || '',
            notes: item.notes,
            barcode: item.barcode || 'Unknown',
            product_name: item.product_name || 'Unknown Product',
            product_sku: item.product_sku || 'No SKU',
            user_name: item.user_name || 'Unknown User',
            user_role: item.user_role || 'Staff',
            warehouse_name: item.warehouse_name || 'Unknown Warehouse',
            floor: item.floor,
            zone: item.zone || '',
            location_data: {
              warehouse_name: item.warehouse_name || 'Unknown Warehouse',
              floor: item.floor,
              zone: item.zone || ''
            }
          }));
        }
        
        // If we get here, either there was an error or no data, so we'll fall back to the direct query
        if (error) {
          console.warn('RPC function error, falling back to direct query:', error.message);
        }
      } catch (rpcError) {
        console.warn('RPC function failed, falling back to direct query:', rpcError);
      }
      
      // Fallback: Direct query approach
      const { data: processedItems, error: itemsError } = await executeQuery('processed-items-direct', async (supabase) => {
        return await supabase
          .from('stock_out_processed_items')
          .select(`
            id, stock_out_detail_id, batch_item_id, quantity, processed_by, processed_at, notes, barcode, product_id, location_id
          `)
          .eq('stock_out_id', stockOutId);
      });
      
      if (itemsError) throw new Error(itemsError.message);
      if (!processedItems || processedItems.length === 0) return [];
      
      // Get product details
      const productIds = [...new Set(processedItems.map(item => item.product_id).filter(Boolean))];
      const { data: products } = await executeQuery('products', async (supabase) => {
        return await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds);
      });
      
      // Get user details
      const userIds = [...new Set(processedItems.map(item => item.processed_by).filter(Boolean))];
      const { data: users } = await executeQuery('users', async (supabase) => {
        return await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
      });
      
      // Get location details
      const locationIds = [...new Set(processedItems.map(item => item.location_id).filter(Boolean))];
      const { data: locations } = await executeQuery('locations', async (supabase) => {
        return await supabase
          .from('locations')
          .select('id, warehouse_id')
          .in('id', locationIds);
      });
      
      const { data: warehouseLocations } = await executeQuery('warehouse-locations', async (supabase) => {
        return await supabase
          .from('warehouse_locations')
          .select('id, floor, zone')
          .in('id', locationIds);
      });
      
      // Get warehouse details
      const warehouseIds = [...new Set((locations || []).map(loc => loc.warehouse_id).filter(Boolean))];
      const { data: warehouses } = await executeQuery('warehouses', async (supabase) => {
        return await supabase
          .from('warehouses')
          .select('id, name')
          .in('id', warehouseIds);
      });
      
      // Create lookup maps
      const productMap = new Map();
      (products || []).forEach((p: any) => productMap.set(p.id, p));
      
      const userMap = new Map();
      (users || []).forEach((u: any) => userMap.set(u.id, u));
      
      const locationMap = new Map();
      (locations || []).forEach((l: any) => locationMap.set(l.id, l));
      
      const warehouseLocationMap = new Map();
      (warehouseLocations || []).forEach((wl: any) => warehouseLocationMap.set(wl.id, wl));
      
      const warehouseMap = new Map();
      (warehouses || []).forEach((w: any) => warehouseMap.set(w.id, w));
      
      // Transform the data
      return processedItems.map((item: any) => {
        const product = productMap.get(item.product_id) || {};
        const user = userMap.get(item.processed_by) || {};
        const location = locationMap.get(item.location_id) || {};
        const warehouseLocation = warehouseLocationMap.get(item.location_id) || {};
        const warehouse = warehouseMap.get(location.warehouse_id) || {};
        
        return {
          id: item.id || '',
          stock_out_detail_id: item.stock_out_detail_id || '',
          batch_item_id: item.batch_item_id || '',
          quantity: item.quantity || 0,
          processed_by: item.processed_by || '',
          processed_at: item.processed_at || '',
          notes: item.notes,
          barcode: item.barcode || 'Unknown',
          product_name: product.name || 'Unknown Product',
          product_sku: product.sku || 'No SKU',
          user_name: user.full_name || 'Unknown User',
          warehouse_name: warehouse.name || 'Unknown Warehouse',
          floor: warehouseLocation.floor,
          zone: warehouseLocation.zone || '',
          location_data: {
            warehouse_name: warehouse.name || 'Unknown Warehouse',
            floor: warehouseLocation.floor,
            zone: warehouseLocation.zone || ''
          }
        };
      });
    } catch (err: any) {
      console.error('Error fetching processed items:', err);
      toast.error('Failed to load processed items');
      return [];
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
        const { data, error } = await executeQuery('stock-out-history', async (supabase) => {
          // Direct query with minimal joins to avoid foreign key issues
          let query = supabase
            .from('stock_out')
            .select(`
              id,
              reference_number,
              customer_inquiry_id,
              status,
              created_at,
              processed_at,
              processed_by
            `)
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);
          
          // Apply filters
          if (searchTerm) {
            query = query.or(`reference_number.ilike.%${searchTerm}%`);
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
          
          return await query;
        });
        
        if (error) throw new Error(error.message);
        
        // Create a simplified version of the data
        const stockOutsWithDetails = (data || []).map((stockOut: any) => {
          return {
            id: stockOut.id,
            reference_number: stockOut.reference_number || '',
            customer_inquiry_id: stockOut.customer_inquiry_id || null,
            status: stockOut.status || 'unknown',
            created_at: stockOut.created_at || '',
            processed_at: stockOut.processed_at || null,
            processed_by: stockOut.processed_by || null,
            customer_name: '',  // Will be populated in UI if needed
            user_name: '',      // Will be populated in UI if needed
            processed_items: [] // Will be loaded on demand if needed
          };
        });
        
        return {
          stock_outs: stockOutsWithDetails as StockOutHistory[],
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
  
  // Get badge variant based on status
  const getStatusVariant = (status: string): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
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
  
  return (
    <DashboardLayout>
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
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.stock_outs?.length ? (
                    data.stock_outs.map((stockOut) => (
                      <TableRow key={stockOut.id}>
                        <TableCell className="font-medium">{stockOut.reference_number}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(stockOut.status)}>
                            {stockOut.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(stockOut.created_at)}</TableCell>
                        <TableCell>
                          <div className="relative group">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                if (stockOut.status === 'completed') {
                                  // Show loading state
                                  const loadingToast = toast.loading('Loading detailed information...');
                                  
                                  try {
                                    // Fetch detailed processed items
                                    const processedItems = await fetchProcessedItems(stockOut.id);
                                    
                                    // Update the stock-out with the fetched items
                                    setSelectedStockOut({
                                      ...stockOut,
                                      processed_items: processedItems
                                    });
                                    
                                    // Show success toast if items were found
                                    if (processedItems.length > 0) {
                                      toast.success(`Loaded ${processedItems.length} processed items`);
                                    } else {
                                      toast.info('No processed items found for this order');
                                    }
                                  } catch (error) {
                                    console.error('Error loading details:', error);
                                    toast.error('Failed to load detailed information');
                                  } finally {
                                    // Dismiss loading toast
                                    toast.dismiss(loadingToast);
                                  }
                                } else {
                                  // For non-completed orders, show a toast message
                                  toast.info(`Order ${stockOut.reference_number} is still ${stockOut.status}. Detailed information will be available when completed.`);
                                }
                              }}
                              className="relative group w-[120px] justify-center"
                            >
                              <div className="flex items-center">
                                <Eye className="mr-1 h-4 w-4" />
                                View Details
                              </div>
                              {stockOut.status !== 'completed' && (
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                                  Only completed orders have detailed item information
                                </div>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
                <DialogContent className="max-w-4xl p-6">
                  <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl font-semibold">Stock-Out Details - {selectedStockOut.reference_number}</DialogTitle>
                    <DialogDescription>
                      View detailed information about this stock-out order
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Reference Number</h3>
                        <p className="font-medium">{selectedStockOut.reference_number}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Status</h3>
                        <Badge variant={getStatusVariant(selectedStockOut.status)} className="mt-1">
                          {selectedStockOut.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                        <p className="font-medium">{selectedStockOut.customer_name || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Created Date</h3>
                        <p className="font-medium">{formatDate(selectedStockOut.created_at)}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Processed Date</h3>
                        <p className="font-medium">{selectedStockOut.processed_at ? formatDate(selectedStockOut.processed_at) : 'Not processed yet'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Processed By</h3>
                        <p className="font-medium">{selectedStockOut.user_name || 'Not processed yet'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Processed Items</h3>
                    {selectedStockOut.status === 'completed' ? (
                      selectedStockOut.processed_items && selectedStockOut.processed_items.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="font-medium">Product</TableHead>
                                <TableHead className="font-medium">Barcode</TableHead>
                                <TableHead className="font-medium">Quantity</TableHead>
                                <TableHead className="font-medium">Processed By</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedStockOut.processed_items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{item.product_name || 'Unknown Product'}</p>
                                      <p className="text-sm text-gray-500">{item.product_sku || 'No SKU'}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{item.barcode || 'N/A'}</Badge>
                                  </TableCell>
                                  <TableCell className="font-medium">{item.quantity}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{item.user_name || 'Unknown'}</p>
                                      <p className="text-sm text-gray-500">{item.user_role || 'Staff'}</p>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center p-6 border rounded-lg bg-gray-50">
                          <div className="mb-4">
                            <p className="text-lg font-medium">No processed items found</p>
                            <p className="text-sm text-gray-500">This order is marked as completed but no detailed item information was found.</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-6 border rounded-lg bg-gray-50">
                        <div className="mb-4">
                          <p className="text-lg font-medium">Detailed information unavailable</p>
                          <p className="text-sm text-gray-500 mt-1">
                            This order has a status of <Badge variant={getStatusVariant(selectedStockOut.status)}>{selectedStockOut.status}</Badge> and cannot be viewed in detail.
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Only completed orders have detailed item information.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter className="pt-2 border-t">
                    <Button onClick={() => setSelectedStockOut(null)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StockOutHistoryPage;
