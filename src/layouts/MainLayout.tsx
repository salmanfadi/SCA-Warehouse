import React, { useState, ReactNode, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useMobileDetector } from '@/hooks/use-mobile.tsx';
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      <StandaloneDetector />
      <OfflineDetector className="offline-indicator" />
      
      <div className={cn(
        "transition-all duration-200 bg-white dark:bg-gray-900",
        isSidebarOpen ? "pl-64" : "pl-16"
      )}>
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
      </div>
      
      <div className="flex flex-1">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <main className={cn(
          "flex-1 p-4 md:p-6 transition-all duration-200 bg-white dark:bg-gray-900",
          isSidebarOpen ? "ml-64" : "ml-16"
        )}>
          <div className="max-w-7xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
      
      <EnhancedInstallPrompt />
    </div>
  );
};

export default MainLayout;
