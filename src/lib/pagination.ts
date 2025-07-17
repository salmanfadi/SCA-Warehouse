/**
 * Utility functions for handling pagination
 */

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage pagination state with URL parameters
 */
export const usePagination = (options: {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  searchParamPrefix?: string;
} = {}) => {
  const {
    defaultPageSize = 10,
    pageSizeOptions = [10, 25, 50, 100],
    searchParamPrefix = ''
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial values from URL or use defaults
  const getInitialPage = () => {
    const page = searchParams.get(`${searchParamPrefix}page`);
    return page ? Math.max(1, parseInt(page, 10)) : 1;
  };

  const getInitialPageSize = () => {
    const size = searchParams.get(`${searchParamPrefix}pageSize`);
    const parsedSize = size ? parseInt(size, 10) : defaultPageSize;
    return pageSizeOptions.includes(parsedSize) ? parsedSize : defaultPageSize;
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
  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

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

/**
 * Helper to calculate pagination metadata
 */
export const getPaginationMeta = (totalItems: number, page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const itemCount = Math.min(pageSize, totalItems - (currentPage - 1) * pageSize);
  const from = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(from + itemCount - 1, totalItems);

  return {
    totalItems,
    itemCount,
    itemsPerPage: pageSize,
    totalPages,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    from,
    to,
  };
};

/**
 * Type for paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Creates a query key for React Query that includes pagination parameters
 */
export const createPaginationQueryKey = (
  baseKey: string,
  page: number,
  pageSize: number,
  searchParams?: Record<string, unknown>
) => {
  return [
    baseKey,
    { page, pageSize, ...searchParams }
  ] as const;
};

/**
 * Default page size options
 */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
