import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Auth callback page for handling email confirmations and password resets
 */
export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Processing your request...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the type of auth action from the URL parameters
        const type = searchParams.get('type');
        
        if (type === 'recovery') {
          // Handle password reset
          setMessage('Redirecting to password reset page...');
          setTimeout(() => {
            navigate('/auth/reset-password', { 
              state: { 
                access_token: searchParams.get('access_token'),
                refresh_token: searchParams.get('refresh_token')
              }
            });
          }, 1500);
          return;
        }
        
        // Handle email confirmation
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error processing authentication:', error);
          setStatus('error');
          setMessage(`Authentication error: ${error.message}`);
          return;
        }
        
        setStatus('success');
        setMessage('Authentication successful! Redirecting to dashboard...');
        
        // Redirect to appropriate dashboard based on user role
        setTimeout(() => {
          navigate('/');
        }, 1500);
        
      } catch (error) {
        console.error('Error in auth callback:', error);
        setStatus('error');
        setMessage(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'processing' && 'Processing Authentication'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">{message}</p>
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                If you're having trouble, you can try again or contact support.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Return to Login
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex justify-center">
              <Button onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
