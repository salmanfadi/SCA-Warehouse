import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useCompletedStockOutDetails } from '@/hooks/useCompletedStockOutDetails';
import { executeQuery } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Format date helper function
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'PPP');
};

/**
 * Props for the StockOutDetailsView component
 */
interface StockOutDetailsViewProps {
  /**
   * The ID of the stock-out to display details for
   */
  stockOutId: string;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Interface for location information fetched from the database
 */
interface LocationInfo {
  id: string | number;
  barcode: string;
  warehouse_name?: string;
  location_name?: string;
  floor?: string | number;
  zone?: string;
  isLoading: boolean;
  error?: string;
}

/**
 * Custom hook to fetch location information for items missing location data
 * @param items - The processed items to check for missing location data
 * @returns A record of location information indexed by barcode
 */
const useLocationInfo = (items?: any[]): Record<string, LocationInfo> => {
  const [locationInfo, setLocationInfo] = useState<Record<string, LocationInfo>>({});
  
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    // Find items that are missing location data
    const itemsMissingLocation = items.filter(
      item => item.barcode && (!item.location_name || !item.warehouse_name)
    );

    // Get unique barcodes to avoid duplicate queries
    const uniqueBarcodes = [...new Set(itemsMissingLocation.map(item => item.barcode))].filter(Boolean);

    // For each unique barcode missing location, fetch from inventory using MCP server
    uniqueBarcodes.forEach(async (barcode) => {
      if (!barcode || locationInfo[barcode]) return;

      // Mark this barcode as loading
      setLocationInfo(prev => ({
        ...prev,
        [barcode]: { id: barcode, barcode, isLoading: true }
      }));

      try {
        console.log(`[useLocationInfo] Fetching location info for barcode: ${barcode}`);
        
        // First, get the warehouse_id from inventory table
        const { data: inventoryData, error: inventoryError } = await executeQuery('fetch-inventory-data', async (supabase) => {
          return await supabase
            .from('inventory')
            .select('id, barcode, warehouse_id, location_id')
            .eq('barcode', barcode)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        });

        if (inventoryError) {
          console.error(`[useLocationInfo] Error fetching from inventory table:`, inventoryError);
          throw inventoryError;
        }

        console.log(`[useLocationInfo] Inventory data for barcode ${barcode}:`, inventoryData);

        if (inventoryData && inventoryData.warehouse_id) {
          console.log(`[useLocationInfo] Found warehouse_id: ${inventoryData.warehouse_id} for barcode: ${barcode}`);
          
          // If we have a warehouse_id, directly query the warehouses table
          const { data: warehouseData, error: warehouseError } = await executeQuery('fetch-warehouse-data', async (supabase) => {
            return await supabase
              .from('warehouses')
              .select('id, name')
              .eq('id', inventoryData.warehouse_id)
              .single();
          });

          if (warehouseError) {
            console.error(`[useLocationInfo] Error fetching warehouse data for id ${inventoryData.warehouse_id}:`, warehouseError);
            throw warehouseError;
          }
          
          console.log(`[useLocationInfo] Warehouse data:`, warehouseData);

          // Also get location data if we have location_id
          let locationData = null;
          if (inventoryData.location_id) {
            console.log(`[useLocationInfo] Found location_id: ${inventoryData.location_id} for barcode: ${barcode}`);
            
            const { data: locData, error: locError } = await executeQuery('fetch-location-data', async (supabase) => {
              return await supabase
                .from('warehouse_locations')
                .select('id, name, floor, zone')
                .eq('id', inventoryData.location_id)
                .single();
            });
            
            if (locError) {
              console.error(`[useLocationInfo] Error fetching location data for id ${inventoryData.location_id}:`, locError);
            } else {
              console.log(`[useLocationInfo] Location data:`, locData);
              locationData = locData;
            }
          } else {
            console.log(`[useLocationInfo] No location_id found for barcode: ${barcode}`);
          }

          // Update location info with warehouse and location data
          // Get the warehouse name, ensuring it's not null or undefined
          const warehouseName = warehouseData?.name;
          console.log(`[useLocationInfo] Setting warehouse name for ${barcode} to: ${warehouseName || 'Unknown Warehouse'}`);
          
          // Use a callback to ensure we're working with the latest state
          setLocationInfo(prev => {
            // Check if we already have this barcode with a valid warehouse name
            const existingInfo = prev[barcode];
            const newWarehouseName = warehouseName || 
              (existingInfo?.warehouse_name && existingInfo.warehouse_name !== 'Unknown Warehouse' ? 
                existingInfo.warehouse_name : 'Unknown Warehouse');
                
            return {
              ...prev,
              [barcode]: {
                id: inventoryData.id,
                barcode,
                warehouse_name: newWarehouseName,
                location_name: locationData?.name,
                floor: locationData?.floor,
                zone: locationData?.zone,
                isLoading: false
              }
            };
          });
        } else {
          console.log(`[useLocationInfo] No inventory data or warehouse_id found for barcode: ${barcode}, trying inventory_view fallback`);
          
          // If not found in inventory or no warehouse_id, try inventory_view as fallback
          const { data: viewData, error: viewError } = await executeQuery('fetch-location-info-fallback', async (supabase) => {
            return await supabase
              .from('inventory_view')
              .select('id, barcode, warehouse_name, location_name, floor, zone, warehouse_id')
              .eq('barcode', barcode)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
          });

          if (viewError) {
            console.error(`[useLocationInfo] Error fetching from inventory_view:`, viewError);
            throw viewError;
          }
          
          console.log(`[useLocationInfo] Inventory view data for barcode ${barcode}:`, viewData);

          if (viewData && viewData.warehouse_id) {
            console.log(`[useLocationInfo] Found warehouse_id in view: ${viewData.warehouse_id} for barcode: ${barcode}`);
            
            // If we have a warehouse_id from view, directly query the warehouses table
            const { data: warehouseData, error: warehouseError } = await executeQuery('fetch-warehouse-data-fallback', async (supabase) => {
              return await supabase
                .from('warehouses')
                .select('id, name')
                .eq('id', viewData.warehouse_id)
                .single();
            });

            if (warehouseError) {
              console.error(`[useLocationInfo] Error fetching warehouse data from view for id ${viewData.warehouse_id}:`, warehouseError);
            }
            
            console.log(`[useLocationInfo] Warehouse data from view:`, warehouseData);

            if (!warehouseError && warehouseData) {
              console.log(`[useLocationInfo] Setting warehouse name from warehouses table: ${warehouseData.name}`);
              setLocationInfo(prev => ({
                ...prev,
                [barcode]: {
                  id: viewData.id,
                  barcode,
                  warehouse_name: warehouseData.name,
                  location_name: viewData.location_name,
                  floor: viewData.floor,
                  zone: viewData.zone,
                  isLoading: false
                }
              }));
            } else {
              // Use view data if warehouse query fails
              console.log(`[useLocationInfo] Using view data warehouse name: ${viewData.warehouse_name || 'Unknown Warehouse'}`);
              setLocationInfo(prev => ({
                ...prev,
                [barcode]: {
                  id: viewData.id,
                  barcode,
                  warehouse_name: viewData.warehouse_name || 'Unknown Warehouse',
                  location_name: viewData.location_name,
                  floor: viewData.floor,
                  zone: viewData.zone,
                  isLoading: false
                }
              }));
            }
          } else if (viewData) {
            // Use view data if no warehouse_id
            console.log(`[useLocationInfo] No warehouse_id in view, using view data warehouse name: ${viewData.warehouse_name || 'Unknown Warehouse'}`);
            setLocationInfo(prev => ({
              ...prev,
              [barcode]: {
                id: viewData.id,
                barcode,
                warehouse_name: viewData.warehouse_name || 'Unknown Warehouse',
                location_name: viewData.location_name,
                floor: viewData.floor,
                zone: viewData.zone,
                isLoading: false
              }
            }));
          } else {
            // No location info found for this barcode
            console.log(`[useLocationInfo] No data found for barcode: ${barcode} in inventory or inventory_view`);
            setLocationInfo(prev => ({
              ...prev,
              [barcode]: {
                id: barcode,
                barcode,
                warehouse_name: 'Unknown Warehouse',
                isLoading: false,
                error: 'No location information found'
              }
            }));
          }
        }
      } catch (err) {
        console.error(`[useLocationInfo] CRITICAL ERROR for barcode ${barcode}:`, err);
        console.trace(`[useLocationInfo] Stack trace for error with barcode ${barcode}`);
        
        // Log additional context to help diagnose the issue
        if (err instanceof Error) {
          console.error(`[useLocationInfo] Error message: ${err.message}`);
          console.error(`[useLocationInfo] Error name: ${err.name}`);
          if (err.stack) {
            console.error(`[useLocationInfo] Error stack: ${err.stack}`);
          }
        }
        
        setLocationInfo(prev => ({
          ...prev,
          [barcode]: {
            id: barcode,
            barcode,
            warehouse_name: 'Unknown Warehouse',
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }
        }));
      }
    });
  }, [items]);
  
  return locationInfo;
};

