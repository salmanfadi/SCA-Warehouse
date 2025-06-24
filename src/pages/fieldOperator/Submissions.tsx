
import React from 'react';
import { useUserStockActivity } from '@/hooks/useUserStockActivity';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Submissions: React.FC = () => {
  const { user } = useAuth();
  
  const { stockIns, stockOuts, transfers, isLoading } = useUserStockActivity(user?.id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const stockInItems = stockIns || [];
  const stockOutItems = stockOuts || [];
  const transferItems = transfers || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Submissions</h1>
      </div>
      
      <Tabs defaultValue="stock-in" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-in">Stock In ({stockInItems.length})</TabsTrigger>
          <TabsTrigger value="stock-out">Stock Out ({stockOutItems.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transferItems.length})</TabsTrigger>
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

        <TabsContent value="stock-out" className="space-y-4">
          {stockOutItems.length > 0 ? (
            stockOutItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-center">
                    Stock Out Request
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Destination</p>
                      <p className="font-medium">{item.destination}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Requested</p>
                      <p className="font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{item.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No stock out requests yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          {transferItems.length > 0 ? (
            transferItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-center">
                    Transfer Request
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">{item.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No transfer requests yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Submissions;
