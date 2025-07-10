import React from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import BatchBarcodesViewer from '@/components/warehouse/BatchBarcodesViewer';
import { RequireAuth } from '@/components/auth/RequireAuth';

const BatchBarcodesPage: React.FC = () => {
  return (
    <RequireAuth allowedRoles={['admin', 'warehouse_manager', 'field_operator']}>
      <MainLayout>
        <div className="container mx-auto py-6">
          <BatchBarcodesViewer />
        </div>
      </MainLayout>
    </RequireAuth>
  );
};

export default BatchBarcodesPage;
