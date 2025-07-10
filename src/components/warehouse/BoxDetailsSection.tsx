
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BoxMetadata } from '@/types/batchStockIn';
import { Box } from 'lucide-react';

interface BoxDetailsSectionProps {
  boxNumber: number;
  metadata: BoxMetadata;
  onChange: (field: keyof BoxMetadata, value: any) => void;
  readOnly?: boolean;
}

export const BoxDetailsSection: React.FC<BoxDetailsSectionProps> = ({
  boxNumber,
  metadata,
  onChange,
  readOnly = false
}) => {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Box className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Box #{boxNumber}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`barcode-${boxNumber}`}>Barcode</Label>
            <Input
              id={`barcode-${boxNumber}`}
              value={metadata.barcode || ''}
              readOnly
              className="font-mono text-sm bg-slate-50 dark:bg-slate-900"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor={`weight-${boxNumber}`}>Weight (kg)</Label>
              <Input
                id={`weight-${boxNumber}`}
                type="number"
                min="0"
                step="0.01"
                value={metadata.weight || ''}
                onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
                readOnly={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`length-${boxNumber}`}>Length (cm)</Label>
              <Input
                id={`length-${boxNumber}`}
                type="number"
                min="0"
                step="0.1"
                value={metadata.length || ''}
                onChange={(e) => onChange('length', parseFloat(e.target.value) || 0)}
                readOnly={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`width-${boxNumber}`}>Width (cm)</Label>
              <Input
                id={`width-${boxNumber}`}
                type="number"
                min="0"
                step="0.1"
                value={metadata.width || ''}
                onChange={(e) => onChange('width', parseFloat(e.target.value) || 0)}
                readOnly={readOnly}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`height-${boxNumber}`}>Height (cm)</Label>
              <Input
                id={`height-${boxNumber}`}
                type="number"
                min="0"
                step="0.1"
                value={metadata.height || ''}
                onChange={(e) => onChange('height', parseFloat(e.target.value) || 0)}
                readOnly={readOnly}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`remarks-${boxNumber}`}>Remarks</Label>
            <Textarea
              id={`remarks-${boxNumber}`}
              value={metadata.remarks || ''}
              onChange={(e) => onChange('remarks', e.target.value)}
              placeholder="Optional notes about this box"
              rows={2}
              readOnly={readOnly}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
