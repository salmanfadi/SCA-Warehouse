import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { testEmailSending } from '@/lib/email-test';
import { UserRole } from '@/types/auth';
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
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['admin', 'warehouse_manager', 'field_operator', 'sales_operator', 'customer']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserFormProps {
  onSuccess?: () => void;
}

interface ResendConfirmationProps {
  email: string;
  onResendSuccess?: () => void;
  onResendError?: (error: Error) => void;
}

/**
 * Function to resend confirmation email to a user
 */
export const resendConfirmationEmail = async ({ email, onResendSuccess, onResendError }: ResendConfirmationProps): Promise<void> => {
  try {
    // Use our test utility to try different methods of sending the email
    await testEmailSending(email);

    if (onResendSuccess) {
      onResendSuccess();
    }
  } catch (error) {
    console.error('Error resending confirmation email:', error);
    toast.error('Failed to resend confirmation email', {
      description: error instanceof Error ? error.message : 'An unknown error occurred',
    });

    if (onResendError && error instanceof Error) {
      onResendError(error);
    }
  }
};

export const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastCreatedEmail, setLastCreatedEmail] = useState<string>('');

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      fullName: '',
      role: 'field_operator',
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    setIsSubmitting(true);
    setFormStatus('idle');
    setErrorMessage('');

    try {
      // Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-10) + 
                         Math.random().toString(36).toUpperCase().slice(-2) + 
                         '@' + Math.floor(Math.random() * 100);

      // Create the user with email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: values.fullName,
          role: values.role,
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Send password reset email to let user set their own password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      );

      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        // Don't throw error here, user is still created
      }

      // Store the email for potential resending
      setLastCreatedEmail(values.email);

      setFormStatus('success');
      toast.success('User created successfully', {
        description: 'A password reset email has been sent to the user.',
      });

      // Reset form
      form.reset();
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setFormStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error('Failed to create user', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Create New User</h3>
        <p className="text-sm text-gray-500">
          Create a new user account. The user will receive an email to set their password.
        </p>
      </div>

      {formStatus === 'success' && (
        <div className="bg-green-50 p-4 rounded-md flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800">User created successfully</h4>
            <p className="text-sm text-green-700">
              A password reset email has been sent to the user's email address.
            </p>
          </div>
        </div>
      )}

      {formStatus === 'error' && (
        <div className="bg-red-50 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800">Failed to create user</h4>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="user@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateUserForm;
