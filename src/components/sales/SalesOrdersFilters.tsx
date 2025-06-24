
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

interface SalesOrdersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SalesOrdersFilters: React.FC<SalesOrdersFiltersProps> = ({
  searchTerm,
  onSearchChange,
  onCreateClick,
  onRefresh,
  isRefreshing = false
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex gap-2 max-w-md w-full">
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-grow"
        />
        <Button 
          variant="outline" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className="flex-shrink-0"
          title="Refresh orders"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create Order
      </Button>
    </div>
  );
};
