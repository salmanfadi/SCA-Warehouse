
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export interface ErrorStateProps {
  message?: string;
  details?: string;
  onNavigateBack?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = "Error occurred", 
  details,
  onNavigateBack 
}) => {
  return (
    <div className="p-6">
      <PageHeader 
        title="Error" 
        description={message || "An unexpected error occurred"} 
      />
      
      {details && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>{details}</AlertDescription>
        </Alert>
      )}
      
      {onNavigateBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      )}
    </div>
  );
};
