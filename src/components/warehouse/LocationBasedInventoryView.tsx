import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  SelectGroup 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Warehouse, MapPin, Package2, Search, Loader2, Eye, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// LocationDetailsModal has been removed
import { Input } from '@/components/ui/input';

interface LocationBasedInventoryViewProps {
  initialWarehouseId?: string;
  onWarehouseChange?: (warehouseId: string) => void;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Location {
  id: string;
  zone: string;
  floor: string;
}

// Define proper types to avoid TypeScript errors
type BatchItem = {
  id: string;
  batch_id: string;
  product_id: string;
  quantity: number;
};

interface BatchAtLocation {
  id: string;
  created_at: string;
  location_id: string;
  zone: string;
  floor: string;
  items: BatchItem[];
  totalQuantity: number;
  // Additional properties needed for UI rendering
  batch_id?: string; // Using optional since some code uses id and some uses batch_id
  product_name?: string;
  product_sku?: string;
  quantity?: number; // Some places use quantity instead of totalQuantity
}

interface BatchInfo {
  batch_id: string;
  quantity: number;
  created_at: string;
}

interface LocationDetail {
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  zone: string;
  floor: string;
  quantity: number;
}

export const LocationBasedInventoryView = ({ initialWarehouseId, onWarehouseChange }: LocationBasedInventoryViewProps): JSX.Element => {
  
  // State for filters
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouseId || '');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // State for data
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [batchesByZone, setBatchesByZone] = useState<Record<string, BatchAtLocation[]>>({});
  const [searchResults, setSearchResults] = useState<BatchAtLocation[]>([]);
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  
  // State for location details modal
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    name: string;
    sku: string;
    locationDetails: LocationDetail[];
  } | null>(null);

  // Fetch warehouses on component mount
  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Fetch locations when warehouse selection changes
  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse);
      fetchProductsByLocation(selectedWarehouse, selectedLocation);
      
      // Call the parent component's onWarehouseChange if provided
    }
  }, [selectedWarehouse]);

  // Fetch products by location when warehouse or location changes
  useEffect(() => {
    if (selectedWarehouse) {
      console.log(`LocationBasedInventoryView: Fetching data for warehouse ${selectedWarehouse}, location ${selectedLocation || 'all'}`);
      fetchProductsByLocation(selectedWarehouse, selectedLocation);
      
      // Call the parent component's onWarehouseChange if provided
      if (onWarehouseChange) {
        onWarehouseChange(selectedWarehouse);
      }
    } else {
      // Reset data when no warehouse is selected
      setBatchesByZone({});
      setIsLoading(false);
    }
    
    // Clear search results when filters change
    setSearchResults([]);
    setBatchSearchTerm('');
  }, [selectedWarehouse, selectedLocation, onWarehouseChange]);

  // Fetch all warehouses
  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setWarehouses(data || []);
      
      // If there's an initialWarehouseId or warehouses but no selection, select the first one
      if ((!selectedWarehouse || selectedWarehouse === '') && data && data.length > 0) {
        const warehouseToSelect = initialWarehouseId && data.some(w => w.id === initialWarehouseId) 
          ? initialWarehouseId 
          : data[0].id;
        
        setSelectedWarehouse(warehouseToSelect);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  // Fetch locations for a specific warehouse
  const fetchLocations = async (warehouseId: string) => {
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('id, zone, floor')
        .eq('warehouse_id', warehouseId)
        .order('zone');
      
      if (error) throw error;
      
      // Ensure we're setting valid Location objects
      const validLocations: Location[] = (data || []).map(loc => ({
        id: loc.id,
        zone: loc.zone || '',
        floor: String(loc.floor || '') // Ensure floor is always a string
      }));
      
      setLocations(validLocations);
      
      // Reset location selection when warehouse changes
      setSelectedLocation('');
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Fetch batches by location with correct relationships
  const fetchProductsByLocation = async (warehouseId: string, locationId: string = '') => {
    setIsLoading(true);
    setBatchesByZone({}); // Clear previous data
    
    try {
      if (!warehouseId) {
        console.log('No warehouse selected');
        setIsLoading(false);
        return;
      }
      
      console.log(`Fetching batches for warehouse ${warehouseId}, location ${locationId || 'all'}`);
      
      // First, get warehouse locations to ensure we have zone/floor data
      const { data: locationsData, error: locError } = await supabase
        .from('warehouse_locations')
        .select('id, zone, floor')
        .eq('warehouse_id', warehouseId);
        
      if (locError) {
        console.error('Error fetching warehouse locations:', locError);
        setIsLoading(false);
        return;
      }
      
      // Create a map of locations by ID
      const locationMap: Record<string, {id: string, zone: string, floor: string}> = {};
      if (locationsData) {
        locationsData.forEach(loc => {
          locationMap[loc.id] = {
            id: loc.id,
            zone: loc.zone || 'Unknown Zone',
            floor: String(loc.floor || 'Unknown Floor')
          };
        });
      }
      
      // Now fetch batches with a simpler query
      // Define the query type explicitly to avoid excessive type instantiation
      type BatchData = {
        id: string;
        created_at: string;
        location_id: string | null;
      };
      
      // Fetch batches with a simpler approach to avoid type instantiation errors
      // Use the standard Supabase query but with explicit typing to avoid excessive type instantiation
      let query = supabase
        .from('processed_batches')
        .select('id, created_at, warehouse_id, location_id')
        .eq('warehouse_id', warehouseId);
      
      // Execute the query
      const result = await query;
      const batchData = result.data;
      const batchError = result.error;
      
      if (batchError) {
        console.error('Error fetching batches:', batchError);
        setIsLoading(false);
        return;
      }
      
      // Create a properly typed array of batch data
      const typedBatchData: BatchData[] = [];
      
      if (Array.isArray(batchData)) {
        batchData.forEach((item: any) => {
          if (item) {
            typedBatchData.push({
              id: String(item.id || ''),
              created_at: String(item.created_at || new Date().toISOString()),
              location_id: item.location_id ? String(item.location_id) : null
            });
          }
        });
      }
      
      // Get all batch IDs for fetching items
      const batchIds = typedBatchData.map(batch => batch.id);
      
      // Fetch batch items with explicit typing
      const { data: batchItemsData, error: batchItemsError } = await supabase
        .from('batch_items')
        .select(`
          id, 
          batch_id, 
          product_id, 
          quantity
        `);
      
      if (batchItemsError) {
        console.error('Error fetching batch items:', batchItemsError);
        setIsLoading(false);
        return;
      }
      
      // Safely type the batch items data
      const typedBatchItemsData = Array.isArray(batchItemsData)
        ? (batchItemsData as unknown as BatchItem[])
        : [];
      
      // Group batch items by batch_id for easier lookup
      const batchItemsMap: Record<string, BatchItem[]> = {};
      typedBatchItemsData.forEach(item => {
        if (!batchItemsMap[item.batch_id]) {
          batchItemsMap[item.batch_id] = [];
        }
        batchItemsMap[item.batch_id].push(item);
      });
      
      // Process batches and group by zone
      const batchesByZoneData: Record<string, BatchAtLocation[]> = {};
      
      try {
        for (const batch of typedBatchData) {
          // Handle missing location_id by assigning a default location
          if (!batch.location_id || !locationMap[batch.location_id]) {
            console.warn(`Batch ${batch.id} has no valid location_id, assigning default`);
            batch.location_id = Object.keys(locationMap)[0] || '';
          }
          
          // Get location info
          const zone = locationMap[batch.location_id].zone;
          const floor = locationMap[batch.location_id].floor;
          
          // Get items for this batch
          const batchItems = batchItemsMap[batch.id] || [];
          const totalQuantity = batchItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
          
          // Create batch with items object
          const batchWithItems: BatchAtLocation = {
            id: batch.id,
            batch_id: batch.id, // Add batch_id field
            created_at: batch.created_at,
            location_id: batch.location_id,
            zone,
            floor,
            items: batchItems,
            totalQuantity,
            quantity: totalQuantity, // Add quantity field
            product_name: `Product ${batch.id.substring(0, 5)}`, // Add product_name
            product_sku: `SKU-${batch.id.substring(0, 5)}` // Add product_sku
          };
          
          // Add to zone group
          if (!batchesByZoneData[zone]) {
            batchesByZoneData[zone] = [];
          }
          batchesByZoneData[zone].push(batchWithItems);
        }
        
        // Update state with processed data
        setBatchesByZone(batchesByZoneData);
      } catch (error) {
        console.error('Error processing batch data:', error);
      } finally {
        setIsLoading(false);
      }
      
      console.log('Batches grouped by zone:', batchesByZoneData);
      
      // Check if we have any data to display
      if (Object.keys(batchesByZoneData).length === 0) {
        console.log('No batches found with valid location data');
      }
      
      // Clear search results when data changes
      setSearchResults([]);
      setBatchSearchTerm('');
      setIsSearching(false);
    } catch (error) {
      console.error('Error in fetchInventoryData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle batch search
  
  const handleBatchSearch = async () => {
    if (!batchSearchTerm.trim() || !selectedWarehouse) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // First check if we already have the batch in our local data
      const allBatches = Object.values(batchesByZone).flat();
      const localMatches = allBatches.filter(batch => 
        batch.id.toLowerCase().includes(batchSearchTerm.toLowerCase())
      );
      
      if (localMatches.length > 0) {
        console.log('Found matches in local data:', localMatches);
        setSearchResults(localMatches);
      } else {
        // If not found locally, search in the database
        console.log('Searching for batch in database:', batchSearchTerm);
        
        // First fetch locations to create a location map
        const { data: locationData } = await supabase
          .from('warehouse_locations')
          .select('id, zone, floor')
          .eq('warehouse_id', selectedWarehouse);
          
        // Create a map of location_id to location details
        const locationMap: Record<string, { zone: string, floor: string }> = {};
        if (Array.isArray(locationData)) {
          locationData.forEach(loc => {
            locationMap[loc.id] = {
              zone: loc.zone || 'Unknown',
              floor: String(loc.floor || 'Unknown')
            };
          });
        }
        
        // Define the batch type to avoid TypeScript errors
        type BatchSearchResult = {
          id: string;
          warehouse_id: string;
          location_id: string | null;
        };
        
        const { data: batchData, error: batchError } = await supabase
          .from('processed_batches')
          .select('id, warehouse_id, location_id')
          .eq('warehouse_id', selectedWarehouse)
          .ilike('id', `%${batchSearchTerm}%`);

        if (batchError) {
          console.error('Error searching for batches:', batchError);
          setSearchResults([]);
          return;
        }

        // Safely type the batch data
        const typedBatchData = Array.isArray(batchData) 
          ? (batchData as unknown as BatchSearchResult[])
          : [];

        if (typedBatchData.length === 0) {
          console.log('No matching batches found in database');
          setSearchResults([]);
          return;
        }

        // For each batch, get its items
        const batchesWithItems = await Promise.all(typedBatchData.map(async (batch) => {
          const { data: itemsData } = await supabase
            .from('batch_items')
            .select('id, batch_id, product_id, quantity')
            .eq('batch_id', batch.id);

          // Type the items data safely
          const typedItemsData = Array.isArray(itemsData)
            ? (itemsData as unknown as BatchItem[])
            : [];
            
          const totalQuantity = typedItemsData.reduce((sum, item) => sum + (item.quantity || 0), 0);

          // Get location info
          let zone = 'Unknown';
          let floor = 'Unknown';
          
          if (batch.location_id && locationMap[batch.location_id]) {
            zone = locationMap[batch.location_id].zone;
            floor = locationMap[batch.location_id].floor;
          }

          // Create a batch object with all required properties
          return {
            ...batch,
            items: typedItemsData,
            totalQuantity,
            zone,
            floor,
            created_at: new Date().toISOString(), // Add created_at field
            batch_id: batch.id, // Add batch_id field
            quantity: totalQuantity, // Add quantity field
            product_name: 'Product ' + batch.id.substring(0, 5), // Placeholder
            product_sku: 'SKU-' + batch.id.substring(0, 5) // Placeholder
          } as BatchAtLocation;
        }));
        
        console.log('Found batches in database:', batchesWithItems);
        setSearchResults(batchesWithItems);
      }
    } catch (error) {
      console.error('Error in batch search:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  
  // Handle view batch details
  const handleViewBatchDetails = (batch: BatchAtLocation) => {
    // Find the location that matches the batch's zone and floor
    const location = locations.find(loc => loc.zone === batch.zone && loc.floor === batch.floor);
    
    if (!location) {
      console.error('Location not found for zone:', batch.zone, 'floor:', batch.floor);
      return;
    }
    
    // Get the warehouse name
    const warehouseName = warehouses.find(w => w.id === selectedWarehouse)?.name || 'Unknown Warehouse';
    
    // Create location details for the modal
    const locationDetails: LocationDetail[] = [{
      warehouseId: selectedWarehouse,
      warehouseName: warehouseName,
      locationId: location.id,
      zone: batch.zone,
      floor: batch.floor,
      quantity: batch.totalQuantity || batch.quantity || 0
    }];
    
    // Set the product information for the modal
    setSelectedProduct({
      name: batch.product_name || 'Batch Details',
      sku: batch.batch_id || batch.id,
      locationDetails
    });
    
    // Show the modal
    setShowLocationModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Warehouse and Location Selection */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="warehouse-select">Warehouse</Label>
          <Select
            value={selectedWarehouse}
            onValueChange={(value) => {
              setSelectedWarehouse(value);
              setSelectedLocation('');
              onWarehouseChange?.(value);
            }}
          >
            <SelectTrigger id="warehouse-select">
              <SelectValue placeholder="Select Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <Label htmlFor="location-select">Location (Optional)</Label>
          <Select
            value={selectedLocation}
            onValueChange={setSelectedLocation}
            disabled={!selectedWarehouse || locations.length === 0}
          >
            <SelectTrigger id="location-select">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              <SelectGroup>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    Zone {location.zone} - Floor {location.floor}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        
        {/* Batch Search */}
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a batch by ID"
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBatchSearch()}
              className="max-w-md"
            />
            <Button 
              onClick={handleBatchSearch}
              disabled={!batchSearchTerm.trim() || isSearching || !selectedWarehouse}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <p className="mt-2 text-sm text-green-600">
              Found {searchResults.length} matching batch{searchResults.length !== 1 ? 'es' : ''}
            </p>
          )}
          {isSearching === false && batchSearchTerm && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-amber-600">
              No batches found matching "{batchSearchTerm}"
            </p>
          )}
        </div>
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {isSearching ? (
            // Search results view
            <div>
              <h3 className="text-lg font-medium mb-4">Search Results for "{batchSearchTerm}"</h3>
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p>No batches found matching this ID</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {searchResults.map((batch) => (
                    <Card key={batch.batch_id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Package2 className="h-5 w-5 mr-2 text-primary" />
                            <CardTitle className="text-base">{batch.product_name}</CardTitle>
                          </div>
                          <Badge variant="secondary">{batch.quantity} items</Badge>
                        </div>
                        <CardDescription>
                          SKU: {batch.product_sku} | Floor {batch.floor}, Zone {batch.zone}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Batch ID:</p>
                            <p className="font-mono text-xs">{batch.batch_id}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(batch.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewBatchDetails(batch)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Normal zone-based view
            Object.keys(batchesByZone).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <MapPin className="h-10 w-10 mb-2 opacity-20" />
                <p>No batches found at the selected location</p>
              </div>
            ) : (
              // Display zones as columns in a flex layout
              <div className="flex flex-wrap gap-4">
                {Object.entries(batchesByZone).map(([zone, batches]) => {
                  // Group batches by floor within this zone
                  const batchesByFloor: Record<string, BatchAtLocation[]> = {};
                  batches.forEach(batch => {
                    const floorKey = batch.floor || 'N/A';
                    if (!batchesByFloor[floorKey]) {
                      batchesByFloor[floorKey] = [];
                    }
                    batchesByFloor[floorKey].push(batch);
                  });
                  
                  // Count total batches in this zone
                  const totalBatches = batches.length;
                  // Count total items across all batches in this zone
                  const totalItems = batches.reduce((sum, b) => sum + (b.quantity || b.totalQuantity || 0), 0);
                  
                  return (
                    <div key={zone} className="flex-1 min-w-[300px] max-w-[400px]">
                      <Card className="h-full border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="h-5 w-5 mr-2 text-primary" />
                              <CardTitle>Zone {zone}</CardTitle>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline">{totalBatches} batches</Badge>
                              <Badge variant="secondary">{totalItems} items</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="multiple" className="w-full">
                            {Object.entries(batchesByFloor).map(([floor, floorBatches]) => (
                              <AccordionItem key={`${zone}-${floor}`} value={`${zone}-${floor}`}>
                                <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                                  <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex items-center">
                                      <span>Floor {floor}</span>
                                    </div>
                                    <Badge>{floorBatches.length} batches</Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Batch ID</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {floorBatches.map((batch) => (
                                        <TableRow key={`${batch.batch_id}-${batch.product_sku}`}>
                                          <TableCell className="font-mono text-xs">
                                            {batch.batch_id.substring(0, 8)}...
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <div>{batch.product_name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                SKU: {batch.product_sku}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>{batch.quantity}</TableCell>
                                          <TableCell>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              onClick={() => handleViewBatchDetails(batch)}
                                            >
                                              Details
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
      
      {/* Location Details Modal has been removed */}
      {showLocationModal && selectedProduct && (
        <Dialog open={true} onOpenChange={(open) => {
          if (!open) {
            setShowLocationModal(false);
            // Clear selection when modal is closed to prevent stale data
            setTimeout(() => setSelectedProduct(null), 300);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProduct.name} ({selectedProduct.sku}) Locations</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p>Location details functionality has been removed.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
