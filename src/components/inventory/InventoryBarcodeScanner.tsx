
import React, { useState } from 'react';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Barcode, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface InventoryBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onClose?: () => void;
}

export const InventoryBarcodeScanner: React.FC<InventoryBarcodeScannerProps> = ({ 
  onBarcodeScanned,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const handleOpenScanner = () => {
    setIsOpen(true);
  };
  
  const handleCloseScanner = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };
  
  const handleBarcodeDetected = (barcode: string) => {
    setIsOpen(false);
    
    // Notify user about successful scan
    toast('Barcode Scanned', {
      description: `Searching inventory for barcode: ${barcode}`
    });
    
    // Invalidate queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['inventory-data'] });
    
    // Call parent handler
    onBarcodeScanned(barcode);
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        size="icon"
        onClick={handleOpenScanner}
        title="Scan Barcode"
      >
        <Barcode className="h-4 w-4" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Barcode className="mr-2 h-5 w-5" />
              Scan Inventory Barcode
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            <BarcodeScanner
              onDetected={handleBarcodeDetected}
              allowManualEntry={true}
              allowCameraScanning={true}
              scanButtonLabel="Find Item"
            />
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCloseScanner}
                className="w-full flex items-center justify-center"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryBarcodeScanner;
