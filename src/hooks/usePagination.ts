import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UsePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  searchParamPrefix?: string;
}

export const usePagination = ({
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  searchParamPrefix = '',
}: UsePaginationOptions = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL or use defaults
  const getInitialPage = () => {
    const page = searchParams.get(`${searchParamPrefix}page`);
    return page ? parseInt(page, 10) : 1;
  };

  const getInitialPageSize = () => {
    const size = searchParams.get(`${searchParamPrefix}pageSize`);
    return size && pageSizeOptions.includes(parseInt(size, 10)) 
      ? parseInt(size, 10) 
      : defaultPageSize;
  };

  const [page, setPage] = useState<number>(getInitialPage);
  const [pageSize, setPageSize] = useState<number>(getInitialPageSize);

  // Update URL when pagination changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (page > 1) {
      params.set(`${searchParamPrefix}page`, page.toString());
    } else {
      params.delete(`${searchParamPrefix}page`);
    }
    
    if (pageSize !== defaultPageSize) {
      params.set(`${searchParamPrefix}pageSize`, pageSize.toString());
    } else {
      params.delete(`${searchParamPrefix}pageSize`);
    }
    
    setSearchParams(params, { replace: true });
  }, [page, pageSize, searchParams, setSearchParams, searchParamPrefix, defaultPageSize]);

  // Reset to page 1 when search or filters change
  const resetPagination = () => {
    setPage(1);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  // Calculate offset for API calls
  const getOffset = () => (page - 1) * pageSize;

  return {
    // State
    page,
    pageSize,
    offset: getOffset(),
    
    // Actions
    setPage,
    setPageSize: handlePageSizeChange,
    resetPagination,
    
    // Configuration
    pageSizeOptions,
    
    // Handlers
    onPageChange: setPage,
    onPageSizeChange: handlePageSizeChange,
  };
};

export default usePagination;
