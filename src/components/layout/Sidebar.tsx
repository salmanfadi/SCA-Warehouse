import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutGrid, Boxes, PackageOpen, Package, 
  Users, ShoppingBag, Warehouse, PanelLeft,
  MessageSquare, Users2, Store, Clock,
  BarChart3, BarChart, ChartBar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const { user } = useAuth();
  
  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <>
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out bg-slate-50 dark:bg-slate-900 border-r shadow-sm",
        isOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center border-b px-4">
            <h2 className="text-lg font-semibold">
              Agile Warehouse
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/admin" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <LayoutGrid className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/admin/inventory" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Boxes className="mr-3 h-5 w-5" />
                  <span>Inventory</span>
                </NavLink>
                <NavLink to="/admin/products" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Package className="mr-3 h-5 w-5" />
                  <span>Products</span>
                </NavLink>
                <NavLink to="/admin/warehouses" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Warehouse className="mr-3 h-5 w-5" />
                  <span>Warehouses</span>
                </NavLink>
                <NavLink to="/admin/stock-in" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <PackageOpen className="mr-3 h-5 w-5" />
                  <span>Stock In</span>
                </NavLink>
                <NavLink to="/admin/stock-out" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Package className="mr-3 h-5 w-5" />
                  <span>Stock Out</span>
                </NavLink>
                <NavLink to="/admin/transfers" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Warehouse className="mr-3 h-5 w-5" />
                  <span>Transfers</span>
                </NavLink>
                <NavLink to="/admin/barcode" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  <span>Barcode Lookup</span>
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Users className="mr-3 h-5 w-5" />
                  <span>Users</span>
                </NavLink>
                <NavLink to="/admin/sales-inquiries" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  <span>Sales Inquiries</span>
                </NavLink>
              </nav>
            )}
            
            {/* Warehouse Manager Navigation */}
            {user?.role === 'warehouse_manager' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/manager" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <LayoutGrid className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/manager/inventory" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Boxes className="mr-3 h-5 w-5" />
                  <span>Inventory</span>
                </NavLink>
                <NavLink to="/manager/stock-in" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <PackageOpen className="mr-3 h-5 w-5" />
                  <span>Stock In</span>
                </NavLink>
                <NavLink to="/manager/stock-out" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Package className="mr-3 h-5 w-5" />
                  <span>Stock Out</span>
                </NavLink>
                <NavLink to="/manager/reserve-stock" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Clock className="mr-3 h-5 w-5" />
                  <span>Reserve Stock</span>
                </NavLink>
                <NavLink to="/manager/transfers" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Warehouse className="mr-3 h-5 w-5" />
                  <span>Transfers</span>
                </NavLink>
                
                <NavLink to="/manager/barcode" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <ShoppingBag className="mr-3 h-5 w-5" />
                  <span>Barcode Lookup</span>
                </NavLink>
              </nav>
            )}
            
            {/* Field Operator Navigation */}
            {user?.role === 'field_operator' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/operator" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <LayoutGrid className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/operator/stock-in" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <PackageOpen className="mr-3 h-5 w-5" />
                  <span>Stock In</span>
                </NavLink>
                <NavLink to="/operator/stock-out" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Package className="mr-3 h-5 w-5" />
                  <span>Stock Out</span>
                </NavLink>
                <NavLink to="/operator/submissions" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Boxes className="mr-3 h-5 w-5" />
                  <span>Submissions</span>
                </NavLink>
                <NavLink to="/operator/barcode" className={({ isActive }) =>
                    cn("flex items-center px-2 py-2 rounded-md",
                        isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <ShoppingBag className="mr-3 h-5 w-5"/>
                  <span>Barcode Lookup</span>
                </NavLink>
                <NavLink to="/operator/transfers" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Warehouse className="mr-3 h-5 w-5" />
                  <span>Transfers</span>
                </NavLink>
              </nav>
            )}
            
            {/* Sales Operator Navigation */}
            {user?.role === 'sales_operator' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/sales" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <LayoutGrid className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </NavLink>
                
                {/* Products & Inventory */}
                <NavLink to="/sales/inventory" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Boxes className="mr-3 h-5 w-5" />
                  <span>Product Catalog</span>
                </NavLink>
                
                {/* Customer Management */}
                <NavLink to="/sales/customers" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Users2 className="mr-3 h-5 w-5" />
                  <span>Customers</span>
                </NavLink>
                
                {/* Sales Inquiries */}
                <NavLink to="/sales/inquiries" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <MessageSquare className="mr-3 h-5 w-5" />
                  <span>Sales Inquiries</span>
                </NavLink>
                
                {/* Orders */}
                <NavLink to="/sales/orders" className={({ isActive }) => cn("flex items-center px-2 py-2 rounded-md", isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200")}>
                  <Store className="mr-3 h-5 w-5" />
                  <span>Orders</span>
                </NavLink>
              </nav>
            )}
          </div>
          
          <div className="h-16 flex items-center border-t px-4 justify-between">
            <button
              onClick={handleToggleSidebar}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-200"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
