import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutGrid, Boxes, PackageOpen, Package, 
  Users, ShoppingBag, Warehouse, PanelLeft,
  MessageSquare, Users2, Store, Clock,
  BarChart3, BarChart, ChartBar, AlertTriangle,
  History, Home, Database, Barcode, Search, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Helper function to render nav items with proper collapsed state handling
  const renderNavItem = (to: string, icon: React.ReactNode, label: string) => {
    // Check if current path matches exactly or if it's a sub-path (but not for dashboard)
    const isActive = to === '/' 
      ? location.pathname === to
      : to === `/${user?.role}`
        ? location.pathname === to
        : location.pathname.startsWith(to);

    return (
      <div className="relative">
        <NavLink 
          to={to} 
          className={cn(
            "flex items-center px-2 py-2 rounded-md group",
            isActive ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200"
          )}
        >
          <div className="flex items-center justify-center w-8">
            {icon}
          </div>
          {isOpen && (
            <span className="ml-4 transition-all duration-300">
              {label}
            </span>
          )}
        </NavLink>
        {/* Text for collapsed state - positioned outside sidebar */}
        {!isOpen && (
          <div className="fixed left-16 ml-2 bg-white dark:bg-slate-800 shadow-lg rounded-md py-2 px-3 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] top-1/2 -translate-y-1/2">
            <span>{label}</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <>
      {/* Mobile Overlay - Moved to top level and increased z-index */}
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[45] lg:hidden"
          aria-label="Sidebar overlay"
          tabIndex={0}
          role="button"
          onClick={() => setIsOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false); }}
        />
      )}
      {/* Sidebar container - responsive */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[50] transform transition-all duration-300 ease-in-out bg-slate-50 dark:bg-slate-900 border-r shadow-sm",
          // Width based on open state
          isOpen ? "w-64" : "w-16",
          // On desktop (lg), maintain width based on open state
          "lg:w-auto lg:min-w-[4rem]",
          // On mobile, use transform to show/hide
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Make sidebar relative on desktop
          "lg:relative lg:inset-0"
        )}
        aria-label="Sidebar navigation"
        tabIndex={-1}
      >
        <div className="flex flex-col h-full">
          <div className={cn(
            "h-16 flex items-center border-b px-4 relative",
            !isOpen && "px-2"
          )}>
            <button
              onClick={handleToggleSidebar}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors shrink-0"
            >
              <PanelLeft className={cn(
                "h-5 w-5 transition-transform duration-300",
                !isOpen && "transform rotate-180"
              )} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <nav className="px-2 space-y-1">
                {renderNavItem("/admin", <Home className="h-5 w-5" />, "Dashboard")}
                {renderNavItem("/admin/products", <Package className="h-5 w-5" />, "Products")}
                {renderNavItem("/admin/warehouses", <Warehouse className="h-5 w-5" />, "Warehouses")}
                {renderNavItem("/admin/inventory", <Database className="h-5 w-5" />, "Inventory")}
                {renderNavItem("/admin/stock-in", <ArrowDownCircle className="h-5 w-5" />, "Stock In")}
                {renderNavItem("/admin/stock-out", <ArrowUpCircle className="h-5 w-5" />, "Stock Out")}
                {renderNavItem("/admin/stock-out-history", <History className="h-5 w-5" />, "Stock-Out History")}
                {renderNavItem("/admin/transfers", <ArrowLeftRight className="h-5 w-5" />, "Transfers")}
                {renderNavItem("/admin/barcodes", <Barcode className="h-5 w-5" />, "Barcodes")}
                {renderNavItem("/admin/barcode", <Search className="h-5 w-5" />, "Barcode Lookup")}
                {renderNavItem("/admin/users", <Users className="h-5 w-5" />, "Users")}
                {renderNavItem("/admin/sales-inquiries", <MessageSquare className="h-5 w-5" />, "Sales Inquiries")}
              </nav>
            )}
            
            {/* Warehouse Manager Navigation */}
            {user?.role === 'warehouse_manager' && (
              <nav className="px-2 space-y-1">
                {renderNavItem("/manager", <LayoutGrid className="h-5 w-5" />, "Dashboard")}
                {renderNavItem("/manager/inventory", <Boxes className="h-5 w-5" />, "Inventory")}
                {renderNavItem("/manager/stock-in", <PackageOpen className="h-5 w-5" />, "Stock In")}
                {renderNavItem("/manager/stock-out", <Package className="h-5 w-5" />, "Stock Out")}
                {renderNavItem("/manager/stock-out-history", <History className="h-5 w-5" />, "Stock-Out History")}
                {renderNavItem("/manager/transfers", <Warehouse className="h-5 w-5" />, "Transfers")}
                {renderNavItem("/manager/barcode", <ShoppingBag className="h-5 w-5" />, "Barcode Lookup")}
              </nav>
            )}
            
            {/* Field Operator Navigation */}
            {user?.role === 'field_operator' && (
              <nav className="px-2 space-y-1">
                {renderNavItem("/operator", <LayoutGrid className="h-5 w-5" />, "Dashboard")}
                {renderNavItem("/operator/stock-in", <PackageOpen className="h-5 w-5" />, "Stock In")}
                {renderNavItem("/operator/submissions", <Boxes className="h-5 w-5" />, "Submissions")}
                {renderNavItem("/operator/barcode", <ShoppingBag className="h-5 w-5" />, "Barcode Lookup")}
                {renderNavItem("/operator/transfers", <Warehouse className="h-5 w-5" />, "Transfers")}
              </nav>
            )}
            
            {/* Sales Operator Navigation */}
            {user?.role === 'sales_operator' && (
              <nav className="px-2 space-y-1">
                {renderNavItem("/sales", <LayoutGrid className="h-5 w-5" />, "Dashboard")}
                {renderNavItem("/sales/inventory", <Boxes className="h-5 w-5" />, "Product Catalog")}
                {renderNavItem("/sales/inquiries", <MessageSquare className="h-5 w-5" />, "Sales Inquiries")}
                {renderNavItem("/sales/orders", <Store className="h-5 w-5" />, "Orders")}
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
