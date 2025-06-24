
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BarcodeActionsProps {
  hasMultipleBatches: boolean;
  isGeneratingPdf: boolean;
  onGenerateSingleBatch: () => void;
  onGenerateAllBatches: () => void;
}

export const BarcodeActions: React.FC<BarcodeActionsProps> = ({
  hasMultipleBatches,
  isGeneratingPdf,
  onGenerateSingleBatch,
  onGenerateAllBatches,
}) => {
  return (
    <div className="space-x-2">
      {hasMultipleBatches && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateSingleBatch}
          disabled={isGeneratingPdf}
          className="mr-2"
        >
          <Download className="mr-2 h-4 w-4" />
          {isGeneratingPdf ? 'Generating...' : 'This Batch'}
        </Button>
      )}
      <Button
        variant="default"
        size="sm"
        onClick={onGenerateAllBatches}
        disabled={isGeneratingPdf}
      >
        <Download className="mr-2 h-4 w-4" />
        {hasMultipleBatches
          ? (isGeneratingPdf ? 'Generating...' : 'All Batches')
          : (isGeneratingPdf ? 'Generating...' : 'Download PDF')}
      </Button>
    </div>
  );
};
