import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reserveStockService, ReserveStockWithDetails } from '@/services/reserveStockService';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ReserveStockListProps {
  onView: (item: ReserveStockWithDetails) => void;
}

export const ReserveStockList: React.FC<ReserveStockListProps> = ({ onView }) => {
  const { data: reserveStocks, isLoading, error } = useQuery<ReserveStockWithDetails[]>({
    queryKey: ['reserve-stocks'],
    queryFn: reserveStockService.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        Error loading reserve stocks: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reserveStocks?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                No reserve stocks found
              </TableCell>
            </TableRow>
          ) : (
            reserveStocks?.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{stock.product.name}</div>
                    {stock.product.sku && (
                      <div className="text-sm text-muted-foreground">SKU: {stock.product.sku}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{stock.customer_name}</div>
                    {stock.customer && (
                      <div className="text-sm text-muted-foreground">
                        {stock.customer.company && `${stock.customer.company}`}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{stock.warehouse.name}</div>
                    {stock.warehouse.code && (
                      <div className="text-sm text-muted-foreground">Code: {stock.warehouse.code}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{stock.quantity}</TableCell>
                <TableCell>{format(new Date(stock.start_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(stock.end_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(stock.status)}>
                    {formatStatus(stock.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(stock)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'active':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'outline';
    case 'converted_to_stockout':
      return 'default';
    default:
      return 'outline';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 