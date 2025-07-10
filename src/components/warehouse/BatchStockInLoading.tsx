
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const BatchStockInLoading: React.FC = () => {
  return (
    <Card className="apple-shadow-sm">
      <CardContent className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </CardContent>
    </Card>
  );
};
