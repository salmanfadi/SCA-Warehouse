import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { Card, CardContent } from '@/components/ui/card';
import { ScanResponse } from '@/types/auth';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import ScanDataDisplay from '@/components/barcode/ScanDataDisplay';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useBarcodeProcessor } from '@/components/barcode/useBarcodeProcessor';

const BarcodeLookup: React.FC = () => {
  const [lastScan, setLastScan] = useState<ScanResponse['data'] | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { processScan, loading, error, scanData } = useBarcodeProcessor({
    user,
    toast,
    onScanComplete: (data) => {
      setLastScan(data);
      console.log('Scan completed:', data);
    }
  });

  const viewInInventory = () => {
    if (lastScan) {
      navigate(`/operator/submissions?search=${lastScan.box_id}`);
    }
  };
  
  const handleBarcodeDetected = (barcode: string) => {
    console.log('Barcode detected:', barcode);
    processScan(barcode);
  };

  const goBackToDashboard = () => {
    navigate('/field');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goBackToDashboard} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <PageHeader 
          title="Barcode Lookup" 
          description="Scan barcodes to view product information and location details"
        />
      </div>
      
      <div className="max-w-3xl mx-auto">
        {/* Barcode scanning tips */}
        <Card className="mb-6 border-blue-100 bg-blue-50">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Quick Tips
            </h3>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Enter barcodes manually or use a hardware scanner</li>
              <li>Try sample codes: <code className="bg-white px-1 py-0.5 rounded text-xs">BC123456789</code> (available) or <code className="bg-white px-1 py-0.5 rounded text-xs">BC987654321</code> (reserved)</li>
              <li>Click the camera icon to scan barcodes with your device camera</li>
              <li>After scanning, you can view related inventory or clear for a new scan</li>
            </ul>
          </CardContent>
        </Card>
        
        <MobileBarcodeScanner 
          onBarcodeScanned={handleBarcodeDetected}
          allowManualEntry={true}
          scanButtonLabel="Scan Barcode"
        />
        
        {(lastScan || scanData) && (
          <div className="mt-6">
            <ScanDataDisplay scanData={lastScan || scanData} />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={viewInInventory} className="text-sm">
                View in Inventory
              </Button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md">
            <p className="text-red-700 font-medium">Error: {error}</p>
          </div>
        )}
        
        {loading && (
          <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
            <p className="text-blue-700 font-medium">Scanning...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeLookup;
