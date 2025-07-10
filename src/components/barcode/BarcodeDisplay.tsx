import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BarcodeDisplayProps {
  barcode: string;
  productName?: string;
  className?: string;
}

const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({ 
  barcode, 
  productName,
  className = '' 
}) => {
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!barcodeRef.current) return;
    
    try {
      const dataUrl = await toPng(barcodeRef.current);
      saveAs(dataUrl, `barcode-${barcode}.png`);
    } catch (error) {
      console.error('Error generating barcode image:', error);
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <div ref={barcodeRef} className="bg-white p-4 rounded-lg border border-gray-200">
        {productName && (
          <div className="text-center font-medium mb-2">{productName}</div>
        )}
        <Barcode 
          value={barcode} 
          format="CODE128"
          width={1.5}
          height={60}
          fontSize={14}
          margin={0}
        />
        <div className="text-center text-sm mt-1">{barcode}</div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDownload}
        className="flex items-center gap-1"
      >
        <Download className="w-4 h-4" />
        <span>Download</span>
      </Button>
    </div>
  );
};

export default BarcodeDisplay;
