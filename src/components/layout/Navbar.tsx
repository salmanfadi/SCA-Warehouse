
import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  toggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  toggleSidebar,
  sidebarCollapsed 
}) => {
  return (
    <header className="sticky top-0 z-10 h-16 bg-white dark:bg-slate-900 border-b flex items-center px-4">
      <div className="flex items-center">
        {toggleSidebar && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleSidebar}
            className="mr-2"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </header>
  );
};
