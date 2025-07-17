import { useState, useEffect } from 'react';
import { useCustomerInquiries } from '@/hooks/useCustomerInquiries';
import { CustomerInquiry, CustomerInquiryItem } from '@/types/inquiries';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';

export default function CustomerInquiriesManagement() {
  const { inquiries, isLoading, refetch, getInquiryItems, getInquiryItemsCount, moveToOrders } = useCustomerInquiries();
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);
  const [inquiryItems, setInquiryItems] = useState<CustomerInquiryItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsCountMap, setItemsCountMap] = useState<Record<string, { count: number, items: Array<{ name: string, quantity: number }> }>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Changed from 20 to 15 items per page

  const handleRowClick = async (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry);
    try {
      const items = await getInquiryItems(inquiry.id);
      setInquiryItems(items);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching inquiry items:', error);
    }
  };

  const handleMoveToOrders = async (inquiryId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    try {
      await moveToOrders.mutateAsync(inquiryId);
    } catch (error) {
      console.error('Error moving inquiry to orders:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'finalizing':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Finalizing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Fetch items count for all inquiries when inquiries data is loaded
  useEffect(() => {
    if (inquiries && inquiries.length > 0) {
      const fetchItemsCount = async () => {
        try {
          const inquiryIds = inquiries.map(inquiry => inquiry.id);
          const itemsData = await getInquiryItemsCount(inquiryIds);
          setItemsCountMap(itemsData);
        } catch (error) {
          console.error('Error fetching inquiry items count:', error);
        }
      };
      fetchItemsCount();
    }
  }, [inquiries, getInquiryItemsCount]);

  const filteredInquiries = inquiries?.filter(inquiry => 
    inquiry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inquiry.sales_order_number && inquiry.sales_order_number.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInquiries = filteredInquiries.slice(startIndex, endIndex);
  
  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customer Inquiries</h1>
          <p className="text-gray-500">Manage and respond to customer inquiries</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search inquiries..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="w-full max-w-full overflow-hidden">
        <CardContent className="p-0 overflow-hidden">
          {/* Table for desktop/tablet */}
          <div className="hidden sm:block relative overflow-hidden w-full">
            {/* Using overflow-hidden and w-full to eliminate all scroll bars */}
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                <TableHead className="w-[15%]">Sales Order #</TableHead>
                  <TableHead className="w-[15%]">Date</TableHead>
                  <TableHead className="w-[15%]">Customer Name</TableHead>
                  <TableHead className="w-[20%]">Email</TableHead>
                  <TableHead className="w-[10%]">Items</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[15%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Loading inquiries...</p>
                    </TableCell>
                  </TableRow>
                ) : currentInquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-sm text-gray-500">No customer inquiries found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentInquiries.map((inquiry) => (
                    <TableRow 
                      key={inquiry.id} 
                      onClick={() => handleRowClick(inquiry)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell>
                        {inquiry.sales_order_number ? (
                          <span className="font-mono text-sm">{inquiry.sales_order_number}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                      <TableCell>{inquiry.customer_name}</TableCell>
                      <TableCell>{inquiry.customer_email}</TableCell>
                      <TableCell>
                        <div className="relative group">
                          <span className="font-medium">{itemsCountMap[inquiry.id]?.count || 0}</span>
                          {itemsCountMap[inquiry.id]?.count > 0 && (
                            <div className="absolute z-50 invisible group-hover:visible bg-white shadow-lg rounded-md p-3 w-64 mt-1 left-0">
                              <div className="text-sm font-medium mb-1">Products:</div>
                              <ul className="space-y-1">
                                {itemsCountMap[inquiry.id]?.items.map((item, idx) => (
                                  <li key={idx} className="text-sm">
                                    {item.name} <span className="font-medium">({item.quantity})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                      <TableCell>
                        {inquiry.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={(e) => handleMoveToOrders(inquiry.id, e)}
                            disabled={moveToOrders.isPending}
                          >
                            {moveToOrders.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing
                              </>
                            ) : (
                              'Move to Orders'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Stacked card view for mobile */}
          <div className="sm:hidden flex flex-col gap-4 p-4 overflow-hidden w-full max-w-full">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading inquiries...</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No customer inquiries found.</p>
              </div>
            ) : (
              currentInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="rounded-lg border p-4 shadow-sm bg-white cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRowClick(inquiry)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">{formatDate(inquiry.created_at)}</span>
                    {getStatusBadge(inquiry.status)}
                  </div>
                  <div className="font-semibold text-base mb-1">{inquiry.customer_name}</div>
                  <div className="text-sm text-gray-700 mb-1">{inquiry.customer_email}</div>
                  
                  <div className="flex justify-between items-center mt-2 mb-2">
                    <div className="relative group">
                      <div className="flex items-center">
                        <span className="text-sm font-medium mr-1">Items:</span>
                        <span className="text-sm">{itemsCountMap[inquiry.id]?.count || 0}</span>
                      </div>
                      {itemsCountMap[inquiry.id]?.count > 0 && (
                        <div className="absolute z-50 invisible group-hover:visible bg-white shadow-lg rounded-md p-3 w-64 mt-1 left-0">
                          <div className="text-sm font-medium mb-1">Products:</div>
                          <ul className="space-y-1">
                            {itemsCountMap[inquiry.id]?.items.map((item, idx) => (
                              <li key={idx} className="text-sm">
                                {item.name} <span className="font-medium">({item.quantity})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium mr-1">SO#:</span>
                      {inquiry.sales_order_number ? (
                        <span className="text-sm font-mono">{inquiry.sales_order_number}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Not assigned</span>
                      )}
                    </div>
                  </div>
                  {inquiry.status === 'pending' && (
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={(e) => handleMoveToOrders(inquiry.id, e)}
                      disabled={moveToOrders.isPending}
                    >
                      {moveToOrders.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing
                        </>
                      ) : (
                        'Move to Orders'
                      )}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredInquiries.length)} of {filteredInquiries.length} inquiries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              {selectedInquiry && (
                <div className="text-sm text-gray-500">
                  From {selectedInquiry.customer_name} ({selectedInquiry.customer_email})
                  <br />
                  Received on {formatDate(selectedInquiry.created_at)}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <>
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-medium">Status</h3>
                  <div className="mt-1">{getStatusBadge(selectedInquiry.status)}</div>
                </div>

                {selectedInquiry.message && (
                  <div>
                    <h3 className="text-sm font-medium">Message</h3>
                    <p className="mt-1 text-sm">{selectedInquiry.message}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium">Requested Products</h3>
                  {inquiryItems.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-1">No products requested</p>
                  ) : (
                    <div className="mt-2 space-y-4">
                      {inquiryItems.map((item) => (
                        <Card key={item.id} className="overflow-hidden">
                          <div className="flex">
                            {item.image_url && (
                              <div className="w-24 h-24 flex-shrink-0">
                                <img 
                                  src={item.image_url} 
                                  alt={item.product_name} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardContent className="p-4 flex-1">
                              <div className="flex justify-between">
                                <div>
                                  <h4 className="font-medium">{item.product_name}</h4>
                                  <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">Qty: {item.quantity}</p>
                                  {item.price && (
                                    <p className="text-sm">Price: ${Number(item.price).toFixed(2)}</p>
                                  )}
                                </div>
                              </div>
                              {item.specific_requirements && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Requirements:</span> {item.specific_requirements}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {selectedInquiry.status === 'pending' && (
                  <Button 
                    onClick={() => {
                      moveToOrders.mutate(selectedInquiry.id);
                      setIsDetailsOpen(false);
                    }}
                    disabled={moveToOrders.isPending}
                  >
                    {moveToOrders.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </>
                    ) : (
                      'Move to Orders'
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
