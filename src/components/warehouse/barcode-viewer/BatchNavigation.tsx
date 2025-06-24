
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BatchNavigationProps {
  currentBatchIndex: number;
  totalBatches: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const BatchNavigation: React.FC<BatchNavigationProps> = ({
  currentBatchIndex,
  totalBatches,
  onPrevious,
  onNext,
}) => {
  const currentBatchNumber = currentBatchIndex + 1;

  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={currentBatchIndex === 0}
        className="h-6 w-6"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span>Batch {currentBatchNumber} of {totalBatches}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={currentBatchIndex >= totalBatches - 1}
        className="h-6 w-6"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
