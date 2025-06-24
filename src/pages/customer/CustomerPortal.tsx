import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogOut, Package, MessageSquare, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MockInquiry {
  id: string;
  message: string;
  status: string;
  response: string | null;
  created_at: string;
}

interface MockProduct {
  id: string;
  name: string;
  image_url: string | null;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  quantity: number;
}

const CustomerPortal: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        navigate('/customer/login');
        return;
      }
      
      setUserEmail(data.session.user.email);
      
      // Try to get user profile if it exists (for registered users)
      if (data.session.user.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.session.user.id)
          .single();
          
        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          // For OTP users without a profile, extract name from email
          setUserName(`${data.session.user.email?.split('@')[0] || 'Guest'}`);
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [navigate]);
  
  // Mock data for inquiries since sales_inquiries table doesn't exist
  const { data: inquiries = [], isLoading: isLoadingInquiries } = useQuery({
    queryKey: ['customer-inquiries', userEmail],
    queryFn: async (): Promise<MockInquiry[]> => {
      if (!userEmail) return [];
      
      // Return mock data since table doesn't exist
      return [
        {
          id: 'mock-1',
          message: 'Inquiry about product availability',
          status: 'new',
          response: null,
          created_at: new Date().toISOString()
        }
      ];
    },
    enabled: !!userEmail && !isLoading
  });
  
  // Mock data for products since sales_inquiry_items table doesn't exist
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['customer-products', userEmail],
    queryFn: async (): Promise<MockProduct[]> => {
      if (!userEmail) return [];
      
      // Return mock data since table doesn't exist
      return [
        {
          id: 'mock-product-1',
          name: 'Sample Product',
          image_url: null,
          stock_status: 'In Stock',
          quantity: 10
        }
      ];
    },
    enabled: !!inquiries && inquiries.length > 0
  });
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate('/customer/login');
  };
  
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <Badge variant="default" className="bg-blue-500">New</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-500">Pending</Badge>;
      case 'responded':
        return <Badge variant="default" className="bg-green-500">Responded</Badge>;
      case 'closed':
        return <Badge variant="default" className="bg-slate-500">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'Out of Stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'Low Stock':
        return <Badge variant="default" className="bg-amber-500">Low Stock</Badge>;
      case 'In Stock':
      default:
        return <Badge variant="default" className="bg-green-500">In Stock</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-slate-600">Loading portal...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl text-blue-600">Agile WMS</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-600">Customer Portal</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-600">
                  {userName || userEmail || 'Guest'}
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Welcome, {userName || 'Guest'}!
          </h1>
          <p className="text-slate-600">
            View your inquiries and check product availability
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Your Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold mb-4">
                {inquiries?.length || 0}
              </p>
              <Button asChild className="w-full">
                <Link to="#inquiries">View All Inquiries</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold mb-4">
                {products?.length || 0}
              </p>
              <Button asChild className="w-full">
                <Link to="/customer/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                New Inquiry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Submit a new product inquiry
              </p>
              <Button asChild className="w-full">
                <Link to="/customer/inquiry">Submit Inquiry</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-12" id="inquiries">
          <Tabs defaultValue="inquiries">
            <TabsList>
              <TabsTrigger value="inquiries" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Your Inquiries
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                Your Products
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="inquiries" className="mt-4">
              {isLoadingInquiries ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : inquiries && inquiries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Message</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries.map((inquiry) => (
                        <tr key={inquiry.id} className="border-t border-slate-200">
                          <td className="px-4 py-3 text-sm">
                            {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            {inquiry.message || 'No message provided'}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(inquiry.status)}
                          </td>
                          <td className="px-4 py-3">
                            {inquiry.response ? (
                              <div className="text-sm">
                                {inquiry.response}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">Pending response</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-slate-50">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No inquiries found</h3>
                  <p className="text-slate-500 mb-4">
                    You haven't submitted any inquiries yet.
                  </p>
                  <Button asChild>
                    <Link to="/customer/inquiry">Submit Your First Inquiry</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="products" className="mt-4">
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-video bg-slate-100 flex items-center justify-center">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="object-contain h-full w-full"
                          />
                        ) : (
                          <Package className="h-12 w-12 text-slate-300" />
                        )}
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          {getStockStatusBadge(product.stock_status)}
                          <span className="text-sm text-slate-600">
                            Quantity: {product.quantity}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg bg-slate-50">
                  <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">No products found</h3>
                  <p className="text-slate-500 mb-4">
                    You haven't inquired about any products yet.
                  </p>
                  <Button asChild>
                    <Link to="/customer/products">Browse Products</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CustomerPortal;
