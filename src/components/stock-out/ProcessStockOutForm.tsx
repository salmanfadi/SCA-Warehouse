
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { StockOutWithProduct } from '@/types/common';

type StockStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'processing' | 'from_sales_order';

interface ProcessStockOutFormProps {
  stockOut: StockOutWithProduct | null;
  onUpdate: (stockOutData: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const ProcessStockOutForm: React.FC<ProcessStockOutFormProps> = ({ 
  stockOut, 
  onUpdate, 
  onCancel, 
  isLoading 
}) => {
  const [status, setStatus] = useState<StockStatus>(stockOut?.status || 'pending');
  const [notes, setNotes] = useState(stockOut?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockOut) return;

    const updatedStockOut = {
      id: stockOut.id,
      status: status,
      notes: notes,
    };

    onUpdate(updatedStockOut);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as StockStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="from_sales_order">From Sales Order</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          type="text"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Stock Out'
          )}
        </Button>
      </div>
    </form>
  );
};
