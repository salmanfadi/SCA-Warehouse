import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, ArrowLeft, Box as BoxIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';

interface BatchData {
  id: string;
  batch_number: string;
  created_at: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string;
  location_name: string;
  quantity_per_box: number;
  total_boxes: number;
  color: string | null;
  size: string | null;
  status: string;
  barcodes: string[];
  stock_in_id?: string;
}

const BatchBarcodesViewer: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [allBatches, setAllBatches] = useState<BatchData[]>([]);

  // Get stock_in_id from URL query parameters if present
  const location = window.location;
  const queryParams = new URLSearchParams(location.search);
  const stockInIdParam = queryParams.get('stock_in_id');
  
  // Fetch all batches if no batchId is provided, or fetch related batches if one is provided
  const { data: batches, isLoading, error } = useQuery<BatchData[]>({
    queryKey: ['batch-barcodes', batchId, stockInIdParam],
    queryFn: async () => {
      // If stock_in_id is provided in the URL, use that to fetch all related batches
      if (stockInIdParam) {
        console.log('Fetching batches for stock_in_id:', stockInIdParam);
        const { data: stockInBatches, error: relatedError } = await supabase
          .from('processed_batches')
          .select(`
            *,
            product:products(id, name, sku)
          `)
          .eq('stock_in_id', stockInIdParam);

        if (relatedError) {
          toast.error(`Error loading batches: ${relatedError.message}`);
          throw relatedError;
        }

        // Get warehouse and location data separately
        const batchesWithDetails = await Promise.all(
          (stockInBatches || []).map(async (batch) => {
            // Get warehouse data
            const { data: warehouse } = await supabase
              .from('warehouses')
              .select('id, name')
              .eq('id', batch.warehouse_id)
              .single();

            // Get location data
            const { data: location } = await supabase
              .from('warehouse_locations')
              .select('id, zone, floor')
              .eq('id', batch.location_id)
              .single();

            // Get barcodes
            const { data: barcodes } = await supabase
              .from('barcodes')
              .select('barcode')
              .eq('batch_id', batch.id)
              .order('created_at');

            return {
              ...batch,
              product_name: batch.product?.name || 'Unknown Product',
              product_sku: batch.product?.sku || 'N/A',
              warehouse_name: warehouse?.name || 'Unknown Warehouse',
              location_name: location ? `Floor ${location.floor} - Zone ${location.zone}` : 'Unknown Location',
              barcodes: barcodes?.map(b => b.barcode) || []
            };
          })
        );

        return batchesWithDetails;
      }
      // Otherwise, if batchId is provided, get that batch and related ones
      else if (batchId) {
        // First, get the current batch
        const { data: currentBatch, error: batchError } = await supabase
          .from('processed_batches')
          .select(`
            *,
            product:products(id, name, sku)
          `)
          .eq('id', batchId)
          .single();

        if (batchError) {
          toast.error(`Error loading batch: ${batchError.message}`);
          throw batchError;
        }

        // Get all batches from the same stock-in request
        let relatedBatches: any[] = [];
        if (currentBatch.stock_in_id) {
          const { data: stockInBatches, error: relatedError } = await supabase
            .from('processed_batches')
            .select(`
              *,
              product:products(id, name, sku)
            `)
            .eq('stock_in_id', currentBatch.stock_in_id);

          if (!relatedError && stockInBatches) {
            relatedBatches = stockInBatches;
          }
        } else {
          relatedBatches = [currentBatch];
        }

        // Fetch additional data for all batches
        const batchesWithBarcodes = await Promise.all(
          relatedBatches.map(async (batch) => {
            // Get warehouse data
            const { data: warehouse } = await supabase
              .from('warehouses')
              .select('id, name')
              .eq('id', batch.warehouse_id)
              .single();

            // Get location data
            const { data: location } = await supabase
              .from('warehouse_locations')
              .select('id, zone, floor')
              .eq('id', batch.location_id)
              .single();

            // Get barcodes
            const { data: barcodes } = await supabase
              .from('barcodes')
              .select('barcode')
              .eq('batch_id', batch.id)
              .order('created_at');

            return {
              ...batch,
              product_name: batch.product?.name || 'Unknown Product',
              product_sku: batch.product?.sku || 'N/A',
              warehouse_name: warehouse?.name || 'Unknown Warehouse',
              location_name: location ? `Floor ${location.floor} - Zone ${location.zone}` : 'Unknown Location',
              barcodes: barcodes?.map(b => b.barcode) || []
            };
          })
        );

        return batchesWithBarcodes;
      } else {
        // If no batchId is provided, show recent batches
        const { data: recentBatches, error: recentError } = await supabase
          .from('processed_batches')
          .select(`
            *,
            product:products(id, name, sku)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          toast.error(`Error loading recent batches: ${recentError.message}`);
          throw recentError;
        }

        // Fetch additional data for all batches
        const batchesWithBarcodes = await Promise.all(
          (recentBatches || []).map(async (batch) => {
            // Get warehouse data
            const { data: warehouse } = await supabase
              .from('warehouses')
              .select('id, name')
              .eq('id', batch.warehouse_id)
              .single();

            // Get location data
            const { data: location } = await supabase
              .from('warehouse_locations')
              .select('id, zone, floor')
              .eq('id', batch.location_id)
              .single();

            // Get barcodes
            const { data: barcodes } = await supabase
              .from('barcodes')
              .select('barcode')
              .eq('batch_id', batch.id)
              .order('created_at');

            return {
              ...batch,
              product_name: batch.product?.name || 'Unknown Product',
              product_sku: batch.product?.sku || 'N/A',
              warehouse_name: warehouse?.name || 'Unknown Warehouse',
              location_name: location ? `Floor ${location.floor} - Zone ${location.zone}` : 'Unknown Location',
              barcodes: barcodes?.map(b => b.barcode) || []
            };
          })
        );

        return batchesWithBarcodes;
      }
    }
  });

  // Handle data when it becomes available
  useEffect(() => {
    if (batches && batches.length > 0) {
      setAllBatches(batches);
      // If a specific batch was requested, select it
      if (batchId) {
        setSelectedBatchId(batchId);
      } else {
        // Otherwise select the first batch
        setSelectedBatchId(batches[0].id);
      }
    }
  }, [batches, batchId]);
  
  // Get the currently selected batch
  const batch = allBatches.find(b => b.id === selectedBatchId) || null;

  const generatePdf = (batchesToInclude: BatchData[] = []) => {
    // If no batches specified, use the currently selected batch
    const batchesToProcess = batchesToInclude.length > 0 ? batchesToInclude : (batch ? [batch] : []);
    
    if (batchesToProcess.length === 0) return;
    
    setIsGeneratingPdf(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;
      
      // Add title for multiple batches
      doc.setFontSize(18);
      if (batchesToProcess.length === 1) {
        doc.text(`${batchesToProcess[0].product_name} - Batch #${batchesToProcess[0].batch_number}`, margin, yPos);
      } else {
        doc.text(`Barcodes for ${batchesToProcess.length} Batches`, margin, yPos);
      }
      yPos += 10;
      
      // Add generation date
      doc.setFontSize(11);
      doc.setTextColor(100);
      const date = new Date().toLocaleDateString();
      doc.text(`Generated on: ${date}`, margin, yPos);
      yPos += 15;
      
      // Process each batch
      for (let i = 0; i < batchesToProcess.length; i++) {
        const currentBatch = batchesToProcess[i];
        
        // Check if we need a new page
        if (i > 0) {
          doc.addPage();
          yPos = 20;
        }
        
        // Add batch header
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`Batch #${currentBatch.batch_number} - ${currentBatch.product_name}`, margin, yPos);
        yPos += 8;
        
        // Add batch metadata
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Warehouse: ${currentBatch.warehouse_name} | Location: ${currentBatch.location_name}`, margin, yPos);
        yPos += 6;
        doc.text(`Quantity per box: ${currentBatch.quantity_per_box} | Total boxes: ${currentBatch.total_boxes}`, margin, yPos);
        yPos += 10;
        
        // Add table headers
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Box #', margin, yPos);
        doc.text('Barcode', margin + 20, yPos);
        doc.text('Qty', pageWidth - margin - 20, yPos, { align: 'right' });
        yPos += 7;
        
        // Add divider line
        doc.setDrawColor(200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
        
        // Reset font for content
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        
        // Add barcodes
        currentBatch.barcodes.forEach((barcode, index) => {
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
            
            // Re-add the headers on the new page
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Box #', margin, yPos);
            doc.text('Barcode', margin + 20, yPos);
            doc.text('Qty', pageWidth - margin - 20, yPos, { align: 'right' });
            yPos += 7;
            
            // Add divider line
            doc.setDrawColor(200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
            
            // Reset font for content
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
          }
          
          doc.text((index + 1).toString(), margin, yPos);
          doc.text(barcode, margin + 20, yPos);
          doc.text(currentBatch.quantity_per_box.toString(), pageWidth - margin - 20, yPos, { align: 'right' });
          yPos += 7;
        });
      }
      
      // Save the PDF
      const filename = batchesToProcess.length === 1 
        ? `batch-${batchesToProcess[0].batch_number}-barcodes.pdf`
        : `multiple-batches-barcodes.pdf`;
      
      doc.save(filename);
      
      toast.success(`PDF with ${batchesToProcess.length} batch(es) generated successfully`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading batch data: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!batch) {
    return <div className="p-4">Batch not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => generatePdf()}
            disabled={isGeneratingPdf || !batch}
            className="gap-2"
          >
            {isGeneratingPdf ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Current Batch
              </>
            )}
          </Button>
          
          {allBatches.length > 1 && (
            <Button 
              onClick={() => generatePdf(allBatches)}
              disabled={isGeneratingPdf}
              variant="secondary"
              className="gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download All Batches
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {allBatches.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {allBatches.map((b) => (
            <Button 
              key={b.id} 
              variant={selectedBatchId === b.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedBatchId(b.id)}
            >
              Batch #{b.batch_number}
            </Button>
          ))}
        </div>
      )}
    
      {batch ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {batch.product_name}
                  <Badge variant="outline">Batch #{batch.batch_number}</Badge>
                </CardTitle>
                <CardDescription className="mt-2">
                  {batch.total_boxes} boxes • {batch.quantity_per_box} items per box • {batch.total_boxes * batch.quantity_per_box} total items
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Warehouse</p>
                <p className="font-medium">{batch.warehouse_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{batch.location_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
                  {batch.status}
                </Badge>
              </div>
              {batch.color && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-medium">{batch.color}</p>
                </div>
              )}
              {batch.size && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{batch.size}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Barcodes</h3>
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Box #</TableHead>
                      <TableHead>Barcode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.barcodes.length > 0 ? (
                      batch.barcodes.map((barcode, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{barcode}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                          No barcodes found for this batch
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4">No batch data found</div>
      )}
    </div>
  );
};

export default BatchBarcodesViewer;
