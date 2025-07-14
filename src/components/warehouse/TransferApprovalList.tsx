
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

export const TransferApprovalList: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
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
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(transfer => ({
        id: transfer.id,
        source_warehouse_name: transfer.source_warehouse?.name || 'Unknown',
        source_zone: transfer.source_warehouse?.source_location?.[0]?.zone || null,
        source_floor: transfer.source_warehouse?.source_location?.[0]?.floor || null,
        destination_warehouse_name: transfer.destination_warehouse?.name || 'Unknown',
        destination_zone: transfer.destination_warehouse?.destination_location?.[0]?.zone || null,
        destination_floor: transfer.destination_warehouse?.destination_location?.[0]?.floor || null,
        status: transfer.status,
        created_at: transfer.created_at
      }));

      setTransfers(transformedData);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">In Transit</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Pending Transfers</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>
                <div>From</div>
                <div className="text-xs font-normal text-muted-foreground">Zone / Floor</div>
              </TableHead>
              <TableHead>
                <div>To</div>
                <div className="text-xs font-normal text-muted-foreground">Zone / Floor</div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>TR-{transfer.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div>{transfer.source_warehouse_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {transfer.source_zone && transfer.source_floor 
                      ? `${transfer.source_zone} / ${transfer.source_floor}`
                      : '—'}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{transfer.destination_warehouse_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {transfer.destination_zone && transfer.destination_floor 
                      ? `${transfer.destination_zone} / ${transfer.destination_floor}`
                      : '—'}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                <TableCell>{format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TransferApprovalList;
