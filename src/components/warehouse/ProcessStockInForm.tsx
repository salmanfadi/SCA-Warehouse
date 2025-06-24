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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  
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
        toast({
          title: "Authentication Error",
          description: "User ID is missing. Please try logging in again.",
          variant: "destructive"
        });
        onOpenChange(false);
      }
    }
  }, [open, stockIn, userId, onOpenChange, toast]);
  
  // Handle wizard completion
  const handleWizardComplete = (batchId: string) => {
    console.log("Wizard completed with batch ID:", batchId);
    onOpenChange(false);
    
    // Store the newly added batch ID in localStorage for highlighting in the batches tab
    localStorage.setItem('recentlyAddedBatchId', batchId);
    localStorage.setItem('recentlyAddedTimestamp', Date.now().toString());
    
    // Set tab parameter to ensure we land on the batches tab in EnhancedInventoryView
    const baseRoute = adminMode ? '/admin' : '/manager';
    const redirectUrl = `${baseRoute}/inventory?tab=batches&highlight=${batchId}`;
    
    // Show success toast with batch ID and clickable action
    toast({
      title: "Stock-In Processed Successfully",
      description: `Batch #${batchId.slice(0, 8)} has been processed and items are now in inventory. View the batch details for more information.`,
      variant: "default",
      action: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(redirectUrl)}
        >
          View Processed Batch
        </Button>
      ),
      duration: 10000, // Longer duration to give user time to click
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[1200px] h-[90vh] overflow-hidden flex flex-col">
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