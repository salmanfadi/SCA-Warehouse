
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { StockInRequestsTable } from '@/components/warehouse/StockInRequestsTable';
import { useStockInRequests, StockInRequestData } from '@/hooks/useStockInRequests';
import { useAuth } from '@/context/AuthContext';
import BatchStockInPage from './BatchStockInPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RejectStockInDialog } from '@/components/warehouse/RejectStockInDialog';
import { supabase } from '@/integrations/supabase/client';

const AdminStockInManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedStockIn, setSelectedStockIn] = useState<StockInRequestData | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [activeTab, setActiveTab] = useState('pending');
  const { stockInId } = useParams<{ stockInId?: string }>();

  const { 
    data: stockInRequests, 
    isLoading, 
    error,
    refetch
  } = useStockInRequests({
    status: statusFilter,
    includeDetails: true
  });

  const queryClient = useQueryClient();

  const { mutateAsync: approveStockIn } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_in')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockInRequests'] });
      refetch();
    },
  });

  const { mutateAsync: rejectStockIn } = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('stock_in')
        .update({ 
          status: 'rejected',
          rejection_reason: reason 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockInRequests'] });
      refetch();
    },
  });

  const handleReject = (stockIn: StockInRequestData) => {
    setSelectedStockIn(stockIn);
    setIsRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedStockIn) return;
    
    try {
      await rejectStockIn({ id: selectedStockIn.id, reason });
      toast.success('Stock-in request rejected successfully');
      refetch();
    } catch (error) {
      console.error('Error rejecting stock-in:', error);
      toast.error('Failed to reject stock-in request');
    } finally {
      setIsRejectDialogOpen(false);
    }
  };

  const handleApprove = async (stockIn: StockInRequestData) => {
    try {
      await approveStockIn(stockIn.id);
      toast.success('Stock-in request approved successfully');
      refetch();
    } catch (error) {
      console.error('Error approving stock-in:', error);
      toast.error('Failed to approve stock-in request');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setStatusFilter(value === 'all' ? '' : value);
  };

  // If we're viewing a specific stock-in in batch mode
  if (stockInId) {
    return <BatchStockInPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <PageHeader 
            title="Stock-In Management"
            description="Manage and process incoming stock requests"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate('/admin/stock-in/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Stock-In
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock-In Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <StockInRequestsTable 
                status={statusFilter}
                filters={{}}
                userId={user?.id}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

<RejectStockInDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        selectedStockIn={selectedStockIn}
        userId={user?.id}
      />
    </div>
  );
};

export default AdminStockInManagement;
