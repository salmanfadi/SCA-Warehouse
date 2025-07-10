import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Package, MapPin, Factory, Palette, Ruler, MoreVertical, ChevronDown, ChevronUp, ClipboardCheck, AlertCircle } from 'lucide-react';
import { ProcessedBatch } from '@/types/batchStockIn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarcodePreview } from './BarcodePreview';

// Update the BatchCard component to show validation errors:
export const BatchCard: React.FC<{
  batch: ProcessedBatch;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  showBarcodes?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}> = ({ 
  batch, 
  index, 
  onEdit, 
  onDelete, 
  showBarcodes = false,
  disabled = false,
  hasError = false
}) => {
  const [showAllBarcodes, setShowAllBarcodes] = useState(false);
  
  // Calculate how many barcodes to show initially
  const initialBarcodesToShow = 3;
  const hasMoreBarcodes = batch.barcodes && batch.barcodes.length > initialBarcodesToShow;
  const visibleBarcodes = showAllBarcodes 
    ? batch.barcodes || [] 
    : (batch.barcodes || []).slice(0, initialBarcodesToShow);

  return (
    <Card className={`apple-shadow-sm overflow-hidden relative ${hasError ? 'border-red-300 bg-red-50' : ''}`}>
      {/* Action buttons positioned as overlay in top-right */}
      <div className="absolute top-2 right-2 flex gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={onEdit}
          disabled={disabled}
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600" 
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
      
      <CardHeader className="py-3 pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span>Batch #{index + 1} | {batch.boxes_count} Boxes</span>
          {/* Audit Log Indicator with tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ClipboardCheck className="h-4 w-4 ml-auto text-green-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Activity Logged</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-2 pb-3">
        {/* Two-column metadata layout */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Product:</span>
            <span className="text-sm truncate" title={batch.product?.name}>
              {batch.product?.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
            <span className="text-sm truncate" title={batch.warehouse?.name}>
              {batch.warehouse?.name}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <span className="text-sm truncate">
              Floor {batch.warehouseLocation?.floor}, Zone {batch.warehouseLocation?.zone}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span className="text-sm">
              {batch.boxes_count} × {batch.quantity_per_box} units
            </span>
          </div>
          
          {batch.color && (
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
              <span className="text-sm">{batch.color}</span>
              <div 
                className="w-3 h-3 rounded-full ml-1" 
                style={{ backgroundColor: batch.color.toLowerCase() }}
                aria-hidden="true"
              ></div>
            </div>
          )}
          
          {batch.size && (
            <div className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
              <span className="text-sm">{batch.size}</span>
            </div>
          )}
        </div>
        
        {/* Collapsible Barcode Section */}
        {showBarcodes && batch.barcodes && batch.barcodes.length > 0 && (
          <div className="mt-3">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="barcodes" className="border-none">
                <AccordionTrigger className="py-1 text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span>Barcodes ({batch.barcodes.length})</span>
                    {hasError && (
                      <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[140px] w-full rounded-md border p-2">
                    <div className="space-y-2">
                      {visibleBarcodes.map((barcode, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="bg-white p-1 rounded border mb-1 w-full text-center">
                            <div className="h-12 flex items-center justify-center border-b pb-1">
                              <BarcodePreview 
                                value={barcode} 
                                height={40} 
                                width={1} 
                                displayValue={false}
                              />
                            </div>
                            <div className="text-xs font-mono pt-1 select-all">{barcode}</div>
                          </div>
                        </div>
                      ))}
                      
                      {hasMoreBarcodes && !showAllBarcodes && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs" 
                          onClick={() => setShowAllBarcodes(true)}
                        >
                          View all {batch.barcodes.length} barcodes
                        </Button>
                      )}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </CardContent>
      
      {hasError && (
        <div className="px-4 py-2 bg-red-100 text-red-800 text-xs flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          One or more barcodes in this batch already exist in inventory
        </div>
      )}
    </Card>
  );
};
