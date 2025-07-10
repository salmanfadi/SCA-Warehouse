
import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface StockInApprovalFormProps {
  approvalNotes: string;
  setApprovalNotes: (notes: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const StockInApprovalForm: React.FC<StockInApprovalFormProps> = ({
  approvalNotes,
  setApprovalNotes,
  onApprove,
  onReject,
  onCancel,
  isSubmitting = false
}) => {
  return (
    <>
      <div className="mb-4">
        <Label htmlFor="approvalNotes">Approval Notes</Label>
        <Textarea
          id="approvalNotes"
          placeholder="Enter any notes for approval or rejection"
          value={approvalNotes}
          onChange={(e) => setApprovalNotes(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex gap-2">
        <Button 
          variant="secondary" 
          onClick={onApprove}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Approve'}
        </Button>
        <Button 
          variant="destructive" 
          onClick={onReject}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Reject'}
        </Button>
        <Button 
          variant="ghost" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </>
  );
};
