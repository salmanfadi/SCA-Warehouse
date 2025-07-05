import React from 'react';
import { useNavigate } from 'react-router-dom';
import StockOutPage from '@/pages/warehouseManager/StockOutPage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Barcode, Plus, ScanLine } from 'lucide-react';

const StockOutManagement: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    navigate('/admin');
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Out Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage outgoing stock requests across warehouses
          </p>
        </div>
      </div>

      <StockOutPage 
        isAdminView={true}
        overrideBackNavigation={handleBackNavigation}
      />
    </div>
  );
};

export default StockOutManagement;
