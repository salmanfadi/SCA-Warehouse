
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface CreateStockOutFormProps {
  onCreate: (stockOutData: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  userId?: string;
}

export const CreateStockOutForm: React.FC<CreateStockOutFormProps> = ({ 
  onCreate, 
  onCancel, 
  isLoading, 
  userId 
}) => {
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      console.error('User ID is missing.');
      return;
    }

    const newStockOut = {
      requested_by: userId,
      status: 'pending' as const,
      destination,
      notes,
      created_by: userId
    };

    onCreate(newStockOut);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="destination">Destination</Label>
        <Input
          type="text"
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          type="text"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Stock Out'
          )}
        </Button>
      </div>
    </form>
  );
};
