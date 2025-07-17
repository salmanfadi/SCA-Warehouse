
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Product } from '@/types/database';
import { ProductCard } from '@/components/salesOperator/ProductCard';
import { ProductForm } from '@/components/salesOperator/ProductForm';
import { ProductSearch } from '@/components/salesOperator/ProductSearch';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useDebounce } from 'use-debounce';

// Set items per page to 24 to show more items per page
const ITEMS_PER_PAGE = 24;

const ProductView: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get current page from URL or default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Fetch products with pagination and search
  const { 
    products = [],
    pagination = { 
      total: 0, 
      page: currentPage, 
      pageSize: ITEMS_PER_PAGE, 
      totalPages: 1 
    },
    isLoading,
    error
  } = useProducts({
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    searchQuery: debouncedSearchTerm
  });

  const totalPages = pagination.totalPages || 1;

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  // Calculate pagination info
  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  // Render pagination buttons
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    
    const buttons = [];
    const maxButtons = 5;
    let startPage = 1;
    let endPage = totalPages;

    if (totalPages > maxButtons) {
      if (currentPage <= 3) {
        endPage = maxButtons;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxButtons + 1;
      } else {
        startPage = currentPage - 2;
        endPage = currentPage + 2;
      }
    }

    // Previous page button (only arrow)
    buttons.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-md ${
          currentPage === 1 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );

    // First page button
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`w-8 h-8 rounded-md ${
            1 === currentPage 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          1
        </button>
      );
      
      if (startPage > 2) {
        buttons.push(
          <span key="start-ellipsis" className="px-1">
            ...
          </span>
        );
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 rounded-md mx-0.5 ${
            i === currentPage 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page button
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="end-ellipsis" className="px-1">
            ...
          </span>
        );
      }
      
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`w-8 h-8 rounded-md ${
            totalPages === currentPage 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    // Next page button (only arrow)
    buttons.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded-md ${
          currentPage === totalPages 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    );

    return (
      <div className="flex items-center space-x-1">
        {buttons}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-3 py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          {!isLoading && products.length > 0 && (
            <p className="text-gray-600">
              Showing {startItem}-{endItem} of {pagination.total} products
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <ProductSearch 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search products..."
            />
          </div>
          
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">Error loading products. Please try again.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found. Try adjusting your search.</p>
          {searchTerm && (
            <Button 
              variant="ghost" 
              className="mt-2 text-blue-600 hover:bg-blue-50"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 mt-8 pt-6">
        <div className="text-sm text-gray-500 mb-4 sm:mb-0">
          {!isLoading && products.length > 0 ? (
            `Showing ${startItem} to ${endItem} of ${pagination.total} results`
          ) : null}
        </div>
        <div className="bg-white px-4 py-3 flex items-center justify-between rounded-lg border border-gray-200">
          {renderPaginationButtons()}
        </div>
      </div>
      
      <ProductForm 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};

export default ProductView;
