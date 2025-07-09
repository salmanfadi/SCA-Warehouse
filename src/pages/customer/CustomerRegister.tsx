import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  sku?: string | null;
  specifications?: string | null;
  is_active?: boolean;
  in_stock_quantity?: number;
  is_out_of_stock?: boolean;
  category?: string | null;
}

const CustomerRegister: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsRegistering(true);
    
    try {
      // Add delay between requests
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'customer',
          },
          emailRedirectTo: `${window.location.origin}/customer/login`
        }
      });
      
      if (error) {
        if (error.message.includes('rate limit') || error.status === 429) {
          throw new Error('Too many signup attempts. Please wait a few minutes before trying again.');
        }
        throw error;
      }
      
      if (data?.user) {
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your account.",
        });
        
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
      
    } catch (error: unknown) {
      console.error('Registration error:', error);
      let message = 'An error occurred during registration.';
      if (isErrorWithMessage(error)) {
        message = error.message;
      }
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <div className="mb-8 w-full max-w-md mx-auto">
        <PageHeader
          title="Create Account"
          description="Register to access your customer portal"
        />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="text-sm text-blue-600">
              Password must be at least 8 characters and include uppercase, number, and special character.
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link to="/customer/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerRegister;
