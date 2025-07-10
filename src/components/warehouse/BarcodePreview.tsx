
import React from 'react';
import Barcode from 'react-barcode';

interface BarcodePreviewProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export const BarcodePreview: React.FC<BarcodePreviewProps> = ({
  value,
  width = 2,
  height = 100,
  displayValue = true,
  className = ''
}) => {
  return (
    <div className={`flex justify-center ${className}`}>
      <Barcode
        value={value}
        width={width}
        height={height}
        displayValue={displayValue}
        format="CODE128"
        background="#ffffff"
        lineColor="#000000"
        margin={10}
        fontSize={16}
        textPosition="bottom"
        textAlign="center"
        textMargin={2}
      />
    </div>
  );
}; 

// Add default export to maintain backward compatibility
export default BarcodePreview;
