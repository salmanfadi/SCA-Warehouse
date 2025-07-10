
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  showSkeleton?: boolean;
  itemCount?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...", 
  showSkeleton = true,
  itemCount = 5
}) => {
  // If we want to show skeleton UI
  if (showSkeleton) {
    return (
      <div className="space-y-4">
        {/* Small loading indicator at the top */}
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        
        {/* Skeleton table rows */}
        <div className="space-y-2">
          {Array(itemCount).fill(0).map((_, index) => (
            <div key={`skeleton-row-${index}`} className="flex items-center p-2 rounded-md animate-pulse">
              <div className="w-1/6 h-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
              <div className="w-2/6 h-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
              <div className="w-1/6 h-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
              <div className="w-1/6 h-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
              <div className="w-1/6 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Traditional spinner for cases where we still want it
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      <p className="text-base font-medium text-muted-foreground">{message}</p>
    </div>
  );
};
