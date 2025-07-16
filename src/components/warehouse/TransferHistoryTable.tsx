
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface WarehouseLocation {
  zone: string | null;
  floor: string | null;
}

interface RawTransfer {
  id: string;
  status: 'pending' | 'completed' | 'in_transit' | 'cancelled';
  created_at: string;
  source_warehouse: {
    name: string;
    source_location: WarehouseLocation[] | null;
  } | null;
  destination_warehouse: {
    name: string;
    destination_location: WarehouseLocation[] | null;
  } | null;
}

interface Transfer {
  id: string;
  source_warehouse_name: string;
  source_zone: string | null;
  source_floor: string | null;
  destination_warehouse_name: string;
  destination_zone: string | null;
  destination_floor: string | null;
  status: 'pending' | 'completed' | 'in_transit' | 'cancelled';
  created_at: string;
}

export const TransferHistoryTable: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransferHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select(`
          id,
          status,
          created_at,
          source_warehouse:warehouses!inventory_transfers_source_warehouse_id_fkey(
            name,
            source_location:warehouse_locations(
              zone,
              floor
            )
          ),
          destination_warehouse:warehouses!inventory_transfers_destination_warehouse_id_fkey(
            name,
            destination_location:warehouse_locations(
              zone,
              floor
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: Transfer[] = (data || []).map(transfer => {
        const rawTransfer = transfer as unknown as RawTransfer;
        return {
          id: rawTransfer.id,
          source_warehouse_name: rawTransfer.source_warehouse?.name || 'Unknown',
          source_zone: rawTransfer.source_warehouse?.source_location?.[0]?.zone || null,
          source_floor: rawTransfer.source_warehouse?.source_location?.[0]?.floor || null,
          destination_warehouse_name: rawTransfer.destination_warehouse?.name || 'Unknown',
          destination_zone: rawTransfer.destination_warehouse?.destination_location?.[0]?.zone || null,
          destination_floor: rawTransfer.destination_warehouse?.destination_location?.[0]?.floor || null,
          status: rawTransfer.status,
          created_at: rawTransfer.created_at
        };
      });

      setTransfers(transformedData);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      toast.error('Failed to load transfer history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferHistory();
  }, []);

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle>Transfer History</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Warehouse locations are shown as: Warehouse Name (Zone). For example: "Main Warehouse (Zone A)"
        </p>
        <p className="text-sm text-muted-foreground">
          Transfer IDs follow the format: TRF + Date + Number (e.g., TRF2403200001 = First transfer on March 20, 2024)
        </p>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {transfers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transfer history found</p>
          </div>
        ) : (
          <>
            {/* Desktop/tablet view */}
            <div className="hidden sm:block relative">
              <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden rounded-md border">
                    <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Transfer ID</TableHead>
                          <TableHead className="whitespace-nowrap hidden md:table-cell">From Warehouse</TableHead>
                          <TableHead className="whitespace-nowrap hidden md:table-cell">To Warehouse</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfers.map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-mono text-sm">
                              {transfer.id}
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-[120px]" title={transfer.source_warehouse_name}>
                              {transfer.source_warehouse_name}
                              {transfer.source_zone && ` (${transfer.source_zone})`}
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-[120px]" title={transfer.destination_warehouse_name}>
                              {transfer.destination_warehouse_name}
                              {transfer.destination_zone && ` (${transfer.destination_zone})`}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  transfer.status === 'completed' ? 'bg-green-500' :
                                  transfer.status === 'in_transit' ? 'bg-blue-500' :
                                  transfer.status === 'pending' ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }
                              >
                                {transfer.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(transfer.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden space-y-4 px-1">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-mono text-sm font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {transfer.id}
                    </div>
                    <Badge 
                      className={
                        transfer.status === 'completed' ? 'bg-green-500 text-white' :
                        transfer.status === 'in_transit' ? 'bg-blue-500 text-white' :
                        transfer.status === 'pending' ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      }
                    >
                      {transfer.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">From Warehouse</span>
                      <span className="text-sm font-medium truncate block">{transfer.source_warehouse_name}</span>
                      {transfer.source_zone && <span className="text-xs text-muted-foreground"> ({transfer.source_zone})</span>}
                    </div>
                    
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">To Warehouse</span>
                      <span className="text-sm font-medium truncate block">{transfer.destination_warehouse_name}</span>
                      {transfer.destination_zone && <span className="text-xs text-muted-foreground"> ({transfer.destination_zone})</span>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm border-t pt-3 dark:border-gray-700">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Date</span>
                      <span className="text-sm font-medium">
                        {new Date(transfer.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TransferHistoryTable;
