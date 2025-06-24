
import { useStockInData } from './stockInProcessing/useStockInData';
import { useStockInApproval } from './stockInProcessing/useStockInApproval';

export type { StockInWithDetails } from './stockInProcessing/types';

export const useStockInProcessing = (stockInId?: string, page: number = 1, pageSize: number = 20) => {
  const stockInQuery = useStockInData(stockInId, page, pageSize);
  const approvalHook = useStockInApproval(stockInId);

  // Get the first item from the array (if there is one)
  const currentStockIn = stockInQuery.data && stockInQuery.data.length > 0 ? stockInQuery.data[0] : null;

  // Get the paginated stock-in details and total count
  const details = currentStockIn ? currentStockIn.details : [];
  const detailsTotalCount = currentStockIn ? currentStockIn.detailsTotalCount : 0;

  return {
    stockInData: {
      data: currentStockIn,
      loading: stockInQuery.isLoading,
      error: stockInQuery.error,
    },
    currentStockIn,
    details,
    detailsTotalCount,
    ...approvalHook
  };
};
