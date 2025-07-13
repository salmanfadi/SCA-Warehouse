import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
}

interface EditUserFormProps {
  user: UserProfile;
  onSuccess: () => void;
  onCancel: () => void;
}

const formSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'warehouse_manager', 'field_operator', 'sales_operator']),
  active: z.boolean(),
});

export const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  onSuccess,
  onCancel,
}) => {
  const { user: currentUser } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: user.full_name,
      role: user.role as any,
      active: user.active,
    },
  });

  // Verify admin session on component mount
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Admin access required');
      onCancel();
    }
  }, [currentUser, onCancel]);

  const isMainAdmin = user.email === 'admin@gmail.com';
  const isSelf = currentUser && user.id === currentUser.id;
  const canEditRole = currentUser && currentUser.role === 'admin' && !isMainAdmin && !isSelf;

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    if (user.role !== values.role) {
      setPendingValues(values);
      setShowConfirm(true);
    } else {
      onSubmit(values);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }
      // Prevent main admin demotion
      if (isMainAdmin && values.role !== 'admin') {
        toast.error('Cannot change the main admin role.');
        return;
      }
      // Prevent self-demotion
      if (isSelf && values.role !== user.role) {
        toast.error('You cannot change your own role.');
        return;
      }
      // First update the user's role using the Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: user.id,
            role: values.role,
          }),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        console.error('Edge Function response:', responseData);
        throw new Error(`Failed to update role: ${responseData.error}`);
      }
      // Then update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          role: values.role,
          active: values.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      toast.success('User updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-1">
          <FormLabel>Email (cannot be changed)</FormLabel>
          <Input value={user.email} disabled />
        </div>
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEditRole}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                  <SelectItem value="field_operator">Field Operator</SelectItem>
                  <SelectItem value="sales_operator">Sales Operator</SelectItem>
                </SelectContent>
              </Select>
              {isMainAdmin && (
                <div className="text-xs text-muted-foreground mt-1">Main admin role cannot be changed.</div>
              )}
              {isSelf && (
                <div className="text-xs text-muted-foreground mt-1">You cannot change your own role.</div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Disable to prevent user from accessing the system
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
      {/* Confirmation Dialog for Role Change */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="mb-4 font-semibold">Confirm Role Change</div>
            <div className="mb-4 text-sm">Are you sure you want to change this user's role from <b>{user.role.replace('_', ' ')}</b> to <b>{pendingValues?.role.replace('_', ' ')}</b>?</div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setShowConfirm(false); setPendingValues(null); }}>Cancel</Button>
              <Button onClick={() => { setShowConfirm(false); if (pendingValues) onSubmit(pendingValues); }}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </Form>
  );
}; 