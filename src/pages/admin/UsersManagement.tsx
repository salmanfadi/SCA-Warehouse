
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { executeQuery } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus } from 'lucide-react';
import { CreateUserForm } from '@/components/admin/CreateUserForm';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  avatar_url?: string;
}

const UsersManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('users-list');
  const queryClient = useQueryClient();

  // Fetch users from profiles table using available columns
  const { data: users, isLoading, error } = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await executeQuery('profiles', async (supabase) => {
        return await supabase
          .from('profiles')
          .select('id, full_name, email, role, active, created_at, avatar_url')
          .order('created_at', { ascending: false });
      });

      if (error) throw error;
      return data || [];
    },
  });

  const handleUserCreated = () => {
    // Invalidate and refetch users query to show the newly created user
    queryClient.invalidateQueries({ queryKey: ['users'] });
    // Switch back to users list tab
    setActiveTab('users-list');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Users Management" 
        description="View and manage system users"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="users-list">Users List</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
          </TabsList>
          
          {activeTab === 'users-list' && (
            <Button 
              onClick={() => setActiveTab('create-user')}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </Button>
          )}
        </div>
        
        <TabsContent value="users-list">
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role?.replace('_', ' ') || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create-user">
          <Card>
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateUserForm onSuccess={handleUserCreated} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UsersManagement;
