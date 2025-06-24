
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { StockOutWithProduct } from '@/types/common';

interface StockOutTableProps {
  stockOuts: StockOutWithProduct[];
  onEdit: (stockOut: StockOutWithProduct) => void;
  onDelete: (id: string) => void;
}

export const StockOutTable: React.FC<StockOutTableProps> = ({
  stockOuts,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Destination</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockOuts.map((stockOut) => (
            <TableRow key={stockOut.id}>
              <TableCell className="font-medium">{stockOut.destination}</TableCell>
              <TableCell>{stockOut.status}</TableCell>
              <TableCell>{format(new Date(stockOut.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(stockOut)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(stockOut.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {stockOuts.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center">No stock outs found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
