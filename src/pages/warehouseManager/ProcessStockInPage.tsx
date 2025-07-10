
import React from 'react';
import { useParams } from 'react-router-dom';
import { StockInDetailView } from '@/components/warehouse/StockInDetailView';
import { StockInApprovalForm } from '@/components/warehouse/StockInApprovalForm';
import { useStockInProcessing } from '@/hooks/useStockInProcessing';

const ProcessStockInPage: React.FC = () => {
  const { stockInId } = useParams<{ stockInId: string }>();
  
  const {
    stockInData,
    currentStockIn,
    details,
    approvalNotes,
    setApprovalNotes,
    handleApproval,
    isSubmitting,
    navigate
  } = useStockInProcessing(stockInId);

  if (stockInData.loading) {
    return <div className="p-4">Loading stock in details...</div>;
  }

  if (stockInData.error) {
    return <div className="p-4 text-red-500">Error: {stockInData.error.message}</div>;
  }

  if (!currentStockIn) {
    return <div className="p-4 text-red-500">Stock in not found</div>;
  }

  // Convert StockInWithDetails to ProcessableStockIn for the component
  const processableStockIn = {
    id: currentStockIn.id,
    boxes: currentStockIn.boxes,
    status: currentStockIn.status,
    created_at: currentStockIn.created_at || "",
    source: currentStockIn.source,
    notes: currentStockIn.notes,
    product: currentStockIn.product || { 
      id: currentStockIn.product_id,
      name: "Unknown Product" 
    },
    submitter: {
      id: currentStockIn.submitter?.id || currentStockIn.submitted_by,
      // Ensure name is always a string as required by ProcessableStockIn
      name: currentStockIn.submitter?.name || "Unknown User",
      username: currentStockIn.submitter?.username || "unknown"
    },
    processed_by: currentStockIn.processed_by,
    batch_id: undefined,
    processing_started_at: undefined,
    processing_completed_at: undefined
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Process Stock In</h1>
      
      <StockInDetailView
        stockIn={processableStockIn}
        details={details}
        isLoading={stockInData.loading}
      />
      
      <StockInApprovalForm
        approvalNotes={approvalNotes}
        setApprovalNotes={setApprovalNotes}
        onApprove={() => handleApproval(true)}
        onReject={() => handleApproval(false)}
        onCancel={() => navigate('/manager/stock-in')}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ProcessStockInPage;
