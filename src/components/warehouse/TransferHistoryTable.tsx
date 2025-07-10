
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Transfer {
  id: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  status: 'pending' | 'completed' | 'in_transit' | 'cancelled';
  created_at: string;
  updated_at: string;
  initiated_by: string;
}

export const TransferHistoryTable: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetchTransferHistory();
  }, []);

  const fetchTransferHistory = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfer history:', error);
        toast.error('Error', {
          description: 'Failed to fetch transfer history'
        });
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error', {
        description: 'Failed to fetch transfer history'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer History</CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transfer history found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer ID</TableHead>
                  <TableHead>From Warehouse</TableHead>
                  <TableHead>To Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Initiated By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm">
                      {transfer.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {transfer.source_warehouse_id}
                    </TableCell>
                    <TableCell>
                      {transfer.destination_warehouse_id}
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
                    <TableCell>
                      {transfer.initiated_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransferHistoryTable;
