
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, className = '' }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`hover-lift ${className}`}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Stock In Processing
    </Button>
  );
};
