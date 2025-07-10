import React from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedInventoryView from '@/pages/warehouseManager/EnhancedInventoryView';

const AdminEnhancedInventoryView: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBackNavigation = () => {
    navigate('/admin');
    return true;
  };

  return (
    <EnhancedInventoryView 
      isAdminView={true}
      overrideBackNavigation={handleBackNavigation}
    />
  );
};

export default AdminEnhancedInventoryView;
