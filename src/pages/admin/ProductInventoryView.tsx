import React from 'react';
import { ProductView } from '@/components/warehouse/ProductView';
import { Helmet } from 'react-helmet-async';

export default function ProductInventoryView() {
  return (
    <>
      <Helmet>
        <title>Product Inventory | Agile Warehouse</title>
      </Helmet>
      <div className="container mx-auto py-6">
        <ProductView />
      </div>
    </>
  );
}
