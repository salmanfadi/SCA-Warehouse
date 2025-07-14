import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StockInRequestData } from '@/hooks/useStockInRequests';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Box } from 'lucide-react';
import StockInWizard from './StockInWizard';
import { toast } from 'sonner';

interface ProcessStockInFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockIn: StockInRequestData | null;
  userId?: string;
  adminMode?: boolean;
}

const ProcessStockInForm: React.FC<ProcessStockInFormProps> = ({
  open,
  onOpenChange,
  stockIn,
  userId,
  adminMode = false,
}) => {
  const navigate = useNavigate();
  
  // Add debug logging
  useEffect(() => {
    console.log("ProcessStockInForm mounted with:", {
      open,
      stockInId: stockIn?.id,
      userId,
      adminMode
    });
  }, []);
  
  useEffect(() => {
    console.log("ProcessStockInForm props updated:", {
      open,
      stockInId: stockIn?.id,
      userId
    });
    
    // Validate required props
    if (open && (!stockIn || !userId)) {
      console.error("Missing required props for ProcessStockInForm:", {
        stockInMissing: !stockIn,
        userIdMissing: !userId
      });
      
      if (!userId) {
        toast.error("Authentication Error", {
          description: "User ID is missing. Please try logging in again.",
        });
        onOpenChange(false);
      }
    }
  }, [open, stockIn, userId, onOpenChange, toast]);
  
  // Handle wizard completion
  const handleWizardComplete = (batchIds: string[] | string) => {
    const ids = Array.isArray(batchIds) ? batchIds : [batchIds];
    onOpenChange(false);
    // Store all newly added batch IDs in localStorage for highlighting
    localStorage.setItem('recentlyAddedBatchIds', JSON.stringify(ids));
    localStorage.setItem('recentlyAddedTimestamp', Date.now().toString());
    // Set tab parameter to ensure we land on the batches tab in EnhancedInventoryView
    const baseRoute = adminMode ? '/admin' : '/manager';
    const highlightParam = ids.join(',');
    const redirectUrl = `${baseRoute}/inventory?tab=batches&highlight=${highlightParam}`;
    toast.success("Stock in processed successfully.", {
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(redirectUrl)}
        >
          View Processed Batches
        </Button>
      ),
      duration: 10000,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-2 sm:p-6">
        {stockIn && userId ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Process Stock In - {stockIn.product?.name || 'Unknown Product'} - ID: {stockIn.id.substring(0, 8)}
              </DialogTitle>
              <DialogDescription>
                Complete the following steps to process this stock in request
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
            <StockInWizard 
              stockIn={stockIn}
              userId={userId}
              onComplete={handleWizardComplete}
              onCancel={() => onOpenChange(false)}
            />
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-red-500">
              {!stockIn ? "Stock in request data is missing." : ""}
              {!userId ? "User ID is missing. Please log in again." : ""}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProcessStockInForm;