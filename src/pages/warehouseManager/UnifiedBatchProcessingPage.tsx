
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useNavigate, useParams } from 'react-router-dom';
import UnifiedBatchProcessing from '@/components/warehouse/UnifiedBatchProcessing';

const UnifiedBatchProcessingPage: React.FC = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { stockInId } = useParams<{ stockInId: string }>();
  
  const handleSheetClose = () => {
    setOpen(false);
    setTimeout(() => navigate('/manager/stock-in'), 300); // Wait for animation
  };
  
  const handleBatchCreationComplete = (id: string) => {
    // Redirect to inventory page after batch creation
    setOpen(false);
    setTimeout(() => {
      navigate(`/manager/inventory`);
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent side="right" className="w-full sm:w-[95%] md:w-[90%] lg:max-w-[1400px] overflow-y-auto p-0 rounded-l-2xl shadow-lg">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>All-in-One Batch Processing</SheetTitle>
            <SheetDescription>
              Create, process and assign barcodes to batches - all in one unified workflow
            </SheetDescription>
          </SheetHeader>
          <div className="flex-grow p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-thin">
            <UnifiedBatchProcessing 
              sheetMode={true} 
              onClose={handleSheetClose}
              stockInId={stockInId} 
              onComplete={handleBatchCreationComplete}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UnifiedBatchProcessingPage;
