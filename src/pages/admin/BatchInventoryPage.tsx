import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProcessedBatchWithItems {
  id: string;
  batch_number: string;
  product_id: string;
  processed_by: string;
  total_quantity: number;
  total_boxes: number;
  status: string;
  processed_at: string;
  warehouse_id: string;
  location_id: string;
  notes: string;
  products: {
    name: string;
    sku: string;
    hsn_code?: string | null;
    gst_rate?: number | null;
  };
  warehouses: {
    name: string;
  };
  warehouse_locations: {
    zone: string;
    floor?: string | null;
  };
  batch_items: Array<{
    id: string;
    barcode: string;
    quantity: number;
    status: string;
  }>;
}

const BatchInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: processedBatchesWithItems = [], isLoading } = useQuery({
    queryKey: ['processed-batches-with-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processed_batches')
        .select(`
          *,
          products (
            name,
            sku,
            hsn_code,
            gst_rate
          ),
          warehouses (
            name
          ),
          warehouse_locations (
            zone,
            floor
          ),
          batch_items (
            id,
            barcode,
            quantity,
            status
          )
        `)
        .order('processed_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface, handling potential errors
      return (data || []).map(batch => ({
        ...batch,
        products: batch.products || { name: 'Unknown', sku: 'Unknown' },
        warehouses: batch.warehouses || { name: 'Unknown' },
        warehouse_locations: batch.warehouse_locations || { zone: 'Unknown', floor: null },
        batch_items: batch.batch_items || []
      })) as ProcessedBatchWithItems[];
    },
  });

  const filteredBatches = processedBatchesWithItems.filter(batch => {
    const matchesSearch = !searchTerm || 
      batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Batch Inventory" 
          description="View detailed batch inventory with items and HSN information"
        />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Batch Inventory" 
        description="View detailed batch inventory with items and HSN information"
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by batch, product, SKU, or HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Inventory with Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.products?.name}</div>
                        <div className="text-sm text-gray-500">SKU: {batch.products?.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{batch.products?.hsn_code || '-'}</TableCell>
                    <TableCell>
                      {batch.products?.gst_rate !== null ? `${batch.products?.gst_rate}%` : '-'}
                    </TableCell>
                    <TableCell>{batch.batch_items?.length || 0}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.warehouses?.name}</div>
                        <div className="text-sm text-gray-500">
                          {batch.warehouse_locations?.floor && `Floor ${batch.warehouse_locations.floor}, `}
                          Zone {batch.warehouse_locations?.zone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      {new Date(batch.processed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Items
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchInventoryPage;
