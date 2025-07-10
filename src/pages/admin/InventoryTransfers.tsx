
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import TransferForm from '@/components/warehouse/TransferForm';
import TransferApprovalList from '@/components/warehouse/TransferApprovalList';
import TransferHistoryTable from '@/components/warehouse/TransferHistoryTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const AdminInventoryTransfers: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inventory Transfers" 
        description="Manage transfers between warehouses and locations across the organization"
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <Tabs defaultValue="new" className="w-full">
        <TabsList>
          <TabsTrigger value="new">New Transfer</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-6">
          <TransferForm />
        </TabsContent>
        <TabsContent value="pending" className="mt-6">
          <TransferApprovalList />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <TransferHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInventoryTransfers;
