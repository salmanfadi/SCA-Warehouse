import React, { useState } from 'react';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Search, Filter } from 'lucide-react';
import { SalesInquiry } from '@/types/inquiries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InquiryManagementProps {
  inquiries: SalesInquiry[];
  isLoading: boolean;
  searchTerm: string;
  statusFilter: string;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  updateInquiryStatus: (id: string, status: string) => Promise<void>;
  convertInquiryToOrder: (inquiry: SalesInquiry) => Promise<boolean>;
  formatDate: (date: string) => string;
  refreshInquiries: () => void;
}

export const InquiryManagement: React.FC<InquiryManagementProps> = ({
  inquiries,
  isLoading,
  searchTerm,
  statusFilter,
  setSearchTerm,
  setStatusFilter,
  updateInquiryStatus,
  convertInquiryToOrder,
  formatDate,
  refreshInquiries
}) => {
  const [selectedInquiry, setSelectedInquiry] = useState<SalesInquiry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRowClick = (inquiry: SalesInquiry) => {
    setSelectedInquiry(inquiry);
    setIsDetailsOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshInquiries();
    setIsRefreshing(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateInquiryStatus(id, status);
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry({
          ...selectedInquiry,
          status
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleConvertToOrder = async () => {
    if (!selectedInquiry) return;
    
    setIsProcessing(true);
    try {
      const success = await convertInquiryToOrder(selectedInquiry);
      if (success) {
        setIsDetailsOpen(false);
        handleRefresh();
      }
    } catch (error) {
      console.error('Error converting to order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch = 
      inquiry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.customer_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Customer Inquiries</CardTitle>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inquiries found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inquiry) => (
                    <TableRow 
                      key={inquiry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(inquiry)}
                    >
                      <TableCell className="font-medium">{inquiry.id.substring(0, 8)}</TableCell>
                      <TableCell>{inquiry.customer_name}</TableCell>
                      <TableCell>{inquiry.customer_company}</TableCell>
                      <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                      <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inquiry Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Inquiry Details</DialogTitle>
            <DialogDescription>
              View and manage customer inquiry
            </DialogDescription>
          </DialogHeader>
          
          {selectedInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-sm text-muted-foreground">Name:</div>
                    <div>{selectedInquiry.customer_name}</div>
                    <div className="text-sm text-muted-foreground">Email:</div>
                    <div>{selectedInquiry.customer_email}</div>
                    <div className="text-sm text-muted-foreground">Company:</div>
                    <div>{selectedInquiry.customer_company}</div>
                    <div className="text-sm text-muted-foreground">Phone:</div>
                    <div>{selectedInquiry.customer_phone}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Inquiry Details</h3>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-sm text-muted-foreground">ID:</div>
                    <div>{selectedInquiry.id}</div>
                    <div className="text-sm text-muted-foreground">Date:</div>
                    <div>{formatDate(selectedInquiry.created_at)}</div>
                    <div className="text-sm text-muted-foreground">Status:</div>
                    <div>{getStatusBadge(selectedInquiry.status)}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Message</h3>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Change Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedInquiry.id, 'pending')}
                    disabled={selectedInquiry.status === 'pending'}
                  >
                    Mark as Pending
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedInquiry.id, 'in_progress')}
                    disabled={selectedInquiry.status === 'in_progress'}
                  >
                    Mark as In Progress
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedInquiry.id, 'completed')}
                    disabled={selectedInquiry.status === 'completed'}
                  >
                    Mark as Completed
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedInquiry.id, 'rejected')}
                    disabled={selectedInquiry.status === 'rejected'}
                  >
                    Mark as Rejected
                  </Button>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="default"
                  onClick={handleConvertToOrder}
                  disabled={isProcessing || selectedInquiry.status === 'completed'}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Convert to Order'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
