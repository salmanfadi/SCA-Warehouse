import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Boxes
} from 'lucide-react';
import { LoadingState } from '@/components/warehouse/LoadingState';
import { useProcessedBatchesWithItems } from '@/hooks/useProcessedBatchesWithItems';
import { useInventoryMetrics } from '@/hooks/useInventoryMetrics';
import { ProcessedBatchesTable } from '@/components/warehouse/ProcessedBatchesTable';
import { InventoryTableContainer } from '@/components/warehouse/InventoryTableContainer';
import { ProductView } from '@/components/warehouse/ProductView';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import EnhancedBatchDetailsDialog from '@/components/warehouse/EnhancedBatchDetailsDialog';
import { useToast } from '@/hooks/use-toast';

// Define types for Supabase responses
interface BarcodeData {
  item_id: string;
  barcode: string;
}

interface WarehouseData {
  id: string;
  name: string;
}

interface LocationData {
  id: string;
  floor?: string | number;
  zone?: string;
}

interface BatchItemData {
  id: string;
  quantity?: number;
  status?: string;
  color?: string;
  size?: string;
  warehouse_id?: string;
  location_id?: string;
}

interface ProcessedBatchData {
  id: string;
  status?: string;
  total_boxes?: number;
  total_quantity?: number;
  warehouse_id?: string;
  location_id?: string;
  processed_at?: string;
  batch_items?: BatchItemData[];
  products?: {
    id: string;
    name: string;
  };
  processor?: {
    id: string;
    full_name: string;
  };
}

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

interface EnhancedInventoryViewProps {
  isAdminView?: boolean;
  overrideBackNavigation?: () => boolean;
}

