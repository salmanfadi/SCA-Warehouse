import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Inbox, BarChart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SalesOperatorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Products',
      description: 'View and manage product catalog',
      icon: <Package className="h-6 w-6" />,
      path: '/sales/products'
    },
    {
      title: 'Inventory',
      description: 'Check current inventory levels',
      icon: <BarChart className="h-6 w-6" />,
      path: '/sales/inventory'
    },
    {
      title: 'Sales Inquiries',
      description: 'Manage customer inquiries',
      icon: <Inbox className="h-6 w-6" />,
      path: '/sales/inquiries'
    },
    {
      title: 'Orders',
      description: 'View and manage customer orders',
      icon: <ShoppingBag className="h-6 w-6" />,
      path: '/sales/orders'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        description="Sales operator dashboard overview."
      />
      
      <div className="grid gap-4 md:grid-cols-3">
        {menuItems.map((item) => (
          <Card 
            key={item.title}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(item.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              {item.icon}
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SalesOperatorDashboard;
