import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

const pageSizeOptions = [10, 25, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = '',
}) => {
  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(e.currentTarget.value);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
      e.currentTarget.value = '';
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2 ${className}`}>
      <div className="text-sm text-muted-foreground">
        Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-{
          Math.min(currentPage * pageSize, totalItems)
        } of {totalItems} items
      </div>
      
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 px-2">
            <span className="px-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">Go to:</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                onKeyDown={handlePageInput}
                className="w-16 h-8 text-sm"
                placeholder="#"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="hidden sm:flex"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
