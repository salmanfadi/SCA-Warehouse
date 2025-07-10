
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StockInDetailView } from '@/components/warehouse/StockInDetailView';
import { StockInApprovalForm } from '@/components/warehouse/StockInApprovalForm';
import { useStockInProcessing } from '@/hooks/useStockInProcessing';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const StockInDetailsPage: React.FC = () => {
  const { stockInId } = useParams<{ stockInId: string }>();
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const {
    stockInData,
    currentStockIn,
    details,
    detailsTotalCount,
    approvalNotes,
    setApprovalNotes,
    handleApproval,
    isSubmitting,
    navigate
  } = useStockInProcessing(stockInId, page, pageSize);

  if (stockInData.loading) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stockInData.error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {stockInData.error instanceof Error 
            ? stockInData.error.message 
            : 'Failed to load stock-in details'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!currentStockIn) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>The requested stock-in record could not be found.</AlertDescription>
      </Alert>
    );
  }

  const totalPages = Math.ceil(detailsTotalCount / pageSize);

  // Map currentStockIn to ProcessableStockIn for StockInDetailView
  const processableStockIn = {
    id: currentStockIn.id,
    boxes: currentStockIn.boxes,
    status: currentStockIn.status,
    created_at: currentStockIn.created_at || '',
    source: currentStockIn.source,
    notes: currentStockIn.notes,
    product: currentStockIn.product || { id: currentStockIn.product_id, name: 'Unknown Product' },
    submitter: {
      id: currentStockIn.submitter?.id || currentStockIn.submitted_by,
      name: currentStockIn.submitter?.name || 'Unknown User',
      username: currentStockIn.submitter?.username || 'unknown',
    },
    processed_by: currentStockIn.processed_by,
    batch_id: undefined,
    processing_started_at: undefined,
    processing_completed_at: undefined,
  };

  return (
    <div className="space-y-6">
      <StockInDetailView
        stockIn={processableStockIn}
        details={details}
        isLoading={stockInData.loading}
      />
      {/* Pagination Controls for Details */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} ({detailsTotalCount} items)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="border rounded px-2 py-1"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              {'<<'}
            </button>
            <button
              className="border rounded px-2 py-1"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              {'<'}
            </button>
            <span className="mx-2 text-sm font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              className="border rounded px-2 py-1"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              {'>'}
            </button>
            <button
              className="border rounded px-2 py-1"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              {'>>'}
            </button>
            <select
              className="ml-4 border rounded px-2 py-1 text-sm"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>
        </div>
      )}
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

export default StockInDetailsPage;
