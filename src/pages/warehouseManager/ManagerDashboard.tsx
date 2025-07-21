import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/ui/StatsCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useManagerDashboardData } from '@/hooks/useManagerDashboardData';
import { 
  Package, BoxesIcon, ArrowDownToLine, ArrowUpFromLine, 
  Truck, Warehouse, Barcode, LayoutDashboard, Loader2
} from 'lucide-react';

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.name || 'Warehouse Manager';
  const { 
    pendingStockIn, 
    pendingStockOut, 
    activeInventory, 
    warehouses,
    isLoading 
  } = useManagerDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader 
        description="Overview of warehouse operations."
      />
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pending Stock In"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingStockIn}
          description="Awaiting processing"
          icon={<ArrowDownToLine />}
          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
        />
        <StatsCard
          title="Pending Stock Out"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingStockOut}
          description="Awaiting approval"
          icon={<ArrowUpFromLine />}
          className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900"
        />
        <StatsCard
          title="Active Inventory"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeInventory.toLocaleString()}
          description="Items in stock"
          icon={<BoxesIcon />}
          className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
        />
        <StatsCard
          title="Warehouses"
          value={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : warehouses}
          description="Under management"
          icon={<Warehouse />}
          className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Stock In</CardTitle>
            <CardDescription>Process incoming inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review and process incoming stock requests from field operators and suppliers.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="default" className="w-full">
              <Link to="/manager/stock-in">
                <Package className="mr-2 h-4 w-4" />
                Process Stock In
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-l-4 border-l-amber-500 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Stock Out</CardTitle>
            <CardDescription>Manage outgoing inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Approve and process outgoing stock requests for shipment or distribution.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="default" className="w-full">
              <Link to="/manager/stock-out">
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Approve Stock Out
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-l-4 border-l-green-500 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>View current inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check stock levels, locations, and details across all warehouses.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="default" className="w-full">
              <Link to="/manager/inventory">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                View Inventory
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Barcode Lookup</CardTitle>
            <CardDescription>Scan product barcodes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scan barcodes to quickly identify and locate products in the warehouse.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="default" className="w-full">
              <Link to="/manager/barcode">
                <Barcode className="mr-2 h-4 w-4" />
                Barcode Lookup
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;