import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Warehouse, PackageCheck } from 'lucide-react';

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalWarehouses: number;
  totalStockIn: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
  loading?: boolean;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ 
  stats, 
  loading = false 
}) => {
  const statItems = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      description: 'Active system users'
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: <Package className="h-4 w-4 text-muted-foreground" />,
      description: 'Products in catalog'
    },
    {
      title: 'Total Warehouses',
      value: stats?.totalWarehouses || 0,
      icon: <Warehouse className="h-4 w-4 text-muted-foreground" />,
      description: 'Active warehouses'
    },
    {
      title: 'Stock In Requests',
      value: stats?.totalStockIn || 0,
      icon: <PackageCheck className="h-4 w-4 text-muted-foreground" />,
      description: 'Total stock in requests'
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 animate-pulse bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <div className="h-8 w-24 animate-pulse bg-muted rounded" />
              </div>
              <p className="text-xs text-muted-foreground">
                <div className="h-4 w-32 animate-pulse bg-muted rounded mt-1" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
