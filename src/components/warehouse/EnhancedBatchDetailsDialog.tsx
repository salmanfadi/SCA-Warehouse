import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as htmlToImage from 'html-to-image';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import Barcode from 'react-barcode';
import { formatBarcode } from '@/utils/barcodeService';
import BarcodeDisplay from '@/components/barcode/BarcodeDisplay';

// Define the types for batch items
interface BatchItem {
  id: string;
  barcode: string;
  productName?: string;
  quantity: number;
  status: string;
  warehouseName?: string;
  locationDetails?: string;
  color?: string;
  size?: string;
  warehouse_id?: string;
  warehouse_locations?: {
    floor?: string | number;
    zone?: string;
  };
}

// Define the type for a batch
interface Batch {
  id: string;
  status: string;
  items: BatchItem[];
  name?: string;
  totalBoxes?: number;
  totalQuantity?: number;
  warehouseName?: string;
  locationDetails?: string;
  processorName?: string;
  processedAt?: string;
  product?: {
    name: string;
  };
}

interface EnhancedBatchDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string | null;
  selectedBatch: Batch | null;
}

const EnhancedBatchDetailsDialog: React.FC<EnhancedBatchDetailsDialogProps> = ({
  open,
  onOpenChange,
  batchId,
  selectedBatch,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const barcodesContainerRef = useRef<HTMLDivElement>(null);

  // Function to handle downloading all barcodes as a single image
  const handleDownloadBarcodes = async () => {
    if (!selectedBatch) return;
    
    try {
      setIsDownloading(true);
      
      // Create a temporary container for rendering barcodes
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.backgroundColor = 'white';
      document.body.appendChild(tempContainer);
      
      // Create an array to store barcode images
      const barcodeImages: { barcode: string; dataUrl: string }[] = [];
      
      // Generate barcode images with proper rendering time
      for (const item of selectedBatch.items) {
        // Create a barcode element with specific dimensions
        const barcodeElement = document.createElement('div');
        barcodeElement.style.width = '300px';
        barcodeElement.style.height = '100px';
        barcodeElement.style.backgroundColor = 'white';
        barcodeElement.style.padding = '10px';
        tempContainer.appendChild(barcodeElement);
        
        // Render the barcode using react-barcode
        const barcodeComponent = <Barcode 
          value={item.barcode} 
          format="CODE128"
          width={1.5}
          height={60}
          fontSize={12}
          margin={0}
          displayValue={false}
        />;
        
        // Render the barcode component to the DOM
        const root = createRoot(barcodeElement);
        root.render(barcodeComponent);
        
        // Wait for the barcode to render completely
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture the barcode as an image with error handling
        try {
          const dataUrl = await htmlToImage.toPng(barcodeElement, {
            quality: 1.0,
            pixelRatio: 2.0,
            cacheBust: true
          });
          
          // Validate the data URL
          if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
            barcodeImages.push({ barcode: item.barcode, dataUrl });
          } else {
            console.error('Invalid PNG data URL generated');
          }
        } catch (err) {
          console.error('Error generating barcode image:', err);
        }
      }
      
      // Clean up the temporary container
      document.body.removeChild(tempContainer);
      
      // Create PDF
      const pdf = new jsPDF();
      
      // Add batch information
      pdf.setFontSize(18);
      pdf.text(`Batch: ${selectedBatch.id}`, 105, 15, { align: 'center' });
      pdf.setFontSize(14);
      pdf.text(`Product: ${selectedBatch.product?.name || 'Unknown'}`, 105, 25, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 35, { align: 'center' });
      
      // Set starting position for barcodes
      let yPosition = 45;
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const barcodeWidth = pageWidth - (margin * 2);
      const barcodeHeight = 40;
      
      // Add each barcode to the PDF
      for (let i = 0; i < selectedBatch.items.length; i++) {
        const item = selectedBatch.items[i];
        const barcodeImage = barcodeImages.find(img => img.barcode === item.barcode);
        
        // Check if we need a new page
        if (yPosition + barcodeHeight + 30 > pdf.internal.pageSize.getHeight()) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Add item details
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Item: ${i + 1}`, margin, yPosition);
        pdf.text(`Quantity: ${item.quantity}`, margin, yPosition + 8);
        pdf.text(`Status: ${item.status}  Location: ${item.locationDetails || 'N/A'}`, margin, yPosition + 16);
        
        // Add barcode image if available
        if (barcodeImage && barcodeImage.dataUrl) {
          try {
            // Create a new Image to verify the PNG data is valid
            const img = new Image();
            img.src = barcodeImage.dataUrl;
            
            // Add the image to the PDF with error handling
            pdf.addImage(barcodeImage.dataUrl, 'PNG', margin, yPosition + 20, barcodeWidth, barcodeHeight);
            
            // Add barcode number underneath
            pdf.setFontSize(10);
            pdf.setFont('courier', 'normal');
            pdf.text(item.barcode, margin + barcodeWidth / 2, yPosition + barcodeHeight + 25, { align: 'center' });
          } catch (err) {
            console.error(`Error adding barcode image for ${item.barcode}:`, err);
            // Fallback if image addition failed
            pdf.setFontSize(12);
            pdf.text(`Barcode: ${item.barcode}`, margin + barcodeWidth / 2, yPosition + 40, { align: 'center' });
          }
        } else {
          // Fallback if image generation failed
          pdf.setFontSize(12);
          pdf.text(`Barcode: ${item.barcode}`, margin + barcodeWidth / 2, yPosition + 40, { align: 'center' });
        }
        
        // Add separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition + barcodeHeight + 25, pageWidth - margin, yPosition + barcodeHeight + 25);
        
        // Move to next position
        yPosition += barcodeHeight + 35;
      }
      
      // Save PDF
      pdf.save(`barcodes-batch-${selectedBatch.id}-${new Date().toISOString().split('T')[0]}.pdf`);
      setIsDownloading(false);
    } catch (error) {
      console.error('Error generating barcodes:', error);
      setIsDownloading(false);
    }
  };

  if (!selectedBatch) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold">Batch Details</DialogTitle>
            <DialogDescription>
              {selectedBatch.product?.name || 'Unknown Product'} - {selectedBatch.id}
            </DialogDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadBarcodes}
            disabled={isDownloading || !selectedBatch.items.length}
            className="flex items-center gap-1"
          >
            {isDownloading ? (
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-1" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Download All Barcodes
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2 p-4 bg-muted/10 rounded-md">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={
                selectedBatch.status === 'completed' ? 'default' :
                selectedBatch.status === 'processing' ? 'secondary' :
                'destructive'
              }>
                {selectedBatch.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Boxes:</span>
              <span>{selectedBatch.totalBoxes || selectedBatch.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Total Quantity:</span>
              <span>{selectedBatch.totalQuantity || selectedBatch.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
            </div>
          </div>
          <div className="space-y-2 p-4 bg-muted/10 rounded-md">
            <div className="flex justify-between">
              <span className="font-medium">Warehouse:</span>
              <span>{selectedBatch.warehouseName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Location:</span>
              <span>{selectedBatch.locationDetails || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Processed By:</span>
              <span>{selectedBatch.processorName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Processed At:</span>
              <span>{selectedBatch.processedAt ? new Date(selectedBatch.processedAt).toLocaleString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Items in Batch</h3>
          <ScrollArea className="h-[400px]">
            <Table className="batch-details-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBatch.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-[120px]">
                      <div className="w-full flex justify-center">
                        <Barcode 
                          value={item.barcode} 
                          format="CODE128"
                          width={1.5}
                          height={60}
                          fontSize={12}
                          margin={0}
                          displayValue={false}
                        />
                      </div>
                      <div className="text-center text-xs mt-1 font-mono">{item.barcode}</div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.color || '-'}</TableCell>
                    <TableCell>{item.size || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>{item.locationDetails || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="mt-6 hidden">
          {/* Hidden container for PDF generation */}
          <div 
            ref={barcodesContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          >
            {selectedBatch.items.length > 0 ? (
              selectedBatch.items.map((item) => (
                <div key={item.id} className="barcode-item p-4 border rounded-md bg-white">
                  <div className="text-center font-medium mb-2">
                    {item.productName || selectedBatch.product?.name}
                  </div>
                  <Barcode 
                    value={item.barcode} 
                    format="CODE128"
                    width={1.5}
                    height={60}
                    fontSize={14}
                    margin={0}
                  />
                  <div className="text-center text-sm mt-1">{item.barcode}</div>
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    {item.color && <span className="mr-2">Color: {item.color}</span>}
                    {item.size && <span>Size: {item.size}</span>}
                    {item.quantity && <span className="ml-2">Qty: {item.quantity}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center p-8 text-center border rounded-md">
                <Package className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No items with barcodes found in this batch</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedBatchDetailsDialog;
