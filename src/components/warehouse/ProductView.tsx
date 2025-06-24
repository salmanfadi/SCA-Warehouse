
import React, { useState, useCallback, useEffect, KeyboardEvent } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ChevronDown, 
  Warehouse as WarehouseIcon, 
  Download,
  RefreshCw
} from 'lucide-react';
import { useProductBatchesData, ProductWithBatches } from '@/hooks/useProductBatchesData';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { getHSNDescription } from '@/utils/hsnCodes';
import { useToast } from '@/hooks/use-toast';

export const ProductView: React.FC = () => {
  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // State for HSN code editing
  const [editingHSN, setEditingHSN] = useState<string | null>(null);
  const [hsnValue, setHsnValue] = useState<string>('');
  
  const { toast } = useToast();
  
  // Fetch product batches data
  const { 
    data: productBatchesData, 
    isLoading, 
    error,
    refetch
  } = useProductBatchesData(page, pageSize, searchQuery);
  
  // Refetch data when component mounts to get updated HSN codes
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Toggle product expansion
  const toggleProductExpansion = useCallback((productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on new search
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
    toast({
      title: "Data refreshed",
      description: "Product inventory data has been updated.",
    });
  }, [refetch, toast]);
  
  // Function to update HSN code
  const updateHSNCode = async (productId: string, newHSNCode: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ hsn_code: newHSNCode })
        .eq('id', productId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "HSN Code Updated",
        description: `HSN Code has been updated to ${newHSNCode}.`,
      });
      
      // Refresh data
      refetch();
    } catch (error) {
      console.error('Error updating HSN code:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update HSN code. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle HSN edit start
  const handleEditHSN = (productId: string, currentHSN: string) => {
    setEditingHSN(productId);
    setHsnValue(currentHSN === 'Not Set' ? '' : currentHSN);
  };
  
  // Handle HSN edit save
  const handleSaveHSN = (productId: string) => {
    if (hsnValue.trim() !== '') {
      updateHSNCode(productId, hsnValue.trim());
    }
    setEditingHSN(null);
  };
  
  // Handle HSN edit cancel
  const handleCancelHSN = () => {
    setEditingHSN(null);
  };
  
  // Handle keyboard events for HSN editing
  const handleHSNKeyDown = (e: KeyboardEvent<HTMLInputElement>, productId: string) => {
    if (e.key === 'Enter') {
      handleSaveHSN(productId);
    } else if (e.key === 'Escape') {
      handleCancelHSN();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Product Inventory with HSN
            </CardTitle>
            <CardDescription>
              View all products with HSN codes and total quantity across warehouses
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search products by name, SKU, category, or HSN code..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8"
              />
              <div className="absolute left-2.5 top-2.5 text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
          </div>
          
          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-3 w-[120px]" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-red-500">
                      Error loading product data. Please try again.
                    </TableCell>
                  </TableRow>
                ) : !productBatchesData || productBatchesData.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No products found. Try adjusting your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  // Products are already sorted by stock status at the database level
                  productBatchesData.data.map((product) => (
                      <React.Fragment key={product.productId}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleProductExpansion(product.productId)}
                        >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`transition-transform ${expandedProducts.has(product.productId) ? 'rotate-180' : ''}`}>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{product.productName}</div>
                              <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.categories?.length ? product.categories[0] : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {editingHSN === product.productId ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={hsnValue}
                                  onChange={(e) => setHsnValue(e.target.value)}
                                  onKeyDown={(e) => handleHSNKeyDown(e, product.productId)}
                                  className="h-7 w-24 font-mono text-xs"
                                  autoFocus
                                />
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0" 
                                  onClick={() => handleSaveHSN(product.productId)}
                                >
                                  ✓
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0" 
                                  onClick={handleCancelHSN}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="font-mono text-xs cursor-pointer hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditHSN(product.productId, product.hsnCode);
                                }}
                              >
                                {product.hsnCode}
                              </Badge>
                            )}
                            {product.hsnCode !== 'Not Set' && product.hsnCode !== '9999' && !editingHSN && (
                              <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={getHSNDescription(product.hsnCode)}>
                                {getHSNDescription(product.hsnCode)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-normal">
                            {product.totalProductCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.totalQuantity > 0 ? "default" : "destructive"} className="font-normal">
                            {product.totalQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      
                      {/* Collapsible Batch Details */}
                      {expandedProducts.has(product.productId) && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 border-b">
                            <div className="bg-muted/30 p-4">
                              <h4 className="font-medium mb-2">Batch Details</h4>
                              <div className="rounded-md border bg-background overflow-auto max-h-[400px]">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Batch ID</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Warehouse</TableHead>
                                      <TableHead>Floor</TableHead>
                                      <TableHead>Zone</TableHead>
                                      <TableHead className="text-right">Created Date</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {product.batches && product.batches.length > 0 ? (
                                      product.batches.map((batch) => (
                                        <TableRow key={batch.batchId}>
                                          <TableCell className="font-mono text-xs">
                                            {batch.batchId}
                                          </TableCell>
                                          <TableCell>{batch.quantity}</TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-1">
                                              <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                              <span>{batch.warehouseName}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {batch.floor || 'N/A'}
                                          </TableCell>
                                          <TableCell>
                                            {batch.zone || 'N/A'}
                                          </TableCell>
                                          <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(batch.createdAt).toLocaleDateString()}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                                          No batches available for this product
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {!isLoading && productBatchesData && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {productBatchesData.data.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, productBatchesData.totalCount)} of {productBatchesData.totalCount} products
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                  >
                    <span className="sr-only">First page</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevrons-left"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <span className="sr-only">Previous page</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
                  </Button>
                  <span className="text-sm font-medium">
                    Page {page} of {Math.ceil(productBatchesData.totalCount / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= Math.ceil(productBatchesData.totalCount / pageSize)}
                  >
                    <span className="sr-only">Next page</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.ceil(productBatchesData.totalCount / pageSize))}
                    disabled={page >= Math.ceil(productBatchesData.totalCount / pageSize)}
                  >
                    <span className="sr-only">Last page</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevrons-right"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
