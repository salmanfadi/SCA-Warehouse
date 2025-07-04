import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import { toast } from "@/hooks/use-toast";

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading, session } = useAuth();
  const location = useLocation();

  // Add debug logging
  useEffect(() => {
    console.log('RequireAuth state:', {
      isLoading,
      isAuthenticated,
      user,
      session,
      currentPath: location.pathname,
      allowedRoles
    });
  }, [isLoading, isAuthenticated, user, session, location, allowedRoles]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle authentication check
  if (!isLoading && (!isAuthenticated || !user)) {
    console.log('Redirecting to login from:', location.pathname);
    
    // Show toast notification for unauthenticated access attempt
    toast({
      title: "Authentication Required",
      description: "Please log in to access this page.",
      variant: "destructive",
    });
    
    // Save the attempted path for redirect after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Handle role-based access check
  if (!isLoading && allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('Unauthorized access attempt:', {
      userRole: user.role,
      allowedRoles,
      path: location.pathname
    });

    // Show toast notification for unauthorized access attempt
    toast({
      title: "Access Denied",
      description: "You don't have permission to access this page.",
      variant: "destructive",
    });

    // Determine appropriate redirect based on user role
    let redirectPath = '/unauthorized';
    
    // If user has a valid role but wrong permissions, redirect to their dashboard
    if (user.role === 'admin') redirectPath = '/admin';
    else if (user.role === 'warehouse_manager') redirectPath = '/manager';
    else if (user.role === 'field_operator') redirectPath = '/operator';
    else if (user.role === 'sales_operator') redirectPath = '/sales';
    else if (user.role === 'customer') redirectPath = '/customer/portal';

    return <Navigate to={redirectPath} replace />;
  }

  // Session expired check
  if (!isLoading && !session) {
    console.log('Session expired:', location.pathname);
    
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    });
    
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
