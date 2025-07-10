import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { Progress } from '@/components/ui/progress';
import { BatchItem } from '@/services/stockout/types';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  isEnabled: boolean;
  isProcessing: boolean;
  currentBatchItem: BatchItem | null;
  initialBarcode?: string;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  isEnabled,
  isProcessing,
  currentBatchItem,
  initialBarcode
}) => {
  const [barcode, setBarcode] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Process initialBarcode if provided
  useEffect(() => {
    if (initialBarcode && isEnabled && !isProcessing && !currentBatchItem) {
      console.log('Processing initial barcode:', initialBarcode);
      setBarcode(initialBarcode);
      
      // Automatically submit the barcode after a short delay
      const timer = setTimeout(() => {
        if (initialBarcode.trim() && isEnabled) {
          handleSubmitBarcode();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialBarcode, isEnabled, isProcessing, currentBatchItem]);

  // Focus input when enabled changes
  useEffect(() => {
    if (isEnabled && !isProcessing && !currentBatchItem && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEnabled, isProcessing, currentBatchItem]);

  // Handle barcode input change
  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcode(e.target.value);
  };

  // Handle barcode submission
  const handleSubmitBarcode = async () => {
    if (!barcode.trim() || !isEnabled || isProcessing) return;
    
    try {
      setLoadingProgress(25);
      
      // Notify parent component
      onBarcodeScanned(barcode);
      
      // Simulate progress
      setTimeout(() => setLoadingProgress(50), 300);
      setTimeout(() => setLoadingProgress(100), 600);
      setTimeout(() => setLoadingProgress(0), 1000);
      
      // Clear barcode input
      setBarcode('');
    } catch (error) {
      console.error('Error submitting barcode:', error);
      toast.error('Failed to process barcode. Please try again.');
      setLoadingProgress(0);
    }
  };

  // Handle barcode scan from camera
  const handleBarcodeScan = (scannedBarcode: string) => {
    if (!isEnabled || isProcessing) return;
    
    console.log('Barcode scanned from camera:', scannedBarcode);
    setBarcode(scannedBarcode);
    setIsCameraOpen(false);
    
    // Submit the barcode immediately
    onBarcodeScanned(scannedBarcode);
    
    // Clear the input after a short delay
    setTimeout(() => {
      setBarcode('');
    }, 500);
    
    // Show success toast
    toast.success(`Successfully scanned barcode: ${scannedBarcode.substring(0, 8)}...`);
  };

  // Handle Enter key press in the barcode input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitBarcode();
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Dialog */}
      {isCameraOpen && (
        <MobileBarcodeScanner
          onBarcodeScanned={handleBarcodeScan}
          allowManualEntry={false}
        />
      )}
      
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="barcode-input" className="text-sm font-medium">
                Scan or Enter Barcode
              </label>
              <div className="flex space-x-2">
                <Input
                  id="barcode-input"
                  ref={inputRef}
                  value={barcode}
                  onChange={handleBarcodeChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan or type barcode..."
                  disabled={!isEnabled || isProcessing || !!currentBatchItem}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={!isEnabled || isProcessing || !!currentBatchItem || isCameraOpen}
                  variant="outline"
                >
                  Open Camera
                </Button>
                {isCameraOpen && (
                  <Button
                    type="button"
                    onClick={() => setIsCameraOpen(false)}
                    variant="outline"
                  >
                    Close Camera
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSubmitBarcode}
                  disabled={!barcode.trim() || !isEnabled || isProcessing || !!currentBatchItem}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>
            
            {/* Loading Progress */}
            {loadingProgress > 0 && (
              <Progress value={loadingProgress} className="h-1" />
            )}
            
            {/* Status Indicators */}
            {isProcessing && (
              <div className="flex items-center space-x-2 text-yellow-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing barcode...</span>
              </div>
            )}
            
            {currentBatchItem && (
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm">
                  Barcode {currentBatchItem.barcode} scanned successfully
                </span>
              </div>
            )}
            
            {!isEnabled && (
              <div className="flex items-center space-x-2 text-gray-500">
                <X className="h-4 w-4" />
                <span className="text-sm">Scanner disabled</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BarcodeScanner;
