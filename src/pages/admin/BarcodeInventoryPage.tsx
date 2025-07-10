
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download } from 'lucide-react';
import BarcodeInventoryTable from '@/components/barcode/BarcodeInventoryTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProcessedBatchType {
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
  } | null;
  warehouses: {
    name: string;
  } | null;
  warehouse_locations: {
    zone: string;
    floor?: string | null;
  } | null;
}

const BarcodeInventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: processedBatches = [], isLoading } = useQuery({
    queryKey: ['processed-batches-barcode'],
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
          )
        `)
        .order('processed_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface, handling potential errors
      return (data || []).map(batch => ({
        ...batch,
        products: batch.products || { name: 'Unknown', sku: 'Unknown', hsn_code: null, gst_rate: null },
        warehouses: batch.warehouses || { name: 'Unknown' },
        warehouse_locations: batch.warehouse_locations || { zone: 'Unknown', floor: null }
      })) as ProcessedBatchType[];
    },
  });

  const filteredBatches = processedBatches.filter(batch => {
    const matchesSearch = !searchTerm || 
      batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.products?.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Barcode Inventory" 
        description="View and manage barcode-based inventory with HSN and GST information"
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
          <CardTitle>Processed Batches with HSN Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBatches.map((batch) => (
              <div key={batch.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-lg">{batch.products?.name || 'Unknown Product'}</h4>
                    <p className="text-sm text-gray-600">SKU: {batch.products?.sku || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Batch: {batch.batch_number || batch.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">HSN Code:</span> {batch.products?.hsn_code || 'Not Set'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">GST Rate:</span> {batch.products?.gst_rate ? `${batch.products.gst_rate}%` : 'Not Set'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Quantity:</span> {batch.total_quantity} units ({batch.total_boxes} boxes)
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Warehouse:</span> {batch.warehouses?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Location:</span> {batch.warehouse_locations?.zone || 'Unknown'} 
                      {batch.warehouse_locations?.floor && `, Floor ${batch.warehouse_locations.floor}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        batch.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {batch.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredBatches.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No inventory items found matching your search criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarcodeInventoryPage;
