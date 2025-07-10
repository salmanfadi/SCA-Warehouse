
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DashboardStatsGrid } from '@/components/admin/DashboardStatsGrid';
import { RecentActivityTable } from '@/components/admin/RecentActivityTable';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

const AdminDashboard: React.FC = () => {
  const { 
    stats, 
    activity, 
    statsLoading, 
    activityLoading 
  } = useAdminDashboardData();

  // Transform activity data to match ActivityItem interface
  const transformedActivity: ActivityItem[] = (activity || []).map(item => ({
    id: item.id,
    action: item.action,
    user: item.user,
    timestamp: item.timestamp,
    details: item.details
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of system metrics and recent activity"
      />
      
      <DashboardStatsGrid 
        stats={stats} 
        loading={statsLoading} 
      />
      
      <RecentActivityTable 
        activities={transformedActivity}
        loading={activityLoading}
      />
    </div>
  );
};

export default AdminDashboard;
