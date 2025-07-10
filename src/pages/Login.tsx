import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Warehouse, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/PageHeader';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showLastEmail, setShowLastEmail] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading, user, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('Login successful, redirecting user:', {
        isAuthenticated,
        user,
        authLoading
      });
      
      let targetRoute = '/';
      if (user.role === 'admin') targetRoute = '/admin';
      else if (user.role === 'warehouse_manager') targetRoute = '/manager';
      else if (user.role === 'field_operator') targetRoute = '/operator';
      else if (user.role === 'sales_operator') targetRoute = '/sales';
      
      setTimeout(() => {
        navigate(targetRoute, { replace: true });
      }, 100);
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  useEffect(() => {
    if (authError) {
      const errorMessage = authError instanceof Error ? authError.message : String(authError);
      
      // Special handling for inactive user accounts
      if (errorMessage.includes('deactivated by an administrator')) {
        toast.error('Account Inactive', {
          description: 'Your account has been deactivated by an administrator. Please contact support for assistance.',
          duration: 6000
        });
      } else {
        toast.error('Login Failed', {
          description: errorMessage
        });
      }
    }
  }, [authError]);

  useEffect(() => {
    const lastEmail = localStorage.getItem('lastUsedEmail');
    if (lastEmail && !email) {
      setShowLastEmail(true);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Login Failed", {
        description: "Please enter both email and password"
      });
      return;
    }
    
    setIsLoading(true);
    setLoginAttempts(prev => prev + 1);
    
    try {
      await login(email, password);
      localStorage.setItem('lastUsedEmail', email);
    } catch (error) {
      console.error("Login error:", error);
      
      // Error handling is now done in the useEffect that watches authError
      // This prevents duplicate toast notifications
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div 
        className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1.5 }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-primary rounded-full"
            style={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 40 - 20],
              y: [0, Math.random() * 40 - 20],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 10 + Math.random() * 10,
            }}
          />
        ))}
      </motion.div>
      
      <motion.div 
        className="w-full max-w-md mx-auto z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="border-0 shadow-lg overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <motion.div 
              className="flex items-center justify-center mb-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                delay: 0.3 
              }}
            >
              <div className="bg-white p-3 rounded-full shadow-md">
                <Warehouse className="h-12 w-12 text-primary" />
              </div>
            </motion.div>
            <CardTitle className="text-2xl font-bold text-center text-white">Staff Login</CardTitle>
            <p className="text-center text-white">Enter your credentials to access the system</p>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    ref={emailInputRef}
                    required
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all duration-200"
                  />
                </div>
              </motion.div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all duration-200"
                  />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </motion.div>
            </form>

            {loginAttempts > 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <Alert className="mt-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Having trouble logging in? Contact your system administrator.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 text-xs text-gray-500">
            © {new Date().getFullYear()} Agile Warehouse Management
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
