import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { StockOutForm } from '@/components/admin/stockout/StockOutForm';
import { CreateStockOutForm } from '@/components/admin/stockout/CreateStockOutForm';
import { ProcessStockOutForm } from '@/components/admin/stockout/ProcessStockOutForm';
import { MobileBarcodeScanner } from '@/components/warehouse/MobileBarcodeScanner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface StockOutPageProps {
  initialBarcode?: string;
}

const StockOutPage: React.FC<StockOutPageProps> = ({ initialBarcode }) => {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockOut, setSelectedStockOut] = useState<any>(null);
  const [isProcessingDialogOpen, setIsProcessingDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // Fetch stock out requests
  const { data: stockOutRequests = [], isLoading } = useQuery({
    queryKey: ['stockOutRequests', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('stock_out_requests')
        .select(\`
          *,
          product:products(id, name, sku),
          customer:customers(id, name, company),
          created_by:profiles!stock_out_requests_created_by_fkey(id, full_name),
          warehouse:warehouses(id, name, code)
        \`)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(
          \`product.name.ilike.%\${searchTerm}%,product.sku.ilike.%\${searchTerm}%,customer.name.ilike.%\${searchTerm}%\`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleProcess = (stockOut: any) => {
    setSelectedStockOut(stockOut);
    setIsProcessingDialogOpen(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    setIsScannerOpen(false);
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      completed: { variant: 'success', label: 'Completed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const statusConfig = variants[status] || variants.pending;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Out Management"
        description="Process and manage stock out requests"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by product or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsScannerOpen(true)}>
            Scan Barcode
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Stock Out
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">Loading...</div>
          ) : stockOutRequests.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No stock out requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockOutRequests.map((stockOut: any) => (
                  <TableRow key={stockOut.id}>
                    <TableCell>
                      {format(new Date(stockOut.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{stockOut.product?.name}</div>
                      {stockOut.product?.sku && (
                        <div className="text-sm text-gray-500">SKU: {stockOut.product.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{stockOut.customer?.name}</div>
                      {stockOut.customer?.company && (
                        <div className="text-sm text-gray-500">{stockOut.customer.company}</div>
                      )}
                    </TableCell>
                    <TableCell>{stockOut.warehouse?.name}</TableCell>
                    <TableCell>{stockOut.quantity}</TableCell>
                    <TableCell>{getStatusBadge(stockOut.status)}</TableCell>
                    <TableCell>{stockOut.created_by?.full_name}</TableCell>
                    <TableCell>
                      {stockOut.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcess(stockOut)}
                        >
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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