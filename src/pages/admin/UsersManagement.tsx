
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
import { UserPlus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { CreateUserForm } from '@/components/admin/CreateUserForm';
import { EditUserForm } from '@/components/admin/EditUserForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setActiveTab('users-list');
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setActiveTab('edit-user');
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: false })
        .eq('id', selectedUser.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
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
            {selectedUser && (
              <TabsTrigger value="edit-user">Edit User</TabsTrigger>
            )}
          </TabsList>
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
                    <TableHead className="w-[50px]">Actions</TableHead>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditUser(user)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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

        <TabsContent value="edit-user">
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle>Edit User</CardTitle>
              </CardHeader>
              <CardContent>
                <EditUserForm 
                  user={selectedUser}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                    setActiveTab('users-list');
                    setSelectedUser(null);
                  }}
                  onCancel={() => {
                    setActiveTab('users-list');
                    setSelectedUser(null);
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user account. The user will no longer be able to access the system.
              This action can be reversed by editing the user and setting them as active again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
