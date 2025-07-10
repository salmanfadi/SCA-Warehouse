
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, MapPin } from 'lucide-react';

interface BatchItemType {
  id: string;
  barcode: string;
  quantity: number;
  status: string;
  color?: string;
  size?: string;
  warehouses?: {
    id: string;
    name: string;
  } | null;
  warehouse_locations?: {
    floor: string;
    zone: string;
  } | null;
}

const BarcodeManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: batchItems, isLoading, error } = useQuery({
    queryKey: ['batch-items-with-barcodes', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('batch_items')
        .select(`
          id,
          barcode,
          quantity,
          status,
          color,
          size,
          warehouses (
            id,
            name
          ),
          warehouse_locations (
            floor,
            zone
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('barcode', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as BatchItemType[];
    },
  });

  const filteredItems = batchItems?.filter(item => 
    !searchTerm || 
    item.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Barcode Management" 
          description="Manage and view barcode assignments"
        />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Barcode Management" 
          description="Manage and view barcode assignments"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Error loading barcodes: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Barcode Management" 
        description="Manage and view barcode assignments"
      />
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredItems?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center">No barcodes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredItems?.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-mono">
                    {item.barcode}
                  </CardTitle>
                  <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Package className="h-4 w-4 mr-2" />
                      Item Details
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Quantity:</strong> {item.quantity}</p>
                      {item.color && <p className="text-sm"><strong>Color:</strong> {item.color}</p>}
                      {item.size && <p className="text-sm"><strong>Size:</strong> {item.size}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><strong>Warehouse:</strong> {item.warehouses?.name || 'N/A'}</p>
                      <p className="text-sm"><strong>Floor:</strong> {item.warehouse_locations?.floor || 'N/A'}</p>
                      <p className="text-sm"><strong>Zone:</strong> {item.warehouse_locations?.zone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    Edit Barcode
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BarcodeManagement;
