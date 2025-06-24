
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from 'lucide-react';
import { StockOutWithProduct } from '@/types/common';
import { StockOutTable } from '@/components/stock-out/StockOutTable';
import { CreateStockOutForm } from '@/components/stock-out/CreateStockOutForm';
import { ProcessStockOutForm } from '@/components/stock-out/ProcessStockOutForm';
import { useStockOutOperations } from '@/hooks/useStockOutOperations';

const StockOutPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'approved' | 'rejected' | 'completed' | 'processing'>('');
  const [selectedStockOut, setSelectedStockOut] = useState<StockOutWithProduct | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);

  const {
    createStockOut,
    updateStockOut,
    deleteStockOut,
    isCreating,
    isUpdating,
  } = useStockOutOperations();

  const { data: stockOuts, isLoading, error } = useQuery({
    queryKey: ['stock-outs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_out')
        .select(`
          *,
          product:products(
            id,
            name,
            sku,
            description,
            hsn_code,
            gst_rate,
            category,
            barcode,
            unit,
            min_stock_level,
            is_active,
            gst_category,
            image_url,
            created_at,
            updated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stock outs:', error);
        throw error;
      }
      
      // Transform data to match expected type
      return (data || []).map(item => ({
        ...item,
        product_id: item.product?.[0]?.id || '',
        quantity: 0, // Default value since not in database
        product: item.product?.[0] || { 
          id: '', 
          name: '',
          sku: '',
          description: '',
          hsn_code: '',
          gst_rate: 0,
          category: '',
          barcode: '',
          unit: '',
          min_stock_level: 0,
          is_active: true,
          gst_category: '',
          image_url: '',
          created_at: '',
          updated_at: ''
        }
      })) as StockOutWithProduct[];
    },
  });

  const handleCreateStockOut = async (stockOutData: any) => {
    createStockOut(stockOutData);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateStockOut = async (stockOutData: any) => {
    updateStockOut(stockOutData);
    setIsProcessDialogOpen(false);
  };

  const handleDeleteStockOut = async (id: string) => {
    deleteStockOut(id);
  };

  const handleEditStockOut = (stockOut: StockOutWithProduct) => {
    setSelectedStockOut(stockOut);
    setIsProcessDialogOpen(true);
  };

  const filteredStockOuts = stockOuts?.filter(stockOut => {
    const matchesSearch = stockOut.destination?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === '' || stockOut.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Outs" description="Manage stock out requests" />
      
      <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Search by destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Stock Out
        </Button>
      </div>

      {isLoading ? (
        <p>Loading stock outs...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <StockOutTable
          stockOuts={filteredStockOuts}
          onEdit={handleEditStockOut}
          onDelete={handleDeleteStockOut}
        />
      )}

      {/* Create Stock Out Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Stock Out</DialogTitle>
            <DialogDescription>Fill in the details to create a new stock out request.</DialogDescription>
          </DialogHeader>
          <CreateStockOutForm
            onCreate={handleCreateStockOut}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={isCreating}
            userId={user?.id}
          />
        </DialogContent>
      </Dialog>

      {/* Process Stock Out Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Stock Out</DialogTitle>
            <DialogDescription>Update the details of the stock out request.</DialogDescription>
          </DialogHeader>
          <ProcessStockOutForm
            stockOut={selectedStockOut}
            onUpdate={handleUpdateStockOut}
            onCancel={() => setIsProcessDialogOpen(false)}
            isLoading={isUpdating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockOutPage;
