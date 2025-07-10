import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  useEffect(() => {
    // Log unauthorized access attempt
    console.warn('Unauthorized access attempt:', {
      path: location.pathname,
      user: user?.role,
      timestamp: new Date().toISOString()
    });

    // Show toast notification
    toast.error("You don't have permission to access this page. Redirecting to your dashboard...");

    // Auto-redirect admins to their dashboard after a short delay
    if (user?.role === 'admin') {
      const timer = setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, location.pathname]);
  
  // Determine correct dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user) return '/';
    
    const roleRoutes = {
      admin: '/admin',
      warehouse_manager: '/manager',
      field_operator: '/operator',
      sales_operator: '/sales',
      customer: '/customer/portal'
    };

    return roleRoutes[user.role] || '/';
  };

  // Handle back navigation
  const handleGoBack = () => {
    // Check if we can go back in history
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      // If no history, go to appropriate dashboard
      navigate(getDashboardRoute(), { replace: true });
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-full dark:bg-red-900/20 mb-4">
            <Shield className="h-12 w-12 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          {user && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Current role: {user.role}
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button 
            variant="outline"
            className="w-full"
            onClick={handleGoBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            variant="default" 
            className="w-full"
            onClick={() => navigate(getDashboardRoute(), { replace: true })}
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>

        {/* Show additional help text for non-admin users */}
        {user && user.role !== 'admin' && (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>If you believe you should have access to this page, please contact your administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unauthorized;
