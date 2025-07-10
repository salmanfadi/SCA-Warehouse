
import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface CustomerLayoutProps {
  children: ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};
