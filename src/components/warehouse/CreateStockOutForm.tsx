import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ScanLine } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';

interface CreateStockOutFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId?: string;
  onCreate?: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialBarcode?: string;
}

export const CreateStockOutForm: React.FC<CreateStockOutFormProps> = ({
  onCreate,
  onCancel,
  isLoading = false,
  userId,
  initialBarcode,
  open,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Product lookup by barcode
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product-by-barcode', barcode],
    queryFn: async () => {
      if (!barcode) return null;
      
      const { data, error } = await executeQuery('product-lookup', async (supabase) => {
        return await supabase
          .from('products')
          .select('*')
          .eq('barcode', barcode)
          .single();
      });
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
          toast({
            title: 'Error',
            description: 'Failed to find product with this barcode',
            variant: 'destructive',
          });
        }
        return null;
      }
      
      return data;
    },
    enabled: !!barcode,
  });

  // Update product info when product is found
  useEffect(() => {
    if (product) {
      setProductId(product.id);
      setProductName(product.name);
      toast({
        title: 'Product Found',
        description: `Found: ${product.name}`,
      });
    }
  }, [product, toast]);

  // Handle barcode scanning
  const handleBarcodeScanned = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    setIsScannerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCreate) {
      onCreate({
        destination,
        notes,
        created_by: userId,
        status: 'pending',
        product_id: productId,
        quantity: quantity
      });
    }
    
    // Close the form if onOpenChange is provided
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Barcode Scanner Section */}
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="barcode">Product Barcode</Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Enter or scan barcode"
            />
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsScannerOpen(true)}
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan
          </Button>
        </div>
        
        {/* Product Information */}
        {isProductLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking up product...
          </div>
        ) : product ? (
          <div className="rounded-md bg-muted p-3">
            <p className="font-medium">Product: {productName}</p>
            <div className="mt-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>
        ) : barcode ? (
          <p className="text-sm text-destructive">No product found with this barcode</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="destination">Destination</Label>
        <Input
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination"
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes (optional)"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isLoading || isProductLoading || (!productId && !!barcode)}
        >
          {isLoading ? 'Creating...' : 'Create Stock Out'}
        </Button>
      </div>
      
      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MobileBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              allowManualEntry={true}
              scanButtonLabel="Start Scanning"
            />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
};
