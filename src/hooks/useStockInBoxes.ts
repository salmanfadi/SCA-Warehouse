
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface BoxData {
  id: string;
  barcode: string;
  quantity: number;
  color: string;
  size: string;
  warehouse: string;   // Changed from warehouse_id to warehouse to match StockInBox
  location: string;    // Changed from location_id to location to match StockInBox
  warehouse_id: string; // Keep for backward compatibility
  location_id: string;  // Keep for backward compatibility
}

export interface StockInData {
  id: string;
  product?: { name: string; id?: string; sku?: string; }; 
  submitter: { 
    name: string; 
    username: string;
    id: string;
  } | null;
  boxes: number;
  status: "pending" | "approved" | "rejected" | "completed" | "processing" | "failed";
  created_at: string;
  source: string;
  notes?: string;
  rejection_reason?: string;
}

export interface DefaultValues {
  warehouse: string;
  location: string;
  quantity: number;
  color: string;
  size: string;
}

export const useStockInBoxes = (selectedStockIn: StockInData | null, open: boolean) => {
  const [boxesData, setBoxesData] = useState<BoxData[]>([]);
  const [defaultValues, setDefaultValues] = useState<DefaultValues>({
    warehouse: '',
    location: '',
    quantity: 0,
    color: '',
    size: '',
  });

  // Reset form when selectedStockIn changes
  useEffect(() => {
    if (selectedStockIn && open) {
      // Initialize with empty box entries for the number of boxes
      const initialBoxes = Array(selectedStockIn.boxes).fill(null).map((_, index) => ({
        id: `temp-${index}`,
        barcode: `${Date.now()}-${index}`, // Generate a temporary barcode
        quantity: 0, // Default quantity per box
        color: '',
        size: '',
        warehouse_id: '',
        location_id: '',
        warehouse: '',  // Add this property to match StockInBox
        location: ''    // Add this property to match StockInBox
      }));
      
      setBoxesData(initialBoxes);
      setDefaultValues({
        warehouse: '',
        location: '',
        quantity: 0,
        color: '',
        size: '',
      });
    }
  }, [selectedStockIn, open]);

  // Update a single box data
  const handleBoxUpdate = (index: number, field: keyof BoxData, value: string | number) => {
    const updatedBoxes = [...boxesData];
    updatedBoxes[index] = {
      ...updatedBoxes[index],
      [field]: value,
      // Update the corresponding field based on the field that was updated
      ...(field === 'warehouse_id' ? { warehouse: value as string } : {}),
      ...(field === 'location_id' ? { location: value as string } : {})
    };
    setBoxesData(updatedBoxes);
  };

  // Apply default values to all boxes
  const applyDefaultsToAll = () => {
    if (!defaultValues.warehouse || !defaultValues.location) {
      toast.error('Missing defaults', {
        description: 'Please select a warehouse and location before applying to all boxes.'
      });
      return;
    }

    // Create a new array instead of modifying in place
    const updatedBoxes = boxesData.map(box => ({
      ...box,
      warehouse_id: defaultValues.warehouse,
      location_id: defaultValues.location,
      warehouse: defaultValues.warehouse,  // Also set the warehouse property
      location: defaultValues.location,    // Also set the location property 
      color: defaultValues.color || box.color, // Preserve existing value if default is empty
      size: defaultValues.size || box.size,    // Preserve existing value if default is empty
      quantity: defaultValues.quantity > 0 ? defaultValues.quantity : box.quantity
    }));
    
    // Update the state with the new array
    setBoxesData(updatedBoxes);
    
    toast.success('Defaults Applied', {
      description: 'Default values have been applied to all boxes.'
    });
  };

  const isMissingRequiredData = () => {
    return boxesData.some(box => 
      !box.warehouse_id || 
      !box.location_id || 
      !box.barcode || 
      box.quantity <= 0
    );
  };

  return {
    boxesData,
    setBoxesData,
    defaultValues,
    setDefaultValues,
    handleBoxUpdate,
    applyDefaultsToAll,
    isMissingRequiredData
  };
};
