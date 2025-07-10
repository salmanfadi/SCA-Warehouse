
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Transfer {
  id: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  status: 'pending' | 'completed' | 'in_transit' | 'cancelled';
  created_at: string;
  updated_at: string;
  initiated_by: string;
}

interface TransferApprovalListProps {
  onRefresh?: () => void;
}

export const TransferApprovalList: React.FC<TransferApprovalListProps> = ({ onRefresh }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingTransfers, setProcessingTransfers] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    fetchPendingTransfers();
  }, []);

  const fetchPendingTransfers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_transfers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
        toast.error('Error', {
          description: 'Failed to fetch pending transfers'
        });
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error', {
        description: 'Failed to fetch transfer data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (transferId: string, action: 'approve' | 'reject') => {
    setProcessingTransfers(prev => new Set(prev).add(transferId));
    
    try {
      const newStatus = action === 'approve' ? 'in_transit' : 'cancelled';
      
      const { error } = await supabase
        .from('inventory_transfers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;

      toast.success(`Transfer has been ${action === 'approve' ? 'approved and is now in transit' : 'rejected'}`);
      toast.success(`Transfer ${action === 'approve' ? 'Approved' : 'Rejected'}`, {
        description: `Transfer has been ${action === 'approve' ? 'approved and is now in transit' : 'rejected'}`
      });

      // Refresh the list
      await fetchPendingTransfers();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(`Error ${action}ing transfer:`, error);
      toast.error('Error', {
        description: `Failed to ${action} transfer`
      });
    } finally {
      setProcessingTransfers(prev => {
        const newSet = new Set(prev);
        newSet.delete(transferId);
        return newSet;
      });
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Transfer Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pending transfers requiring approval</p>
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
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
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
                      <Badge variant="outline">
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(transfer.created_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">by {transfer.initiated_by}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproval(transfer.id, 'approve')}
                          disabled={processingTransfers.has(transfer.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproval(transfer.id, 'reject')}
                          disabled={processingTransfers.has(transfer.id)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
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

export default TransferApprovalList;
