import React from 'react';
import { useNavigate } from 'react-router-dom';
import StockOutPage from '@/pages/warehouseManager/StockOutPage';

const StockOutManagement: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    navigate('/admin');
    return true;
  };

  return (
    <StockOutPage 
      isAdminView={true}
      overrideBackNavigation={handleBackNavigation}
    />
  );
};

export default StockOutManagement;
