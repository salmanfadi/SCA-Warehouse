
import React from 'react';
import { useUserStockActivity } from '@/hooks/useUserStockActivity';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Submissions: React.FC = () => {
  const { user } = useAuth();
  const { stockIns, isLoading } = useUserStockActivity(user?.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const stockInItems = stockIns || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Submissions</h1>
      </div>
      <Tabs defaultValue="stock-in" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-in">Stock In ({stockInItems.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="stock-in" className="space-y-4">
          {stockInItems.length > 0 ? (
            stockInItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {item.product?.name || 'Unknown Product'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-medium">{item.product?.sku || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Boxes</p>
                      <p className="font-medium">{item.number_of_boxes || 1}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                      <p className="font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {item.status && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="text-sm">{item.status}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No stock in submissions yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Submissions;
