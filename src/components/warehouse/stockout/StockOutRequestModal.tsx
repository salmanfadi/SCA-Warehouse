import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, X } from 'lucide-react';

interface StockOutRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockOut: any;
  onReject: (stockOut: any) => void;
}

const StockOutRequestModal: React.FC<StockOutRequestModalProps> = ({
  open,
  onOpenChange,
  stockOut,
  onReject
}) => {
  const navigate = useNavigate();

  if (!stockOut) return null;

  // Get the first product from stock_out_details
  const productDetails = stockOut.stock_out_details?.[0] || { 
    product_id: stockOut.product?.id,
    quantity: stockOut.quantity || 0,
    product: stockOut.product
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleReject = () => {
    onReject(stockOut);
    onOpenChange(false);
  };

  const handleScanBarcode = () => {
    // Navigate to barcode scanning page with stockOut ID
    navigate(`/manager/stock-out/barcode-stock-out/${stockOut.id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Out Request</DialogTitle>
          <DialogDescription>
            Choose how you want to process this stock out request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="font-medium">Product: {productDetails.product?.name || 'Unknown Product'}</div>
            {productDetails.product?.sku && (
              <div className="text-sm text-gray-500">SKU: {productDetails.product.sku}</div>
            )}
            <div className="text-sm text-gray-500">
              Requested Quantity: {productDetails.quantity}
            </div>
            <div className="text-sm text-gray-500">
              Destination: {stockOut.destination}
            </div>
            {stockOut.customer && (
              <div className="text-sm text-gray-500">
                Customer: {stockOut.customer.name}
                {stockOut.customer.company && ` (${stockOut.customer.company})`}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Reject Request
          </Button>
          <Button
            onClick={handleScanBarcode}
            className="w-full sm:w-auto"
          >
            <ScanLine className="mr-2 h-4 w-4" />
            Scan Barcode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockOutRequestModal;
