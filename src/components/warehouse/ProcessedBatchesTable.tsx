
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
import { Badge } from '@/components/ui/badge';

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
  highlightBatchIds?: string[];
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
  highlightBatchIds = [],
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
      {/* Desktop/tablet table with scroll hint */}
      <div className="hidden sm:block relative">
        <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-md border">
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Batch ID</TableHead>
                    <TableHead className="whitespace-nowrap">Product</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Quantity</TableHead>
                    <TableHead className="whitespace-nowrap text-center hidden md:table-cell">Boxes</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Processed By</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Processed Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow 
                      key={batch.id} 
                      className={highlightBatchIds.includes(batch.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    >
                      <TableCell className="font-medium">{batch.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate max-w-[150px] lg:max-w-xs" title={batch.product?.name || batch.product_name || 'Unknown Product'}>
                            {batch.product?.name || batch.product_name || 'Unknown Product'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-[150px]" title={batch.product?.sku || batch.product_sku || 'N/A'}>
                            SKU: {batch.product?.sku || batch.product_sku || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {batch.totalQuantity || batch.total_quantity || 0}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {batch.totalBoxes || batch.boxes || 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[120px]" title={batch.processorName || batch.processor_name || 'Unknown'}>
                        {batch.processorName || batch.processor_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {batch.created_at ? format(new Date(batch.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(batch.id)}
                          className="whitespace-nowrap"
                        >
                          <Eye className="h-4 w-4 mr-1 sm:mr-0 md:mr-1" />
                          <span className="hidden sm:inline-block md:hidden lg:inline-block">View Barcodes</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        {/* Remove scroll hints */}
      </div>
      {/* Mobile stacked card view */}
      <div className="sm:hidden space-y-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className={`rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-900 ${highlightBatchIds.includes(batch.id) ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-base">Batch #{batch.id.slice(0, 8)}</div>
              <Badge className="text-xs">{batch.status || 'N/A'}</Badge>
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium line-clamp-2">{batch.product?.name || batch.product_name || 'Unknown Product'}</div>
              <div className="text-xs text-muted-foreground truncate">SKU: {batch.product?.sku || batch.product_sku || 'N/A'}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="col-span-2 flex items-center justify-between border-b pb-2 mb-1">
                <div className="flex gap-4">
                  <span>Qty: <span className="font-semibold">{batch.totalQuantity || batch.total_quantity || 0}</span></span>
                  <span>Boxes: <span className="font-semibold">{batch.totalBoxes || batch.boxes || 0}</span></span>
                </div>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground block">Processed By</span>
                <span className="font-medium truncate block">{batch.processorName || batch.processor_name || 'Unknown'}</span>
              </div>
              
              <div className="text-xs">
                <span className="text-muted-foreground block">Date</span>
                <span className="font-medium truncate block">{batch.created_at ? format(new Date(batch.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(batch.id)}
                className="w-full sm:w-auto"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Barcodes
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Pagination Controls */}
      {finalTotalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 py-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onPageChange && onPageChange(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>
            <div className="text-sm px-2">
              <span className="hidden sm:inline">Page </span>
              {currentPage} <span className="hidden sm:inline">of</span><span className="inline sm:hidden">/</span> {finalTotalPages}
            </div>
            <Button size="sm" variant="outline" onClick={() => onPageChange && onPageChange(currentPage + 1)} disabled={currentPage === finalTotalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessedBatchesTable;
