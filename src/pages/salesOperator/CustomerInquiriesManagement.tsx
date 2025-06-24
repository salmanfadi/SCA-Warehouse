import { useState } from 'react';
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
import { Loader2, RefreshCw, Search } from 'lucide-react';

export default function CustomerInquiriesManagement() {
  const { inquiries, isLoading, refetch, getInquiryItems, moveToOrders } = useCustomerInquiries();
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);
  const [inquiryItems, setInquiryItems] = useState<CustomerInquiryItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredInquiries = inquiries?.filter(inquiry => 
    inquiry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Loading inquiries...</p>
                  </TableCell>
                </TableRow>
              ) : filteredInquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-sm text-gray-500">No customer inquiries found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <TableRow 
                    key={inquiry.id} 
                    onClick={() => handleRowClick(inquiry)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                    <TableCell>{inquiry.customer_name}</TableCell>
                    <TableCell>{inquiry.customer_email}</TableCell>
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
        </CardContent>
      </Card>

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
