
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

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
      <CardHeader className="px-3 sm:px-6">
        <CardTitle>Transfer History</CardTitle>
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
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">Initiated By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfers.map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-mono text-sm">
                              {transfer.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-[120px]" title={transfer.source_warehouse_id}>
                              {transfer.source_warehouse_id}
                            </TableCell>
                            <TableCell className="hidden md:table-cell truncate max-w-[120px]" title={transfer.destination_warehouse_id}>
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
                            <TableCell className="hidden lg:table-cell truncate max-w-[120px]" title={transfer.initiated_by}>
                              {transfer.initiated_by}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              {/* Scroll hints */}
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 h-full w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent opacity-75" />
              <div className="pointer-events-none absolute top-0 left-0 bottom-0 h-full w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent opacity-75" />
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden space-y-4 px-1">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-mono text-sm font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {transfer.id.substring(0, 8)}...
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
                      <span className="text-sm font-medium truncate block">{transfer.source_warehouse_id}</span>
                    </div>
                    
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">To Warehouse</span>
                      <span className="text-sm font-medium truncate block">{transfer.destination_warehouse_id}</span>
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
                    
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block mb-1">Initiated By</span>
                      <span className="text-sm font-medium truncate block max-w-[140px]">{transfer.initiated_by}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
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
