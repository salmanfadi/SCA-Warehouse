
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import BatchStockInComponent from '@/components/warehouse/BatchStockInComponent';
import { useNavigate, useParams } from 'react-router-dom';

const BatchStockInPage: React.FC = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { stockInId } = useParams<{ stockInId: string }>();
  
  const handleSheetClose = () => {
    setOpen(false);
    setTimeout(() => navigate('/manager/stock-in'), 300); // Wait for animation
  };
  
  const handleBatchCreationComplete = (id: string) => {
    // Redirect to barcode assignment page after batch creation
    setOpen(false);
    setTimeout(() => {
      navigate(`/manager/stock-in/${id}/barcode-assignment`);
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent side="right" className="w-full sm:w-[90%] md:w-[80%] lg:max-w-[1200px] overflow-y-auto p-0 rounded-l-2xl shadow-lg">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Batch Stock In Processing</SheetTitle>
            <SheetDescription>
              Create and process multiple batches at once
            </SheetDescription>
          </SheetHeader>
          <div className="flex-grow p-3 sm:p-4 md:p-6 overflow-y-auto scrollbar-thin">
            <BatchStockInComponent 
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

export default BatchStockInPage;
