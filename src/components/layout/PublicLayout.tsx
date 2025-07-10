
import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface PublicLayoutProps {
  children: ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};
