
import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import BatchStockInComponent from '@/components/warehouse/BatchStockInComponent';
import { useNavigate } from 'react-router-dom';

const AdminBatchStockInPage: React.FC = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  
  const handleSheetClose = () => {
    setOpen(false);
    setTimeout(() => navigate('/admin/stock-in'), 300); // Wait for animation
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent side="right" className="w-full sm:w-[90%] md:w-[80%] lg:max-w-[1200px] overflow-y-auto p-0 rounded-l-2xl shadow-lg">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-2xl">Batch Stock In Processing</SheetTitle>
            <SheetDescription>
              Create and process multiple batches at once
            </SheetDescription>
          </SheetHeader>
          <div className="flex-grow p-4 md:p-6 overflow-y-auto">
            <BatchStockInComponent adminMode={true} sheetMode={true} onClose={handleSheetClose} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminBatchStockInPage;
