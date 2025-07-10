
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface RecentActivityTableProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ 
  activities, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 animate-pulse rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-600">by {activity.user}</p>
                  {activity.details && (
                    <p className="text-xs text-gray-500">{activity.details}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(activity.timestamp), 'MMM dd, HH:mm')}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
