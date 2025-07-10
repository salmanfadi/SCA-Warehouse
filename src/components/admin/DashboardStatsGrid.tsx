import React from 'react';
import { StatsCard } from '@/components/ui/StatsCard';

export interface DashboardStats {
  users: number;
  warehouses: number;
  products: number;
  inventory: number;
}

export interface DashboardStatsGridProps {
  stats?: DashboardStats;
  loading?: boolean;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ 
  stats, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="col-span-1 md:col-span-2 lg:col-span-1 flex flex-col gap-2">
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 ml-1">User</span>
        <StatsCard
          title="Total Users"
          value={stats?.users?.toString() || '0'}
          description="Active users in system"
        />
      </div>
      <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-2">
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1 ml-1">Stock</span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Warehouses"
            value={stats?.warehouses?.toString() || '0'}
            description="Total warehouse locations"
          />
          <StatsCard
            title="Products"
            value={stats?.products?.toString() || '0'}
            description="Products in catalog"
          />
          <StatsCard
            title="Inventory Items"
            value={stats?.inventory?.toString() || '0'}
            description="Total inventory items"
          />
        </div>
      </div>
    </div>
  );
};
