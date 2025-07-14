
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'pending':
        return { label: 'Pending', variant: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'approved':
        return { label: 'Approved', variant: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'processing':
        return { label: 'Processing', variant: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'completed':
        return { label: 'Completed', variant: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected':
        return { label: 'Rejected', variant: 'bg-red-100 text-red-800 border-red-200' };
      case 'failed':
        return { label: 'Failed', variant: 'bg-red-100 text-red-800 border-red-200' };
      case 'available':
        return { label: 'Available', variant: 'bg-green-100 text-green-800 border-green-200' };
      case 'sold':
        return { label: 'Sold', variant: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'damaged':
        return { label: 'Damaged', variant: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: status, variant: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const { label, variant } = getStatusConfig(status);

  return (
    <Badge 
      className={cn(
        "font-medium border px-2 py-1", 
        variant,
        className
      )}
      variant="outline"
    >
      {label}
    </Badge>
  );
};
