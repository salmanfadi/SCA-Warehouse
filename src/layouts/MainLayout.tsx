import React, { useState, ReactNode, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useMobileDetector } from '@/hooks/use-mobile'; // Remove .tsx extension
import { OfflineDetector } from '@/components/pwa/OfflineDetector';
import { EnhancedInstallPrompt } from '@/components/pwa/EnhancedInstallPrompt';
import { StandaloneDetector } from '@/components/pwa/StandaloneDetector';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children?: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useMobileDetector();
  const location = useLocation();
  
  // On mobile, sidebar should be closed by default
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  
  // Close sidebar on route change if mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);
  
  // Map route patterns to titles
  const pathTitles: { [key: string]: string } = {
    '/admin': 'Dashboard',
    '/admin/products': 'Products',
    '/admin/warehouses': 'Warehouses',
    '/admin/users': 'Users',
    '/admin/sales-inquiries': 'Sales Inquiries',
    '/admin/inventory': 'Inventory',
    '/admin/barcodes': 'Barcodes',
    '/admin/barcode': 'Barcode Lookup',
    '/admin/stock-in': 'Stock In',
    '/admin/stock-out': 'Stock Out',
    '/admin/transfers': 'Transfers',
    '/manager': 'Dashboard',
    '/manager/stock-in': 'Stock In',
    '/manager/stock-out': 'Stock Out',
    '/manager/barcode': 'Barcode Lookup',
    '/manager/inventory': 'Inventory',
    '/manager/transfers': 'Transfers',
    '/operator': 'Dashboard',
    '/operator/stock-in': 'Stock In',
    '/operator/submissions': 'Submissions',
    '/operator/barcode': 'Barcode Lookup',
    '/operator/transfers': 'Transfers',
    '/operator/settings': 'Settings',
    '/sales': 'Sales Dashboard',
    '/sales/products': 'Products',
    '/sales/inventory': 'Inventory',
    '/sales/inquiries': 'Sales Inquiries',
    '/sales/orders': 'Orders',
    '/sales/customers': 'Customers',
    '/customer/portal': 'Customer Portal',
    '/customer/products': 'Product Catalogue',
    '/customer/inquiry': 'Customer Inquiry',
    '/customer/inquiry/success': 'Inquiry Success',
    '/products': 'Product Catalogue',
    '/cart': 'Cart',
    '/': 'Dashboard',
  };

  // Find the best matching title for the current path
  function getPageTitle(pathname: string): string {
    // Try exact match first
    if (pathTitles[pathname]) return pathTitles[pathname];
    // Try prefix match for nested routes
    const match = Object.keys(pathTitles).find((key) => pathname.startsWith(key));
    return match ? pathTitles[match] : 'Warehouse Management';
  }
  const pageTitle = getPageTitle(location.pathname);
  
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200 overflow-x-hidden">
      <StandaloneDetector />
      <OfflineDetector className="offline-indicator" />
      
      <div className="w-full bg-white dark:bg-gray-900">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          title={pageTitle}
        />
      </div>
      
      <div className="flex flex-1 w-full overflow-x-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className={cn(
          "flex-1 p-4 md:p-6 transition-all duration-200 bg-white dark:bg-gray-900 w-full overflow-x-hidden",
          isSidebarOpen ? "ml-64" : "ml-16",
          "sm:ml-0 md:ml-16 lg:ml-16"
        )}>
          <div className="max-w-7xl mx-auto w-full overflow-x-hidden">
            {children || <Outlet />}
          </div>
        </main>
      </div>
      
      <EnhancedInstallPrompt />
    </div>
  );
};

export default MainLayout;
