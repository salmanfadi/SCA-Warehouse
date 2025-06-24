
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StockInProcessing from '@/pages/warehouseManager/StockInProcessing';

const AdminStockInManagement: React.FC = () => {
  const navigate = useNavigate();

  const handleBackNavigation = () => {
    navigate('/admin');
    return true;
  };

  return (
    <StockInProcessing 
      isAdminView={true}
      overrideBackNavigation={handleBackNavigation}
    />
  );
};

export default AdminStockInManagement;
