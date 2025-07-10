
import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PublicLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ 
  children,
  className 
}) => {
  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
      className
    )}>
      <main className="flex-1 flex flex-col">
        {children || <Outlet />}
      </main>
      
      <footer className="py-4 text-center text-sm text-slate-500">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} Agile Warehouse Management System
        </div>
      </footer>
    </div>
  );
};
