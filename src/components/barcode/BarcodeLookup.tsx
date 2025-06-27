import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, X, QrCode } from 'lucide-react';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { executeQuery, supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BatchItem {
  id: string;
  barcode?: string;
  barcode_id?: string;
  product_id?: string;
  product_name: string;
  product_sku?: string;
  product_description?: string;
  product_category?: string[];
  batch_id?: string;
  batch_number?: string;
  batch_item_id?: string;
  barcode_batch_id?: string;
  box_id?: string;
  quantity: number;
  location_id?: string;
  location_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  floor?: string | number;
  zone?: string;
  color?: string;
  size?: string;
  status?: string;
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
      // Use the barcode_batch_view to get all details in a single query
      let barcodeData = null;
      const { error } = await executeQuery('barcode-lookup', async (supabase) => {
        console.log('Looking up barcode in barcode_batch_view:', barcodeValue.trim());
        
        // First try exact match in barcode_batch_view
        const result = await supabase
          .from('barcode_batch_view')
          .select('*')
          .eq('barcode', barcodeValue.trim());
        
        console.log('Barcode batch view result:', result);
        
        if (result.data && result.data.length > 0) {
          console.log('Found exact match in barcode_batch_view:', result.data[0]);
          barcodeData = result.data[0];
          return result.data[0];
        }
        
        // If no results found with exact match and barcode is long enough, try partial match
        if (!barcodeData) {
          console.log('No exact match found, trying partial match in barcode_batch_view');
          const partialResult = await supabase
            .from('barcode_batch_view')
            .select('*')
            .like('barcode', `%${barcodeValue.trim()}%`)
            .limit(1);
          
          if (partialResult.data && partialResult.data.length > 0) {
            console.log('Found partial match in barcode_batch_view:', partialResult.data[0]);
            barcodeData = partialResult.data[0];
            return partialResult.data[0];
          }
        }
        
        // If still no results, fall back to the direct barcodes table query
        if (!barcodeData) {
          console.log('No match in barcode_batch_view, trying barcodes table');
          const fallbackResult = await supabase
            .from('barcodes')
            .select(`
              id, barcode, product_id, box_id, batch_id, created_at, updated_at,
              products:product_id(name, sku, description)
            `)
            .eq('barcode', barcodeValue.trim());
            
          if (fallbackResult.data && fallbackResult.data.length > 0) {
            console.log('Found match in barcodes table:', fallbackResult.data[0]);
            barcodeData = fallbackResult.data[0];
            return fallbackResult.data[0];
          }
        }
        
        // Try one more time with a partial match in the barcodes table
        if (!barcodeData) {
          const partialBarcodeResult = await supabase
            .from('barcodes')
            .select(`
              id, barcode, product_id, box_id, batch_id, created_at, updated_at,
              products:product_id(name, sku, description)
            `)
            .like('barcode', `%${barcodeValue.trim()}%`)
            .limit(1);
            
          if (partialBarcodeResult.data && partialBarcodeResult.data.length > 0) {
            console.log('Found partial match in barcodes table:', partialBarcodeResult.data[0]);
            barcodeData = partialBarcodeResult.data[0];
            return partialBarcodeResult.data[0];
          }
        }
        
        return null;
            
      });

      if (error) {
        console.error('Database error:', error);
        throw new Error(error.message || 'Failed to fetch barcode details');
      }

      // Use the barcodeData variable instead of data from executeQuery
      if (!barcodeData) {
        console.log('No barcode match found in any table');
        
        // Show a more user-friendly error message
        toast({
          variant: 'destructive',
          title: 'Barcode Not Found',
          description: 'The scanned barcode was not found in the system. Please check the barcode and try again.',
        });
        
        // Don't throw an error, just return early
        setIsLoading(false);
        return;
      }

      console.log('Barcode data found:', barcodeData);
      console.log('Full barcode data:', JSON.stringify(barcodeData));
      
      // Log the full data structure to understand what fields are available
      console.log('Data structure from barcode lookup:', barcodeData);
      
      // Create a temporary batch item object that we'll update with location and warehouse names
      let batchItemData: BatchItem = {
        id: barcodeData.batch_item_id || barcodeData.barcode_id || 'unknown-id',
        barcode: barcodeValue,
        barcode_id: barcodeData.barcode_id || '',
        product_id: barcodeData.product_id || '',
        product_name: barcodeData.product_name || 'Unknown Product',
        product_sku: barcodeData.product_sku || '',
        product_description: barcodeData.product_description || '',
        product_category: barcodeData.product_category || [],
        batch_id: barcodeData.batch_id || '',
        batch_number: barcodeData.batch_number || '',
        batch_item_id: barcodeData.batch_item_id || '',
        barcode_batch_id: barcodeData.barcode_batch_id || '',
        box_id: barcodeData.box_id || '',
        quantity: barcodeData.quantity || 0,
        location_id: barcodeData.location_id || '',
        location_name: barcodeData.location_name || 'Unknown Location',
        warehouse_id: barcodeData.warehouse_id || '',
        warehouse_name: barcodeData.warehouse_name || 'Unknown Warehouse',
        color: barcodeData.color || '',
        size: barcodeData.size || '',
        status: barcodeData.status || '',
        created_at: barcodeData.created_at || '',
        updated_at: barcodeData.updated_at || ''
      };
      
      console.log('Initial batch item data:', batchItemData);
      
      // Fetch location name if we have a location ID
      if (barcodeData.location_id) {
        console.log('Fetching location name for ID:', barcodeData.location_id);
        try {
          // Define the type for warehouse_locations table data
          type WarehouseLocation = {
            id: string;
            warehouse_id: string;
            name: string;
            description?: string;
            is_active: boolean;
            created_at: string;
            updated_at: string;
            floor?: number;
            zone?: string;
            sno?: number;
          };

          // Try to get location from warehouse_locations table
          const { data: warehouseLocationData, error: warehouseLocationError } = await supabase
            .from('warehouse_locations')
            .select('name, floor, zone, warehouse_id')
            .eq('id', barcodeData.location_id);
            
          if (warehouseLocationError) {
            console.error('Error fetching from warehouse_locations:', warehouseLocationError);
          } else if (warehouseLocationData && warehouseLocationData.length > 0) {
            // Use type assertion with a more specific type that matches the query result
            const locationData = warehouseLocationData[0] as {
              name?: string;
              floor?: number | string;
              zone?: string;
              warehouse_id?: string;
            };
            console.log('Found location in warehouse_locations table:', locationData);
            
            // Update location name with more detailed information if available
            let locationName = locationData.name;
            
            
            batchItemData.location_name = locationName;
            
            // If we have a warehouse ID from the location but not from the barcode data,
            // update the warehouse ID to ensure we get the correct warehouse
            if (locationData.warehouse_id && !batchItemData.warehouse_id) {
              batchItemData.warehouse_id = locationData.warehouse_id;
              
              // Fetch the warehouse name for this updated ID
              console.log('Fetching warehouse name for ID from location:', batchItemData.warehouse_id);
              const { data: warehouseData, error } = await supabase
                .from('warehouses')
                .select('name')
                .eq('id', batchItemData.warehouse_id);
                
              if (error) {
                console.error('Error fetching warehouse from location reference:', error);
              } else if (warehouseData && warehouseData.length > 0) {
                console.log('Found warehouse name from location reference:', warehouseData[0].name);
                batchItemData.warehouse_name = warehouseData[0].name;
              }
            }
          } else {
            // Fallback to locations table if not found in warehouse_locations
            console.log('Location not found in warehouse_locations, checking locations table');
            const { data: locationData, error } = await supabase
              .from('locations')
              .select('name')
              .eq('id', barcodeData.location_id);
              
            if (error) {
              console.error('Error fetching from locations:', error);
            } else if (locationData && locationData.length > 0) {
              console.log('Found location name in locations table:', locationData[0].name);
              batchItemData.location_name = locationData[0].name;
            }
          }
        } catch (err) {
          console.error('Exception fetching location:', err);
        }
      }
      
      // Fetch warehouse name if we have a warehouse ID
      if (barcodeData.warehouse_id) {
        console.log('Fetching warehouse name for ID:', barcodeData.warehouse_id);
        try {
          const { data: warehouseData, error } = await supabase
            .from('warehouses')
            .select('name')
            .eq('id', barcodeData.warehouse_id);
            
          if (error) {
            console.error('Error fetching warehouse:', error);
          } else if (warehouseData && warehouseData.length > 0) {
            console.log('Found warehouse name:', warehouseData[0].name);
            batchItemData.warehouse_name = warehouseData[0].name;
          }
        } catch (err) {
          console.error('Exception fetching warehouse:', err);
        }
      }

      // Now set the batch item with all the data including fetched location and warehouse names
      console.log('Final batch item data:', batchItemData);
      setBatchItem(batchItemData);
      
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
                    <QrCode className="h-4 w-4" />
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
                  <QrCode className="h-4 w-4" />
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
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Product</Label>
                  <div className="text-lg font-semibold">{batchItem.product_name}</div>
                </div>
                
                {batchItem.product_sku && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                    <div>{batchItem.product_sku}</div>
                  </div>
                )}
                
                {batchItem.product_description && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                    <div className="text-sm">{batchItem.product_description}</div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  {batchItem.color && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Color</Label>
                      <div>{batchItem.color}</div>
                    </div>
                  )}
                  
                  {batchItem.size && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Size</Label>
                      <div>{batchItem.size}</div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <div className="text-lg font-semibold">{batchItem.quantity}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Batch</Label>
                  <div>{batchItem.batch_number || `BATCH-${batchItem.batch_id?.substring(0, 6)}`}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Warehouse</Label>
                  <div>{batchItem.warehouse_name}</div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <div>{batchItem.location_name}</div>
                </div>
                
                {batchItem.status && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant="outline" className="capitalize">
                        {batchItem.status}
                      </Badge>
                    </div>
                  </div>
                )}
                
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
