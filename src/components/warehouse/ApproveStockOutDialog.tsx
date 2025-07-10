import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ApproveStockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanBarcode: () => void;
  product: {
    name: string;
  };
  requestedQuantity: number;
  destination: string;
}

const ApproveStockOutDialog: React.FC<ApproveStockOutDialogProps> = ({
  open,
  onOpenChange,
  onScanBarcode,
  product,
  requestedQuantity,
  destination,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Stock Out</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="font-medium">Product: {product.name}</p>
            <p className="text-sm text-muted-foreground">
              Requested Quantity: {requestedQuantity}
            </p>
            <p className="text-sm text-muted-foreground">
              Destination: {destination}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Approved Quantity</label>
            <Input
              type="number"
              value={requestedQuantity}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              You can approve up to the requested quantity if inventory is available
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={onScanBarcode}>
            Scan Barcode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveStockOutDialog; 