import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const redirectAttempts = useRef(0);
  
  // Handle authentication timeout
  useEffect(() => {
    console.log('Index: Setting up auth check timeout...');
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to prevent infinite loading (10 seconds)
    timeoutRef.current = setTimeout(() => {
      console.warn('Index: Auth check timeout reached', { redirectTarget, isLoading });
      
      if (!redirectTarget && !isLoading) {
        // Show timeout message to user
        toast({
          title: "Authentication Check Timeout",
          description: "Taking longer than expected to verify your session. Redirecting to login...",
          variant: "destructive",
        });
        
        setHasTimedOut(true);
        setRedirectTarget('/login');
      }
    }, 10000); // 10 seconds timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [redirectTarget, isLoading]);

  // Handle auth state changes
  useEffect(() => {
    console.log('Index: Auth state changed', { isAuthenticated, user, isLoading });
    
    // Reset redirect attempts on auth state change
    redirectAttempts.current = 0;
    
    // Determine the appropriate redirect target based on authentication status and user role
    const determineRedirectTarget = () => {
      console.log('Index: Determining redirect target', { isAuthenticated, user, isLoading });
      
      if (isAuthenticated && user && !isLoading) {
        // Redirect to appropriate dashboard based on user role
        let targetRoute = '/';
        
        switch (user.role) {
          case 'admin':
            targetRoute = '/admin';
            break;
          case 'warehouse_manager':
            targetRoute = '/manager';
            break;
          case 'field_operator':
            targetRoute = '/operator';
            break;
          case 'sales_operator':
            targetRoute = '/sales';
            break;
          case 'customer':
            targetRoute = '/customer/portal';
            break;
          default:
            console.warn('Unknown user role:', user.role);
            targetRoute = '/';
        }
        
        setRedirectTarget(targetRoute);
        console.log(`User authenticated as ${user.role}, redirecting to: ${targetRoute}`);
      } else if (!isLoading && !isAuthenticated) {
        // If not authenticated and not loading, redirect to login
        setRedirectTarget('/login');
        console.log('User not authenticated, redirecting to login');
      }
    };
    
    // Set a slight delay to ensure auth state has settled
    const timer = setTimeout(determineRedirectTarget, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, isLoading]);
  
  // Handle actual navigation
  useEffect(() => {
    if (!redirectTarget) return;
    
    console.log('Index: Redirect target changed', { redirectTarget, attempts: redirectAttempts.current });
    
    // Prevent infinite redirect loops
    if (redirectAttempts.current >= 3) {
      console.error('Index: Too many redirect attempts');
      toast({
        title: "Navigation Error",
        description: "Unable to redirect to the correct page. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    
    // Increment redirect attempts
    redirectAttempts.current += 1;
    
    // Add a small timeout to ensure smooth transition
    const redirectTimer = setTimeout(() => {
      navigate(redirectTarget, { replace: true });
    }, 100);
    
    return () => clearTimeout(redirectTimer);
  }, [redirectTarget, navigate]);
  
  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-md mx-4">
        <div className="h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
          {hasTimedOut ? 'Taking a bit longer than expected...' : 'Redirecting...'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {redirectTarget 
            ? `Taking you to ${redirectTarget}` 
            : 'Please wait while we verify your session...'}
        </p>
        {hasTimedOut && (
          <button
            onClick={() => {
              // Clear any existing timeouts
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              // Reset attempts counter
              redirectAttempts.current = 0;
              // Force redirect to login
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Index;
