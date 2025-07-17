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
  
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200 overflow-x-hidden">
      <StandaloneDetector />
      <OfflineDetector className="offline-indicator" />
      
      <div className="w-full bg-white dark:bg-gray-900">
        <Header />
      </div>
      
      <div className="flex flex-1 w-full overflow-x-hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className={cn(
          "flex-1 p-4 md:p-6 transition-all duration-200 bg-white dark:bg-gray-900 w-full overflow-x-hidden",
          // Only apply margin on desktop, and only based on sidebar state
          isSidebarOpen ? "ml-64" : "ml-16",
          // On mobile, no margin
          "sm:ml-0"
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
