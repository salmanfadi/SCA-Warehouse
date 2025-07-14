
import React from 'react';
import { Product } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
  isLoading?: boolean;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      {/* Table for desktop/tablet */}
      <div className="hidden sm:block relative">
        <div className="overflow-x-auto -mx-4 sm:mx-0 p-4 sm:p-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-md border">
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">SKU</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Category</TableHead>
                    <TableHead className="whitespace-nowrap hidden xl:table-cell">HSN Code</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">GST Rate</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold truncate max-w-[200px]" title={product.name}>{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs" title={product.description}>
                                {product.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {product.sku ? (
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                              {product.sku}
                            </code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {product.hsn_code ? (
                            <code className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-sm">
                              {product.hsn_code}
                            </code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {product.gst_rate !== null && product.gst_rate !== undefined ? (
                            <span className="text-sm font-medium">
                              {product.gst_rate}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(product)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(product.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        {/* Scroll hints */}
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 h-full w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent opacity-75" />
        <div className="pointer-events-none absolute top-0 left-0 bottom-0 h-full w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent opacity-75" />
      </div>
      {/* Stacked card view for mobile */}
      <div className="sm:hidden space-y-4 p-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No products found</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="font-semibold text-base mb-2 line-clamp-1" title={product.name}>{product.name}</div>
              {product.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2" title={product.description}>{product.description}</div>
              )}
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">SKU:</span>
                  <div className="mt-1">
                    {product.sku ? (
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{product.sku}</code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Category:</span>
                  <div className="mt-1">
                    {product.category ? (
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">HSN Code:</span>
                  <div className="mt-1">
                    {product.hsn_code ? (
                      <code className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs">{product.hsn_code}</code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">GST Rate:</span>
                  <div className="mt-1">
                    {product.gst_rate !== null && product.gst_rate !== undefined ? (
                      <span className="font-medium">{product.gst_rate}%</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(product)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(product.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductsTable;
