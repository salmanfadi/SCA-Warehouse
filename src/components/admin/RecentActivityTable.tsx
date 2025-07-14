
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
              <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-2">
                <div className="flex-grow">
                  <p className="font-medium line-clamp-2">{activity.action}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">by {activity.user}</p>
                  {activity.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mt-1" title={activity.details}>
                      {activity.details}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0 sm:ml-4 sm:text-right whitespace-nowrap">
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