/**
 * Component to display detailed information about a completed stock-out
 * Shows product details, quantities, box codes, location info, and batch metadata
 */

export const StockOutDetailsView: React.FC<StockOutDetailsViewProps> = ({
  stockOutId,
  className,
}): React.ReactNode => {
  const [activeTab, setActiveTab] = useState<string>('order_summary');
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const { data, isLoading, isError, error } = useCompletedStockOutDetails(stockOutId);
  
  // Use our custom hook to fetch location information for items missing location data
  const locationInfo = useLocationInfo(data?.processed_items);
  
  // Force re-render when locationInfo changes to ensure UI updates
  useEffect(() => {
    // This will trigger a re-render when locationInfo changes
    setForceUpdate(prev => prev + 1);
  }, [locationInfo]);

  const renderProcessedItems = () => {
    if (!data || !data.processed_items || data.processed_items.length === 0) {
      return (
        <div className="text-center p-6 border rounded-lg bg-gray-50">
          <div className="mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground">
              <rect width="8" height="8" x="8" y="8" rx="1"></rect>
              <path d="M10.5 8V6a2.5 2.5 0 0 1 5 0v2"></path>
              <path d="M8 13v-1a2 2 0 0 1 4 0v1"></path>
              <path d="M16 13v-1a2 2 0 0 1 4 0v1"></path>
            </svg>
          </div>
          <p className="text-muted-foreground">No processed items found for this stock-out.</p>
          <p className="text-xs text-muted-foreground mt-1">This may be due to a data issue or the order may not be fully processed.</p>
        </div>
      );
    }

    return (
      <div className="overflow-auto max-h-[400px] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="font-bold">Product</TableHead>
              <TableHead className="font-bold">SKU</TableHead>
              <TableHead className="font-bold">Barcode</TableHead>
              <TableHead className="font-bold">Quantity</TableHead>
              <TableHead className="font-bold">Location</TableHead>
              <TableHead className="font-bold">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.processed_items.map(item => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{item.product_name || 'Unknown Product'}</TableCell>
                <TableCell>{item.product_sku || 'N/A'}</TableCell>
                <TableCell>
                  {item.barcode ? (
                    <span className="font-mono text-sm">{item.barcode}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {item.quantity}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {item.location_name ? (
                    <span className="font-medium">{item.location_name}</span>
                  ) : locationInfo[item.barcode]?.location_name ? (
                    <span className="font-medium">{locationInfo[item.barcode].location_name}</span>
                  ) : locationInfo[item.barcode]?.isLoading ? (
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No Location Found</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.color && <div><Badge variant="outline">{item.color}</Badge></div>}
                    {item.notes && (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-blue-600 hover:text-blue-800">View Notes</summary>
                        <pre className="text-xs whitespace-pre-wrap mt-2 p-2 bg-gray-50 rounded border">
                          {typeof item.notes === 'object' ? JSON.stringify(item.notes, null, 2) : item.notes}
                        </pre>
                      </details>
                    )}
                    {!item.color && !item.notes && (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Create a memoized object to track which boxes are used multiple times
  const boxUsageCounts = useMemo(() => {
    if (!data?.processed_items) return {};
    
    return data.processed_items.reduce<Record<string, number>>((acc, item) => {
      const barcode = item.barcode || 'unknown';
      acc[barcode] = (acc[barcode] || 0) + 1;
      return acc;
    }, {});
  }, [data?.processed_items]);

  const renderBoxDetails = () => {
    if (!data || !data.processed_items || data.processed_items.length === 0) {
      return (
        <div className="text-center p-6 border rounded-lg bg-gray-50">
          <div className="mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground">
              <rect width="8" height="8" x="8" y="8" rx="1"></rect>
              <path d="M10.5 8V6a2.5 2.5 0 0 1 5 0v2"></path>
              <path d="M8 13v-1a2 2 0 0 1 4 0v1"></path>
              <path d="M16 13v-1a2 2 0 0 1 4 0v1"></path>
            </svg>
          </div>
          <p className="text-muted-foreground">No box information found for this stock-out.</p>
          <p className="text-xs text-muted-foreground mt-1">This may be due to a data issue or the order may not be fully processed.</p>
        </div>
      );
    }

    // Group items by barcode to identify multiple uses of the same box
    const boxGroups = data.processed_items.reduce<Record<string, Array<typeof data.processed_items[0]>>>((acc, item) => {
      const barcode = item.barcode || 'unknown';
      if (!acc[barcode]) {
        acc[barcode] = [];
      }
      acc[barcode].push(item);
      return acc;
    }, {});

    // Calculate box usage counts
    const boxUsageCounts: Record<string, number> = {};
    Object.entries(boxGroups).forEach(([barcode, items]) => {
      boxUsageCounts[barcode] = items.length;
    });

    // Always use a scrollable container with a fixed max height for better UX
    const maxHeight = 'max-h-[300px]';

    return (
      <div className={`overflow-auto overflow-x-auto overflow-y-auto ${maxHeight} border rounded-md w-full`}>
        <Table className="min-w-[1000px] table-auto">
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="font-bold px-3 py-2 text-sm">Box Barcode</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Product</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Quantity</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Warehouse</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Location</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Processed By</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Processed At</TableHead>
              <TableHead className="font-bold px-3 py-2 text-sm">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.processed_items.map((item) => {
              const barcode = item.barcode || 'unknown';
              const isMultipleUse = (boxUsageCounts[barcode] || 0) > 1;
              const boxCount = boxUsageCounts[barcode] || 0;
              
              return (
                <TableRow key={`box-${item.id}`} className="hover:bg-gray-50">
                  <TableCell className="font-medium px-3 py-2 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {item.barcode ? (
                        <span className="font-mono text-sm">{item.barcode}</span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                      {isMultipleUse && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          Used {boxCount}x
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{item.product_name || 'Unknown Product'}</TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    <div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {item.quantity}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    {/* Show warehouse from item data or from lazy loaded location info */}
                    {(() => {
                      // Get location info for this barcode if it exists
                      const locInfo = item.barcode ? locationInfo[item.barcode] : null;
                      
                      // Debug log to track what's happening during render
                      console.log(`[TableCell:${forceUpdate}] Barcode: ${item.barcode}, ` + 
                        `Item warehouse: ${item.warehouse_name || 'none'}, ` + 
                        `LocationInfo:`, locInfo);
                      
                      // First check if we have warehouse name from location info (prioritize this)
                      if (locInfo?.warehouse_name && locInfo.warehouse_name !== 'Unknown Warehouse') {
                        console.log(`[TableCell] Using warehouse name from locationInfo: ${locInfo.warehouse_name}`);
                        return <span key={`wh-${forceUpdate}`} className="font-medium">{locInfo.warehouse_name}</span>;
                      }
                      
                      // Then check if we have direct warehouse name from item that's not "Unknown Warehouse"
                      if (item.warehouse_name && item.warehouse_name !== 'Unknown Warehouse') {
                        return <span className="font-medium">{item.warehouse_name}</span>;
                      }
                      
                      // Show loading state if we're still fetching
                      if (locInfo?.isLoading) {
                        return (
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        );
                      }
                      
                      // Fall back to Unknown Warehouse
                      return <span className="text-muted-foreground">Unknown Warehouse</span>;
                    })()}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    {/* Show location from item data or from lazy loaded location info */}
                    {(() => {
                      // Get location info for this barcode if it exists
                      const locInfo = item.barcode ? locationInfo[item.barcode] : null;
                      
                      // First check if we have direct location name from item
                      if (item.location_name) {
                        return (
                          <div className="flex flex-col">
                            <span className="font-medium">{item.location_name}</span>
                          </div>
                        );
                      }
                      
                      // Then check if we have location name from location info
                      // Use key={forceUpdate} to ensure this re-renders when locationInfo changes
                      if (locInfo?.location_name) {
                        return (
                          <div key={`loc-${forceUpdate}`} className="flex flex-col">
                            <span className="font-medium">{locInfo.location_name}</span>
                            {locInfo.floor && locInfo.zone && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Floor {locInfo.floor}, Zone {locInfo.zone}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Show loading state if we're still fetching
                      if (locInfo?.isLoading) {
                        return (
                          <div className="flex items-center gap-1">
                            <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        );
                      }
                      
                      // Fall back to No Location Found
                      return <span className="text-sm text-muted-foreground">No Location Found</span>;
                    })()}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    <span className="font-medium">{item.user_name || 'Unknown'}</span>
                    {item.user_role && <div className="text-xs text-muted-foreground">{item.user_role}</div>}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    <span className="whitespace-nowrap">{formatDate(item.processed_at)}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                    {item.notes ? (
                      <details className="cursor-pointer">
                        <summary className="text-sm text-blue-600 hover:text-blue-800">View Notes</summary>
                        <pre className="text-xs whitespace-pre-wrap mt-2 p-2 bg-gray-50 rounded border">
                          {typeof item.notes === 'object' ? JSON.stringify(item.notes, null, 2) : item.notes}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderOrderSummary = () => {
    if (!data || !data.details || data.details.length === 0) {
      return (
        <div className="text-center p-6 border rounded-lg bg-gray-50">
          <div className="mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-muted-foreground">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <p className="text-muted-foreground">No order details found.</p>
          <p className="text-xs text-muted-foreground mt-1">The order may be incomplete or there might be a data issue.</p>
        </div>
      );
    }

    return (
      <Table className="min-w-[800px] table-auto">
        <TableHeader>
          <TableRow>
            <TableHead className="px-3 py-2 text-sm">Product</TableHead>
            <TableHead className="px-3 py-2 text-sm">SKU</TableHead>
            <TableHead className="px-3 py-2 text-sm">Requested</TableHead>
            <TableHead className="px-3 py-2 text-sm">Processed</TableHead>
            <TableHead className="px-3 py-2 text-sm">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.details.map((detail) => {
            const fulfillmentPercentage = detail.quantity > 0 
              ? Math.round((detail.processed_quantity / detail.quantity) * 100)
              : 0;
              
            return (
              <TableRow key={detail.id}>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap font-medium">{detail.product_name || 'Unknown Product'}</TableCell>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{detail.product_sku || 'N/A'}</TableCell>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{detail.quantity}</TableCell>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap">{detail.processed_quantity}</TableCell>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                  <div>
                    <Badge 
                      variant={fulfillmentPercentage >= 100 ? 'default' : 
                              fulfillmentPercentage > 0 ? 'secondary' : 'outline'}
                    >
                      {fulfillmentPercentage >= 100 ? 'Fulfilled' : 
                       fulfillmentPercentage > 0 ? 'Partial' : 'Unfulfilled'}
                      {fulfillmentPercentage > 0 && fulfillmentPercentage < 100 && ` (${fulfillmentPercentage}%)`}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Connection Error</h3>
            <p className="text-center text-muted-foreground mb-4">
              Failed to load stock-out details. This may be due to a connection issue or server problem.
            </p>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-w-md overflow-auto">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            No details available for this stock-out.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Add horizontal scrolling to the entire card
  return (
    <Card className={`${className} shadow-sm overflow-auto`}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-xl font-bold">Stock-Out Details</CardTitle>
        <CardDescription>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            {/* Remove Reference number, show Sales Order number if available */}
            {data.sales_order_number && (
              <span className="flex items-center gap-1">
                <span className="font-medium text-sm">Sales Order #:</span>
                <span>{data.sales_order_number}</span>
              </span>
            )}
            <span className="hidden sm:inline text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm">Status:</span> 
              <Badge variant="outline" className={`${data.status?.toLowerCase() === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{data.status}</Badge>
            </div>
            {data.processed_at && (
              <>
                <span className="hidden sm:inline text-muted-foreground">|</span>
                <span className="flex items-center gap-1">
                  <span className="font-medium text-sm">Processed:</span>
                  <span>
                    {formatDate(data.processed_at)}
                    {data.user_name && ` by ${data.user_name}`}
                  </span>
                </span>
              </>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="order_summary" className="w-full">
          <div className="overflow-x-auto w-full">
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="order_summary" className="font-medium">Order Summary</TabsTrigger>
              <TabsTrigger value="box_details" className="font-medium">Box Details</TabsTrigger>
            </TabsList>
          </div>
          <div className="mt-4 border-t pt-4 overflow-x-auto w-full max-w-full">
            <TabsContent value="box_details">
              {renderBoxDetails()}
            </TabsContent>
            <TabsContent value="order_summary">
              {renderOrderSummary()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StockOutDetailsView;