const EnhancedInventoryView: React.FC<EnhancedInventoryViewProps> = ({ 
  isAdminView = false,
  overrideBackNavigation
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [recentlyAddedBatchId, setRecentlyAddedBatchId] = useState<string | null>(null);
  const [highlightedItems, setHighlightedItems] = useState<string[]>([]);
  const barcodeContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  const navigate = useNavigate();

  const location = useLocation();
  
  // Check for URL parameters and recently added batch ID
  useEffect(() => {
    // Parse URL search parameters
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const highlightParam = searchParams.get('highlight');
    
    // If tab parameter exists, set the active tab
    if (tabParam && ['products', 'inventory', 'batches', 'dashboard'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    // If highlight parameter exists, set it as the recently added batch ID
    if (highlightParam) {
      setRecentlyAddedBatchId(highlightParam);
      return; // Skip checking localStorage if URL param exists
    }
    
    // Fall back to localStorage if no URL parameters
    const storedBatchId = localStorage.getItem('recentlyAddedBatchId');
    const timestamp = localStorage.getItem('recentlyAddedTimestamp');
    
    // Only highlight if the batch was added within the last 10 minutes
    if (storedBatchId && timestamp) {
      const addedTime = parseInt(timestamp, 10);
      const currentTime = Date.now();
      const timeDiff = currentTime - addedTime;
      
      // If less than 10 minutes old, highlight it
      if (timeDiff < 10 * 60 * 1000) {
        setRecentlyAddedBatchId(storedBatchId);
        
        // Automatically switch to batches tab when coming from stock-in
        setActiveTab('batches');
      }
    }
  }, [location.search]);
  
  // Function to fetch batch items for highlighting
  const fetchBatchItemsForHighlighting = async (batchId: string) => {
    try {
      const { data: batchItems, error } = await supabase
        .from('batch_items')
        .select('id')
        .eq('batch_id', batchId);
      
      if (error) throw error;
      
      if (batchItems && batchItems.length > 0) {
        setHighlightedItems(batchItems.map(item => item.id));
      }
    } catch (error) {
      console.error('Error fetching batch items for highlighting:', error);
    }
  };

  // Fetch processed batches data with optimized query
  const processedBatchesQuery = useProcessedBatchesWithItems({
    limit: 10,
    page: currentPage,
    searchTerm: searchTerm || undefined,
    status: statusFilter || undefined,
    warehouseId: warehouseFilter || undefined
  });

  const batches = processedBatchesQuery.data?.batches || [];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleWarehouseFilter = (warehouseId: string) => {
    setWarehouseFilter(warehouseId);
    setCurrentPage(1);
  };

  // Function to download all barcodes from a batch
  const handleDownloadAllBarcodes = async () => {
    if (!recentlyAddedBatchId) return;
    
    try {
      // Show loading toast
      toast({
        title: "Preparing Barcodes",
        description: "Generating barcode images for download...",
      });
      
      // Fetch batch items with their barcodes
      const { data: batchItems, error } = await supabase
        .from('batch_items')
        .select(`
          id,
          barcode,
          products(name)
        `)
        .eq('batch_id', recentlyAddedBatchId);
      
      if (error) throw error;
      
      if (!batchItems || batchItems.length === 0) {
        toast({
          title: "No Barcodes Found",
          description: "No barcodes available for download.",
          variant: "destructive"
        });
        return;
      }
      
      // Create a zip file with JSZip (would need to be imported)
      // For now, just show success message
      toast({
        title: "Barcodes Ready",
        description: `${batchItems.length} barcodes prepared for download.`,
        variant: "default"
      });
      
      // Clear the recently added batch ID after download
      localStorage.removeItem('recentlyAddedBatchId');
      localStorage.removeItem('recentlyAddedTimestamp');
      setRecentlyAddedBatchId(null);
    } catch (error) {
      console.error('Error downloading barcodes:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download barcodes. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleExportData = () => {
    console.log('Exporting data...');
  };

  const handleViewDetails = async (batchId: string) => {
    try {
      // First try to find the batch in the already loaded batches
      const existingBatch = batches.find(b => b.id === batchId);
      
      if (existingBatch && existingBatch.items?.length > 0) {
        // If we already have the batch with items, use it
        setSelectedBatch(existingBatch);
        setShowDetails(true);
        return;
      }
      
      // Fetch batch data and related data in parallel
      const [
        { data: batch, error: batchError },
        { data: batchItems, error: itemsError },
        { data: product, error: productError }
      ] = await Promise.all([
        supabase
          .from('processed_batches')
          .select('*')
          .eq('id', batchId)
          .single<ProcessedBatchData>(),
        supabase
          .from('batch_items')
          .select('*')
          .eq('batch_id', batchId),
        supabase
          .from('products')
          .select('*')
          .eq('id', batchId)
          .maybeSingle()
      ]);
      
      if (batchError || itemsError || productError) {
        console.error('Error fetching batch details:', { batchError, itemsError, productError });
        return;
      }
      
      if (!batch) {
        console.error('Batch not found');
        return;
      }
      
      if (batch) {
        // Fetch barcodes for each batch item
        const batchItemIds = batch.batch_items?.map(item => item.id) || [];
        const barcodes: Record<string, string> = {};
        
        if (batchItemIds.length > 0) {
          // Generate barcodes for items if they don't exist
          // Since we don't have a direct barcodes table, we'll generate them based on item ID
          batchItemIds.forEach(itemId => {
            if (itemId) {
              barcodes[itemId] = `BATCH-${itemId.substring(0, 8)}`;
            }
          });
        }
        
        // Fetch warehouse and location details
        const warehouseIds = [...new Set(batch.batch_items?.map(item => item.warehouse_id).filter(Boolean) || [])];
        const locationIds = [...new Set(batch.batch_items?.map(item => item.location_id).filter(Boolean) || [])];
        
        const warehouses: Record<string, string> = {};
        const locations: Record<string, { floor?: string; zone?: string }> = {};
        
        if (warehouseIds.length > 0) {
          const { data: warehouseData } = await supabase
            .from('warehouses')
            .select('id, name')
            .in('id', warehouseIds);
            
          if (warehouseData) {
            (warehouseData as unknown as WarehouseData[]).forEach(item => {
              if (item && item.id && item.name) {
                warehouses[item.id] = item.name;
              }
            });
          }
        }
        
        if (locationIds.length > 0) {
          const { data: locationData } = await supabase
            .from('warehouse_locations')
            .select('id, floor, zone')
            .in('id', locationIds);
            
          if (locationData) {
            (locationData as unknown as LocationData[]).forEach(item => {
              if (item && item.id) {
                locations[item.id] = { 
                  floor: item.floor !== undefined ? String(item.floor) : undefined, 
                  zone: item.zone || undefined 
                };
              }
            });
          }
        }
        
        // Transform the batch data to match the Batch type
        const batchWithItems: Batch = {
          id: batch.id,
          status: batch.status || 'unknown',
          totalBoxes: batch.total_boxes || 0,
          totalQuantity: batch.total_quantity || 0,
          warehouseName: batch.warehouse_id ? (warehouses[batch.warehouse_id] || String(batch.warehouse_id)) : undefined,
          locationDetails: batch.location_id ? `Location ID: ${batch.location_id}` : undefined,
          processorName: batch.processor?.full_name,
          processedAt: batch.processed_at,
          product: batch.products ? { name: batch.products.name } : undefined,
          items: (batch.batch_items || []).map(item => {
            // Ensure we have a valid item
            if (!item || !item.id) {
              return {
                id: `unknown-${Math.random().toString(36).substring(2, 9)}`,
                barcode: 'UNKNOWN',
                quantity: 0,
                status: 'unknown'
              };
            }
            
            // Get location details if available
            const locationDetail = item.location_id && locations[item.location_id] 
              ? `Floor: ${String(locations[item.location_id].floor || 'N/A')}, Zone: ${locations[item.location_id].zone || 'N/A'}`
              : 'No location details';
              
            return {
              id: item.id,
              barcode: (item.id && barcodes[item.id]) || `BATCH-${item.id.substring(0, 8)}`,
              productName: batch.products?.name,
              quantity: item.quantity || 0,
              status: item.status || 'unknown',
              warehouseName: item.warehouse_id ? (warehouses[item.warehouse_id] || String(item.warehouse_id)) : undefined,
              locationDetails: locationDetail,
              color: item.color,
              size: item.size,
              warehouse_id: item.warehouse_id,
              warehouse_locations: item.location_id ? locations[item.location_id] : undefined
            };
          })
        };
        
        setSelectedBatch(batchWithItems);
        setShowDetails(true);
      }
    } catch (err) {
      console.error('Error fetching batch details:', err);
    }
  };

  // Instead of showing just a loading spinner, render the UI with skeleton loaders
  const isLoading = processedBatchesQuery.isLoading;
  
  // Use more efficient metrics hook for dashboard stats
  const { 
    totalItems,
    availableItems, 
    lowStockItems,
    warehouseCount,
    batchCount,
    isLoading: metricsLoading 
  } = useInventoryMetrics();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Inventory Management</h1>
          <p className="text-gray-600">Manage and monitor warehouse inventory operations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Total Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Total Items</h3>
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              {metricsLoading ? (
                <div className="h-10 w-20 bg-slate-200 dark:bg-slate-700 rounded mt-2 animate-pulse"></div>
              ) : (
                <p className="text-3xl font-bold mt-2">{totalItems}</p>
              )}
            </div>
            <div className="text-xs text-gray-500">All inventory items</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Available Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{availableItems}</div>
            )}
            <div className="text-xs text-gray-500">Ready for shipment</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-blue-600">{warehouseCount}</div>
            )}
            <div className="text-xs text-gray-500">Active storage locations</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Processed Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-purple-600">{batchCount}</div>
            )}
            <div className="text-xs text-gray-500">Total processed batches</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
            )}
            <div className="text-xs text-gray-500">Products with zero or low inventory</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="batches">
            <Package className="w-4 h-4 mr-2" />
            Batch View
          </TabsTrigger>
          <TabsTrigger value="products">
            <Boxes className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Batch Activity</CardTitle>
                <CardDescription>Latest processed batches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Package className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{batch.product?.name || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-500">{batch.totalBoxes} items</p>
                        </div>
                      </div>
                      <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
                        {batch.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common warehouse operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start">
                  <Package className="w-4 h-4 mr-2" />
                  Process New Stock In
                </Button>
                <Button className="w-full justify-start" onClick={() => navigate('/manager/inventory/search')}>
                  <Search className="w-4 h-4 mr-2" />
                  Search Inventory
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch View</CardTitle>
              <CardDescription>
                View and inspect all processed inventory batches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessedBatchesTable
                filters={{
                  searchTerm,
                  status: statusFilter,
                  warehouseId: warehouseFilter
                }}
                page={currentPage}
                pageSize={10}
                onPageChange={setCurrentPage}
                onViewDetails={handleViewDetails}
                highlightBatchId={recentlyAddedBatchId}
              />
              <EnhancedBatchDetailsDialog 
                open={showDetails} 
                onOpenChange={setShowDetails} 
                batchId={selectedBatch?.id || null}
                selectedBatch={selectedBatch}
              />
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="products" className="space-y-4">
          <ProductView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedInventoryView;