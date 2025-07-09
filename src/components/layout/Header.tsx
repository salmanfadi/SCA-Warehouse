import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, User, LogOut, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/ui/mode-toggle';


interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen, title }) => {
  const { user, logout } = useAuth();
  const [notifications] = useState([]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getDisplayName = () => {
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getUserInitials = () => {
    const name = getDisplayName();
    return name.substring(0, 2).toUpperCase();
  };

  return (

    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className={cn(
            "fixed transition-all duration-300 ease-in-out",
            isSidebarOpen ? "left-[280px]" : "left-24"
          )}>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title || 'Warehouse Management'}
            </h1>
          </div>

        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ModeToggle />
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative text-gray-700 dark:text-gray-300">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Notifications</h4>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No new notifications</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {notifications.map((notification: any) => (
                      <div key={notification.id} className="p-2 border rounded border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>


          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                  {getUserInitials()}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-900 dark:text-white">
                  {getDisplayName()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="text-gray-700 dark:text-gray-300">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
