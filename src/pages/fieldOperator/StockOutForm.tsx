import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ArrowLeft, Plus, Trash2, ScanLine, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MobileBarcodeScanner from '@/components/barcode/MobileBarcodeScanner';
import { Product } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ScannedBox {
  barcode: string;
  inventory_id: string;
  product_name: string;
  product_id: string;
  sku: string | null;
  hsn_code: string | null;
  gst_rate: number | null;
  quantity: number;
  requestedQuantity: number;
  category?: string;
  batch_id: string | null;
}

interface GroupedBoxes {
  [category: string]: ScannedBox[];
}

const StockOutForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State for mode selection
  const [isBarcodeDriven, setIsBarcodeDriven] = useState(false);
  
  // State for regular product-based selection
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '' as string | number,
    destination: '',
    reason: '',
  });

  // State for barcode-driven selection
  const [scannedBoxes, setScannedBoxes] = useState<ScannedBox[]>([]);
  const [barcodeDestination, setBarcodeDestination] = useState('');
  const [barcodeReason, setBarcodeReason] = useState('');
  const [currentScannedBarcode, setCurrentScannedBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [formErrors, setFormErrors] = useState({
    quantity: '',
    requestedQuantity: '',
  });

  // Fetch product categories for filtering
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .order('category');
        
      if (error) throw error;
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(data.map(item => item.category)))
        .filter(Boolean)
        .sort() as string[];
      
      return uniqueCategories;
    },
  });
  
  // Handle barcode scan result
  const handleBarcodeScanned = async (barcode: string) => {
    console.log('=== STARTING BARCODE SCAN ===');
    console.log('Barcode being scanned:', barcode);
    
    setCurrentScannedBarcode(barcode);
    
    // Check if the barcode is already scanned
    const alreadyScanned = scannedBoxes.some(box => box.barcode === barcode);
    if (alreadyScanned) {
      toast({
        variant: 'destructive',
        title: 'Barcode already scanned',
        description: 'This barcode is already in your list.',
      });
      return;
    }
    
    try {
      // Clear any previous data to ensure we're not showing stale information
      let foundData = null;
      let foundSource = '';
      
      console.log('Step 1: Checking barcodes table...');
      // First try barcodes table
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('barcodes')
        .select(`
          id,
          barcode,
          quantity,
          status,
          product_id,
          batch_id,
          warehouse_id,
          location_id
        `)
        .eq('barcode', barcode)
        .eq('status', 'active')
        .maybeSingle();

      if (barcodeError) {
        console.error('Barcodes table query error:', barcodeError);
      } else if (barcodeData) {
        console.log('Found in barcodes table:', barcodeData);
        foundData = barcodeData;
        foundSource = 'barcodes';
      }

      // If not found in barcodes, try batch_items
      if (!foundData) {
        console.log('Step 2: Checking batch_items table...');
        const { data: batchItemData, error: batchItemError } = await supabase
          .from('batch_items')
          .select(`
            id,
            barcode,
            quantity,
            status,
            batch_id,
            warehouse_id,
            location_id,
            color,
            size
          `)
          .eq('barcode', barcode)
          .eq('status', 'available')
          .maybeSingle();

        if (batchItemError) {
          console.error('Batch items table query error:', batchItemError);
        } else if (batchItemData) {
          console.log('Found in batch_items table:', batchItemData);
          foundData = batchItemData;
          foundSource = 'batch_items';
        }
      }

      // If not found in either, try inventory
      if (!foundData) {
        console.log('Step 3: Checking inventory table...');
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select(`
            id,
            barcode,
            quantity,
            status,
            product_id,
            batch_id,
            warehouse_id,
            location_id,
            color,
            size
          `)
          .eq('barcode', barcode)
          .eq('status', 'available')
          .maybeSingle();

        if (inventoryError) {
          console.error('Inventory table query error:', inventoryError);
        } else if (inventoryData) {
          console.log('Found in inventory table:', inventoryData);
          foundData = inventoryData;
          foundSource = 'inventory';
        }
      }

      // Check if any data was found
      if (!foundData) {
        console.log('No data found in any table for barcode:', barcode);
        toast({
          variant: 'destructive',
          title: 'Barcode not found',
          description: `No barcode ${barcode} exists in the system or it's not available for stock out.`,
        });
        setCurrentScannedBarcode('');
        return;
      }

      console.log('Found data from', foundSource, ':', foundData);

      // Now get product information
      let productId = foundData.product_id;
      
      // For batch_items, we need to get product_id from processed_batches
      if (foundSource === 'batch_items' && !productId) {
        console.log('Getting product info from processed_batches for batch_id:', foundData.batch_id);
        const { data: batchData, error: batchError } = await supabase
          .from('processed_batches')
          .select('product_id')
          .eq('id', foundData.batch_id)
          .maybeSingle();
          
        if (batchError) {
          console.error('Error getting batch product info:', batchError);
        } else if (batchData) {
          productId = batchData.product_id;
          console.log('Got product_id from batch:', productId);
        }
      }

      if (!productId) {
        console.error('No product_id found for barcode');
        toast({
          variant: 'destructive',
          title: 'Product information missing',
          description: 'Unable to retrieve product details for this barcode.',
        });
        setCurrentScannedBarcode('');
        return;
      }

      // Get product details including HSN code
      console.log('Getting product details for product_id:', productId);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, sku, category, hsn_code, gst_rate')
        .eq('id', productId)
        .maybeSingle();

      if (productError || !productData) {
        console.error('Error getting product details:', productError);
        toast({
          variant: 'destructive',
          title: 'Product information missing',
          description: 'Unable to retrieve product details for this barcode.',
        });
        setCurrentScannedBarcode('');
        return;
      }

      console.log('Product details:', productData);

      // If category filter is active, check if the product matches
      if (selectedCategory && productData.category !== selectedCategory) {
        toast({
          variant: 'destructive',
          title: 'Category mismatch',
          description: `This box belongs to the "${productData.category}" category, but you have filtered for "${selectedCategory}".`,
        });
        setCurrentScannedBarcode('');
        return;
      }
      
      // Create the scanned box object
      const newBox: ScannedBox = {
        barcode: barcode,
        inventory_id: foundData.id,
        product_name: productData.name,
        product_id: productData.id,
        sku: productData.sku,
        hsn_code: productData.hsn_code,
        gst_rate: productData.gst_rate,
        quantity: foundData.quantity,
        requestedQuantity: foundData.quantity, // Default to full box quantity
        category: productData.category || 'Uncategorized',
        batch_id: foundData.batch_id || null,
      };
      
      console.log('Created new box object:', newBox);
      
      setScannedBoxes([...scannedBoxes, newBox]);
      setCurrentScannedBarcode('');
      
      toast({
        title: 'Box added',
        description: `Added ${productData.name} (${foundData.quantity} units) from ${foundSource} table`,
      });
      
      console.log('=== BARCODE SCAN COMPLETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('Error during barcode scan:', error);
      toast({
        variant: 'destructive',
        title: 'Error scanning barcode',
        description: error instanceof Error ? error.message : 'Failed to process barcode',
      });
      setCurrentScannedBarcode('');
    }
  };
  
  // Group scanned boxes by category
  const getGroupedBoxes = (): GroupedBoxes => {
    return scannedBoxes.reduce((groups: GroupedBoxes, box) => {
      const category = box.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(box);
      return groups;
    }, {});
  };
  
  // Update requested quantity for a scanned box
  const updateBoxQuantity = (index: number, quantity: number) => {
    const updatedBoxes = [...scannedBoxes];
    const box = updatedBoxes[index];
    
    if (quantity > box.quantity) {
      setFormErrors({
        ...formErrors,
        requestedQuantity: `Quantity cannot exceed available amount (${box.quantity})`
      });
      return;
    } else if (quantity < 1) {
      setFormErrors({
        ...formErrors,
        requestedQuantity: 'Quantity must be at least 1'
      });
      return;
    } else {
      setFormErrors({
        ...formErrors,
        requestedQuantity: ''
      });
    }
    
    updatedBoxes[index].requestedQuantity = quantity;
    setScannedBoxes(updatedBoxes);
  };
  
  // Remove a box from the scanned list
  const removeBox = (index: number) => {
    const updatedBoxes = [...scannedBoxes];
    updatedBoxes.splice(index, 1);
    setScannedBoxes(updatedBoxes);
    
    toast({
      title: 'Box removed',
      description: 'The box has been removed from your list.'
    });
  };
  
  // Fetch products for the product-based selection with HSN codes
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, hsn_code, gst_rate')
        .order('name');
        
      if (error) throw error;
      return data;
    },
  });
  
  const handleProductChange = (value: string) => {
    setFormData({ ...formData, productId: value });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    // Clear scanned boxes when category filter changes
    if (scannedBoxes.length > 0) {
      if (confirm('Changing category filter will clear your current list of scanned boxes. Continue?')) {
        setScannedBoxes([]);
      } else {
        // Revert selection if user cancels
        setSelectedCategory('');
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'quantity') {
      setFormData({ ...formData, [name]: value });
      
      // Validate quantity
      if (value === '') {
        setFormErrors({ ...formErrors, quantity: 'Quantity is required' });
      } else {
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
          setFormErrors({ ...formErrors, quantity: 'Please enter a valid number' });
        } else if (numValue < 1) {
          setFormErrors({ ...formErrors, quantity: 'Quantity must be at least 1' });
        } else {
          setFormErrors({ ...formErrors, quantity: '' });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  // Create stock out mutation for product-based approach
  const createProductStockOutMutation = useMutation({
    mutationFn: async (data: { 
      product_id: string; 
      quantity: number; 
      requested_by: string;
      destination: string;
      reason?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('stock_out')
        .insert([data])
        .select();
        
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Stock Out request submitted!',
        description: `${formData.quantity} units of the selected product have been requested for dispatch to ${formData.destination}.`,
      });
      navigate('/operator/submissions');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit stock out request',
      });
    },
  });
  
  // Create stock out mutation for barcode-driven approach
  const createBarcodeStockOutMutation = useMutation({
    mutationFn: async (data: { 
      requested_by: string;
      destination: string;
      reason?: string;
      boxes: Array<{
        inventory_id: string;
        product_id: string;
        quantity: number;
        batch_id: string | null;
      }>;
    }) => {
      const productGroups = data.boxes.reduce((acc, box) => {
        if (!acc[box.product_id]) {
          acc[box.product_id] = 0;
        }
        acc[box.product_id] += box.quantity;
        return acc;
      }, {} as Record<string, number>);
      const mainProductId = Object.entries(productGroups)
        .sort((a, b) => b[1] - a[1])[0][0];
      const { data: stockOutRecord, error: stockOutError } = await supabase
        .from('stock_out')
        .insert([{
          product_id: mainProductId,
          quantity: data.boxes.reduce((total, box) => total + box.quantity, 0),
          requested_by: data.requested_by,
          destination: data.destination,
          reason: data.reason
        }])
        .select('id');
      if (stockOutError) throw stockOutError;
      if (!stockOutRecord || stockOutRecord.length === 0) {
        throw new Error('Failed to create stock out record');
      }
      const stockOutId = stockOutRecord[0].id;
      const detailsPromises = data.boxes.map(box => 
        supabase.from('stock_out_details').insert([{
          stock_out_id: stockOutId,
          inventory_id: box.inventory_id,
          quantity: box.quantity,
          batch_id: box.batch_id,
        }])
      );
      await Promise.all(detailsPromises);
      return stockOutRecord;
    },
    onSuccess: () => {
      const totalQuantity = scannedBoxes.reduce((total, box) => total + box.requestedQuantity, 0);
      
      toast({
        title: 'Barcode Stock Out request submitted!',
        description: `${scannedBoxes.length} boxes (${totalQuantity} units total) have been requested for dispatch to ${barcodeDestination}.`,
      });
      navigate('/operator/submissions');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit barcode stock out request',
      });
    },
  });
  
  const handleProductBasedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!formData.productId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a product',
      });
      return;
    }
    
    const numQuantity = parseInt(formData.quantity as string);
    if (isNaN(numQuantity) || numQuantity < 1) {
      setFormErrors({ ...formErrors, quantity: 'Quantity must be at least 1' });
      return;
    }
    
    if (!formData.destination.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a destination',
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'You must be logged in to submit stock out requests',
      });
      return;
    }
    
    createProductStockOutMutation.mutate({
      product_id: formData.productId,
      quantity: numQuantity,
      destination: formData.destination,
      reason: formData.reason || undefined,
      requested_by: user.id
    });
  };
  
  const handleBarcodeDrivenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate barcode form
    if (scannedBoxes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please scan at least one box',
      });
      return;
    }
    
    if (!barcodeDestination.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a destination',
      });
      return;
    }
    
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'You must be logged in to submit stock out requests',
      });
      return;
    }
    
    // Format the data for submission
    const boxesData = scannedBoxes.map(box => ({
      inventory_id: box.inventory_id,
      product_id: box.product_id,
      quantity: box.requestedQuantity,
      batch_id: box.batch_id ?? null,
    }));
    
    createBarcodeStockOutMutation.mutate({
      boxes: boxesData,
      destination: barcodeDestination,
      reason: barcodeReason || undefined,
      requested_by: user.id
    });
  };
  
  const isProductBasedValid = () => {
    return (
      formData.productId && 
      (typeof formData.quantity === 'number' ? formData.quantity > 0 : parseInt(formData.quantity as string) > 0) &&
      formData.destination.trim() !== '' &&
      !formErrors.quantity
    );
  };
  
  const isBarcodeDrivenValid = () => {
    return (
      scannedBoxes.length > 0 &&
      barcodeDestination.trim() !== '' &&
      !formErrors.requestedQuantity
    );
  };
  
  const getTotalScannedQuantity = () => {
    return scannedBoxes.reduce((total, box) => total + box.requestedQuantity, 0);
  };

  // Get the product associated with the selected product ID
  const getSelectedProduct = () => {
    if (!formData.productId || !products) return null;
    return products.find(product => product.id === formData.productId);
  };

  const selectedProduct = getSelectedProduct();
  const groupedBoxes = getGroupedBoxes();
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="New Stock Out" 
        description="Submit stock out request for dispatch"
      />
      
      <div className="max-w-md mx-auto mb-6">
        <Card>
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              onClick={() => navigate('/field')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <CardTitle>Stock Out Form</CardTitle>
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">Method: {isBarcodeDriven ? 'Barcode Scanning' : 'Product Selection'}</span>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={isBarcodeDriven}
                  onCheckedChange={setIsBarcodeDriven}
                  id="scan-mode"
                />
                <Label htmlFor="scan-mode" className="cursor-pointer flex items-center">
                  <ScanLine className="h-4 w-4 mr-1" />
                  Scan Barcodes
                </Label>
              </div>
            </div>
          </CardHeader>
          
          {/* Product-Based Form */}
          {!isBarcodeDriven && (
            <form onSubmit={handleProductBasedSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select 
                    value={formData.productId} 
                    onValueChange={handleProductChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsLoading ? (
                        <SelectItem value="loading-products" disabled>Loading products...</SelectItem>
                      ) : products && products.length > 0 ? (
                        products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <div className="flex gap-2 text-xs text-gray-500">
                                {product.category && <span>{product.category}</span>}
                                {product.hsn_code && <span>HSN: {product.hsn_code}</span>}
                                {product.gst_rate && <span>GST: {product.gst_rate}%</span>}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products" disabled>No products available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedProduct && (
                    <div className="mt-2 space-y-1">
                      {selectedProduct.category && (
                        <Badge variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {selectedProduct.category}
                        </Badge>
                      )}
                      {selectedProduct.hsn_code && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">HSN Code:</span> {selectedProduct.hsn_code}
                        </div>
                      )}
                      {selectedProduct.gst_rate && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">GST Rate:</span> {selectedProduct.gst_rate}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                  {formErrors.quantity && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.quantity}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    placeholder="e.g., Customer ABC"
                    required
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="e.g., Urgent order for client"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              </CardContent>
              
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isProductBasedValid() || createProductStockOutMutation.isPending}
                >
                  {createProductStockOutMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </CardFooter>
            </form>
          )}
          
          {/* Barcode-Driven Form */}
          {isBarcodeDriven && (
            <form onSubmit={handleBarcodeDrivenSubmit}>
              <CardContent className="space-y-4">
                {/* Category filter */}
                <div className="space-y-2">
                  <Label htmlFor="category">Filter by Category (Optional)</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {categoriesLoading ? (
                        <SelectItem value="loading-categories" disabled>Loading categories...</SelectItem>
                      ) : categories && categories.length > 0 ? (
                        categories.map((category, index) => (
                          <SelectItem key={index} value={category}>
                            {category}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-categories" disabled>No categories available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCategory && (
                    <div className="flex items-center mt-1">
                      <Badge variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {selectedCategory}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedCategory('')}
                        className="h-6 ml-2 text-xs"
                      >
                        Clear filter
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Scan Box Barcodes</Label>
                  <div className="border rounded-md p-4">
                    <MobileBarcodeScanner 
                      onBarcodeScanned={handleBarcodeScanned}
                      allowManualEntry={true}
                      inputValue={currentScannedBarcode}
                      onInputChange={(e) => setCurrentScannedBarcode(e.target.value)}
                      scanButtonLabel="Add Box"
                    />
                  </div>
                </div>
                
                {scannedBoxes.length > 0 && (
                  <div className="space-y-4">
                    <Label>Scanned Boxes ({scannedBoxes.length})</Label>
                    <div className="border rounded-md">
                      {/* Group boxes by category */}
                      {Object.entries(groupedBoxes).map(([category, boxes]) => (
                        <div key={category} className="border-b last:border-b-0">
                          <div className="p-3 bg-muted/30">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="bg-background">
                                <Tag className="h-3 w-3 mr-1" />
                                {category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y">
                            {boxes.map((box, boxIndex) => {
                              const index = scannedBoxes.findIndex(b => b.barcode === box.barcode);
                              return (
                                <div key={box.barcode} className="p-3">
                                  <div className="flex justify-between mb-1">
                                    <span className="font-medium">{box.product_name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => removeBox(index)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                  <div className="text-sm text-gray-500 mb-1">
                                    {box.sku ? `SKU: ${box.sku} • ` : ''}
                                    Box ID: {box.barcode}
                                    {box.batch_id && (
                                      <>
                                        {' • '}<span className="text-blue-600">Batch: {box.batch_id}</span>
                                      </>
                                    )}
                                  </div>
                                  {/* Enhanced HSN and GST information display */}
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    {box.hsn_code && (
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-600">HSN Code:</span>
                                        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                                          {box.hsn_code}
                                        </div>
                                      </div>
                                    )}
                                    {box.gst_rate !== null && (
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-600">GST Rate:</span>
                                        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                                          {box.gst_rate}%
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center mt-2">
                                    <Label htmlFor={`box-qty-${index}`} className="mr-2 text-xs">
                                      Quantity:
                                    </Label>
                                    <Input
                                      id={`box-qty-${index}`}
                                      type="number"
                                      min="1"
                                      max={box.quantity}
                                      value={box.requestedQuantity}
                                      onChange={(e) => updateBoxQuantity(index, parseInt(e.target.value))}
                                      className="h-7 w-20 text-sm"
                                    />
                                    <span className="text-xs ml-2 text-gray-500">
                                      / {box.quantity} available
                                    </span>
                                    {box.batch_id && box.quantity === box.requestedQuantity && (
                                      <span className="ml-2 text-xs text-yellow-600 font-semibold">(Last box in batch!)</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    {formErrors.requestedQuantity && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.requestedQuantity}</p>
                    )}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm font-medium">Total Quantity: {getTotalScannedQuantity()} units</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(groupedBoxes).length} {Object.keys(groupedBoxes).length === 1 ? 'category' : 'categories'} of products
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 pt-2">
                  <Label htmlFor="barcodeDestination">Destination</Label>
                  <Input
                    id="barcodeDestination"
                    value={barcodeDestination}
                    onChange={(e) => setBarcodeDestination(e.target.value)}
                    placeholder="e.g., Customer ABC"
                    required
                    maxLength={100}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="barcodeReason">Reason (Optional)</Label>
                  <Textarea
                    id="barcodeReason"
                    value={barcodeReason}
                    onChange={(e) => setBarcodeReason(e.target.value)}
                    placeholder="e.g., Selected boxes for urgent delivery"
                    rows={3}
                    maxLength={200}
                  />
                </div>
              </CardContent>
              
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isBarcodeDrivenValid() || createBarcodeStockOutMutation.isPending}
                >
                  {createBarcodeStockOutMutation.isPending ? 'Submitting...' : 'Submit Barcode Request'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StockOutForm;
