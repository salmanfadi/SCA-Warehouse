
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useProcessedBatches, ProcessedBatchType } from '@/hooks/useProcessedBatches';
import { ProcessedBatchWithItems } from '@/hooks/useProcessedBatchesWithItems';

export interface ProcessedBatchesTableProps {
  batches?: ProcessedBatchWithItems[];
  isLoading?: boolean;
  error?: Error | null;
  filters?: Record<string, any>;
  onViewDetails?: (batchId: string) => void;
  onPrintBarcodes?: (batchId: string) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  highlightBatchId?: string | null;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  warehouseFilter?: string;
  onWarehouseChange?: (warehouseId: string) => void;
  currentPage?: number;
  totalPages?: number;
}

export const ProcessedBatchesTable: React.FC<ProcessedBatchesTableProps> = ({ 
  batches: propBatches,
  isLoading: propIsLoading,
  error: propError,
  filters = {},
  onViewDetails,
  onPrintBarcodes,
  page = 1,
  pageSize = 10,
  onPageChange,
  highlightBatchId = null,
  currentPage = 1,
  totalPages = 1
}) => {
  const navigate = useNavigate();
  
  // Use hook data if batches are not provided as props
  const hookData = useProcessedBatches(page, pageSize, filters);
  
  const batches = propBatches || hookData.data?.data || [];
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookData.isLoading;
  const error = propError !== undefined ? propError : hookData.error;
  const totalCount = hookData.data?.count || 0;
  const calculatedTotalPages = Math.ceil(totalCount / pageSize);
  const finalTotalPages = totalPages > 1 ? totalPages : calculatedTotalPages;
  
  // Handle batch details view
  const handleViewDetails = (batchId: string) => {
    if (onViewDetails) {
      onViewDetails(batchId);
    } else {
      navigate(`/manager/stock-in/batch/${batchId}`);
    }
  };
  
  // Handle printing barcodes
  const handlePrintBarcodes = (batchId: string) => {
    if (onPrintBarcodes) {
      onPrintBarcodes(batchId);
    } else {
      navigate(`/manager/inventory/barcodes/${batchId}`);
    }
  };

  // Add refresh button
  const handleRefresh = () => {
    if (hookData.refetch) {
      hookData.refetch();
    }
  };
  
  // Show skeleton UI instead of a spinner when loading
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Boxes</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead>Processed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, index) => (
                <TableRow key={`skeleton-row-${index}`}>
                  <TableCell><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                  </TableCell>
                  <TableCell><div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded">
        <p className="text-red-500">{error instanceof Error ? error.message : 'An error occurred while fetching data'}</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }
  
  if (!batches || batches.length === 0) {
    return (
      <div className="text-center p-8 border rounded bg-gray-50">
        <p className="text-gray-500">No processed batches found</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-2">
          Refresh Data
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button onClick={handleRefresh} variant="outline" size="sm">
          Refresh Data
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Boxes</TableHead>
              <TableHead>Processed By</TableHead>
              <TableHead>Processed Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow 
                key={batch.id} 
                className={batch.id === highlightBatchId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              >
                <TableCell className="font-medium">{batch.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{batch.product?.name || batch.product_name || 'Unknown Product'}</div>
                    <div className="text-sm text-muted-foreground">SKU: {batch.product?.sku || batch.product_sku || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell>{batch.totalQuantity || batch.total_quantity || 0}</TableCell>
                <TableCell>{batch.totalBoxes || batch.boxes || 0}</TableCell>
                <TableCell>{batch.processorName || batch.processor_name || 'Unknown'}</TableCell>
                <TableCell>
                  {batch.created_at ? format(new Date(batch.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(batch.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Barcodes
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {finalTotalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4">
          <Button size="sm" variant="outline" onClick={() => onPageChange && onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            Previous
          </Button>
          <span>Page {currentPage} of {finalTotalPages}</span>
          <Button size="sm" variant="outline" onClick={() => onPageChange && onPageChange(currentPage + 1)} disabled={currentPage === finalTotalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProcessedBatchesTable;
