import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import TransferForm from '@/components/warehouse/TransferForm';
import TransferApprovalList from '@/components/warehouse/TransferApprovalList';
import TransferHistoryTable from '@/components/warehouse/TransferHistoryTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const InventoryTransfers: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <PageHeader 
        description="Manage inventory transfers."
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/manager')}
        className="flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="new" className="flex items-center justify-center">
            <span className="truncate">New Transfer</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center justify-center">
            <span className="truncate">Pending Approval</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center justify-center">
            <span className="truncate">Transfer History</span>
          </TabsTrigger>
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

// Add explicit named export
export { InventoryTransfers };

// Keep the default export
export default InventoryTransfers;
