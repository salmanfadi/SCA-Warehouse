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
        "fixed inset-y-0 left-0 z-50 transform transition-all duration-200 ease-in-out bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
        isOpen ? "w-64" : "w-16",
        isOpen ? "translate-x-0" : "translate-x-0")}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4">
            <h2 className={cn(
              "text-lg font-semibold transition-opacity duration-200 whitespace-nowrap overflow-hidden text-gray-900 dark:text-white",
              isOpen ? "opacity-100" : "opacity-0 w-0"
            )}>
              Agile Warehouse
            </h2>
            <button
              onClick={handleToggleSidebar}
              className="min-w-8 w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 ml-auto"
            >
              <PanelLeft className={cn(
                "h-5 w-5 transition-transform duration-200 text-gray-600 dark:text-gray-300",
                isOpen ? "rotate-180" : ""
              )} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/admin" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isOpen && "justify-center"
                )}>
                  <LayoutGrid className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn(
                    "transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>Dashboard</span>
                </NavLink>
                <NavLink to="/admin/inventory" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isOpen && "justify-center"
                )}>
                  <Boxes className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn(
                    "transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>Inventory</span>
                </NavLink>
                <NavLink to="/admin/products" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isOpen && "justify-center"
                )}>
                  <Package className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn(
                    "transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>Products</span>
                </NavLink>
                <NavLink to="/admin/warehouses" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isOpen && "justify-center"
                )}>
                  <Warehouse className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn(
                    "transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>Warehouses</span>
                </NavLink>
                <NavLink to="/admin/stock-in" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors duration-200",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isOpen && "justify-center"
                )}>
                  <PackageOpen className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn(
                    "transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                  )}>Stock In</span>
                </NavLink>
                <NavLink to="/admin/stock-out" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Package className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Stock Out</span>
                </NavLink>
                <NavLink to="/admin/transfers" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Warehouse className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Transfers</span>
                </NavLink>
                <NavLink to="/admin/barcode" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <ShoppingBag className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Barcode Lookup</span>
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Users className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Users</span>
                </NavLink>
                <NavLink to="/admin/sales-inquiries" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <ShoppingBag className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Sales Inquiries</span>
                </NavLink>
              </nav>
            )}
            
            {/* Warehouse Manager Navigation */}
            {user?.role === 'warehouse_manager' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/manager" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <LayoutGrid className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Dashboard</span>
                </NavLink>
                <NavLink to="/manager/inventory" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Boxes className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Inventory</span>
                </NavLink>
                <NavLink to="/manager/stock-in" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <PackageOpen className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Stock In</span>
                </NavLink>
                <NavLink to="/manager/stock-out" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Package className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Stock Out</span>
                </NavLink>
                <NavLink to="/manager/reserve-stock" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Clock className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Reserve Stock</span>
                </NavLink>
                <NavLink to="/manager/transfers" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Warehouse className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Transfers</span>
                </NavLink>
                
                <NavLink to="/manager/barcode" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <ShoppingBag className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Barcode Lookup</span>
                </NavLink>
              </nav>
            )}
            
            {/* Field Operator Navigation */}
            {user?.role === 'field_operator' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/operator" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <LayoutGrid className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Dashboard</span>
                </NavLink>
                <NavLink to="/operator/stock-in" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <PackageOpen className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Stock In</span>
                </NavLink>
                <NavLink to="/operator/stock-out" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Package className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Stock Out</span>
                </NavLink>
                <NavLink to="/operator/submissions" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Boxes className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Submissions</span>
                </NavLink>
                <NavLink to="/operator/barcode" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <ShoppingBag className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Barcode Lookup</span>
                </NavLink>
                <NavLink to="/operator/transfers" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Warehouse className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Transfers</span>
                </NavLink>
              </nav>
            )}
            
            {/* Sales Operator Navigation */}
            {user?.role === 'sales_operator' && (
              <nav className="px-2 space-y-1">
                <NavLink to="/sales" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <LayoutGrid className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Dashboard</span>
                </NavLink>
                
                {/* Products & Inventory */}
                <NavLink to="/sales/inventory" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Boxes className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Product Catalog</span>
                </NavLink>
                
                {/* Customer Management */}
                <NavLink to="/sales/customers" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Users2 className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Customers</span>
                </NavLink>
                
                {/* Sales Inquiries */}
                <NavLink to="/sales/inquiries" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <MessageSquare className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Sales Inquiries</span>
                </NavLink>
                
                {/* Orders */}
                <NavLink to="/sales/orders" className={({ isActive }) => cn(
                  "flex items-center px-2 py-2 rounded-md",
                  isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
                  !isOpen && "justify-center"
                )}>
                  <Store className={cn("h-5 w-5", isOpen && "mr-3")} />
                  <span className={cn("transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden")}>Orders</span>
                </NavLink>
              </nav>
            )}
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
