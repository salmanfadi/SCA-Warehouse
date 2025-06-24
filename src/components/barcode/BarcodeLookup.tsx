import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { executeQuery } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface BatchItem {
  id: string;
  barcode?: string;
  product_id?: string;
  product_name: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  location_id?: string;
  location_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  floor?: string | number;
  zone?: string;
  created_at?: string;
  updated_at?: string;
}

interface BarcodeLookupProps {
  title?: string;
}

const BarcodeLookup: React.FC<BarcodeLookupProps> = ({ 
  title = "Barcode Lookup"
}) => {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [batchItem, setBatchItem] = useState<BatchItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleBarcodeScanned = (scannedBarcode: string) => {
    console.log('Barcode scanned:', scannedBarcode);
    setBarcode(scannedBarcode);
    setShowScanner(false); // Hide scanner after successful scan
    handleBarcodeSubmit(scannedBarcode);
  };

  const handleBarcodeSubmit = async (barcodeValue: string) => {
    if (!barcodeValue) {
      toast({
        variant: 'destructive',
        title: 'Empty Barcode',
        description: 'Please enter a valid barcode',
      });
      return;
    }

    console.log('Submitting barcode:', barcodeValue);
    setIsLoading(true);

    try {
      // Use the optimized function to get all details in a single query
      const { data, error } = await executeQuery('barcodes-fast', async (supabase) => {
        // Try the optimized function first
        const result = await supabase.rpc('get_barcode_details_fast', {
          p_barcode: barcodeValue.trim()
        });
        
        console.log('RPC function result:', result);
        
        // If the function doesn't exist, fall back to the direct query
        if (result.error && result.error.message.includes('does not exist')) {
          console.log('Using fallback query method');
          return await supabase
            .from('barcodes')
            .select(`
              id, barcode, product_id, batch_id, quantity, warehouse_id, location_id, created_at, updated_at,
              products:product_id(name),
              warehouses:warehouse_id(name),
              warehouse_locations:location_id(name)
            `)
            .eq('barcode', barcodeValue.trim())
            .single();
        }
        
        // If no results found with exact match and barcode is short, try partial match
        if (!result.data && barcodeValue.length < 19) {
          console.log('No exact match found, trying partial match in fallback');
          const partialResult = await supabase
            .from('barcodes')
            .select(`
              id, barcode, product_id, batch_id, quantity, warehouse_id, location_id, created_at, updated_at,
              products:product_id(name),
              warehouses:warehouse_id(name),
              warehouse_locations:location_id(name)
            `)
            .like('barcode', `%${barcodeValue.trim()}%`)
            .limit(1);
            
          if (partialResult.data && partialResult.data.length > 0) {
            console.log('Found partial match:', partialResult.data[0]);
            return partialResult.data[0];
          }
        }
        
        return result;
      });

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to fetch barcode details');
      }

      if (!data) {
        console.log('No exact barcode match found, trying partial match...');
        
        // Try a partial match if the barcode is short (likely a misread)
        if (barcodeValue.length < 19 && /^\d+$/.test(barcodeValue)) {
          const { data: partialMatches } = await executeQuery('partial-barcode-match', async (supabase) => {
            return await supabase
              .from('barcodes')
              .select('*')
              .like('barcode', `%${barcodeValue}%`)
              .limit(5);
          });
          
          if (partialMatches && partialMatches.length > 0) {
            console.log('Found potential barcode matches:', partialMatches);
            
            // If there's only one match, use it automatically
            if (partialMatches.length === 1) {
              console.log('Using the single partial match:', partialMatches[0].barcode);
              return handleBarcodeSubmit(partialMatches[0].barcode);
            } else {
              // Show options to the user
              setIsLoading(false);
              toast({
                title: 'Multiple Matches Found',
                description: 'Please select the correct barcode from the list below',
              });
              
              // Display potential matches (implementation depends on your UI)
              // For now, just use the first match
              return handleBarcodeSubmit(partialMatches[0].barcode);
            }
          }
        }
        
        throw new Error('No barcode found with this value');
      }

      console.log('Barcode data found:', data);
      console.log('Full barcode data:', JSON.stringify(data));
      
      // Extract actual names from the response
      const batchItem: BatchItem = {
        id: data.id,
        barcode: data.barcode,
        product_id: data.product_id,
        product_name: data.product_name || data.products?.name || 'Unknown Product',
        batch_id: data.batch_id,
        batch_number: data.batch_id ? `BATCH-${data.batch_id.substring(0, 6)}` : 'N/A',
        quantity: data.quantity || 0,
        location_id: data.location_id,
        location_name: data.location_name || (data.locations && data.locations.name) || 'Loading...',
        warehouse_id: data.warehouse_id,
        warehouse_name: data.warehouse_name || data.warehouses?.name || 'Unknown',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      
      // Use the location name from the initial query if available
      if (data.location_name) {
        console.log('Using location name from initial query:', data.location_name);
        batchItem.location_name = data.location_name;
      } else if (data.locations && data.locations.name) {
        console.log('Using location name from relationship data:', data.locations.name);
        batchItem.location_name = data.locations.name;
      } else if (data.location_id) {
        // If we have a location ID but no name, fetch it from warehouse_locations
        console.log('Fetching location name from warehouse_locations for ID:', data.location_id);
        executeQuery('warehouse-location-name', async (supabase) => {
          try {
            const { data: locationData, error } = await supabase
              .from('warehouse_locations')
              .select('name')
              .eq('id', data.location_id)
              .single();
              
            if (error) {
              console.error('Error fetching warehouse location:', error);
              return;
            }
            
            if (locationData?.name) {
              console.log('Found warehouse location name:', locationData.name);
              setBatchItem(prev => prev ? {
                ...prev,
                location_name: locationData.name
              } : prev);
            }
          } catch (err) {
            console.error('Exception fetching warehouse location:', err);
          }
        });
        
        // Use a placeholder while fetching
        batchItem.location_name = 'Loading location...';
      } else {
        batchItem.location_name = 'Not specified';
      }

      console.log('Setting batch item:', batchItem);
      setBatchItem(batchItem);
      
    } catch (error) {
      console.error('Error in handleBarcodeSubmit:', error);
      
      let errorMessage = 'An error occurred while processing the barcode.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      
      setBatchItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-4">
      <div className="relative">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{title}</span>
              <Button 
                onClick={() => setShowScanner(!showScanner)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {showScanner ? (
                  <>
                    <X className="h-4 w-4" />
                    Close Camera
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Open Camera
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showScanner ? (
              <MobileBarcodeScanner
                onBarcodeScanned={handleBarcodeScanned}
                allowManualEntry={true}
                inputValue={barcode}
                onInputChange={(e) => setBarcode(e.target.value)}
                scanButtonLabel="Scan Barcode"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Enter barcode manually"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleBarcodeSubmit(barcode)}
                  disabled={!barcode.trim() || isLoading}
                >
                  Submit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Scan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {batchItem && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Item Details</span>
              <Badge variant="outline" className="ml-2">
                {batchItem.barcode}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Product</Label>
                  <div className="text-lg font-semibold">{batchItem.product_name}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Batch</Label>
                  <div>{batchItem.batch_number}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <div className="text-lg font-semibold">{batchItem.quantity}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Warehouse</Label>
                  <div>{batchItem.warehouse_name}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <div>{batchItem.location_name}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <div className="text-sm">{formatDate(batchItem.created_at)}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <div className="text-sm">{formatDate(batchItem.updated_at)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BarcodeLookup;
