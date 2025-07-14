import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateUserEmail } from '@/lib/supabase-admin';
import { testEmailSending, checkEmailSettings } from '@/lib/email-test';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Settings } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResendConfirmationEmailProps {
  userId: string;
  userEmail: string | null;
  userName: string;
}

/**
 * Component for resending confirmation email to a user
 */
export const ResendConfirmationEmail: React.FC<ResendConfirmationEmailProps> = ({
  userId,
  userEmail,
  userName,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(userEmail || '');
  const [emailChanged, setEmailChanged] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Reset email state when the dialog opens/closes or props change
  React.useEffect(() => {
    if (open) {
      setEmail(userEmail || '');
      setEmailChanged(false);
    }
  }, [open, userEmail]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailChanged(e.target.value !== userEmail);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast.error('Email is required', {
        description: 'Please enter a valid email address',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // If email has changed, update it in the profiles table
      if (emailChanged) {
        const { success, error: updateError } = await updateUserEmail(
          userId,
          userEmail,
          email
        );

        if (!success) {
          throw new Error(`Failed to update email: ${updateError}`);
        }

        // Invalidate users query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['users'] });
        
        toast.success('Email updated', {
          description: `User's email has been updated to ${email}`,
        });
      }

      // Use our test utility to try different methods of sending the email
      await testEmailSending(email);
      
      setOpen(false);
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      toast.error('Failed to resend confirmation email', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 ml-2"
        title="Resend confirmation email"
      >
        <span className="sr-only">Resend confirmation email</span>
        <Mail className="h-4 w-4" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle>Resend Confirmation Email</DialogTitle>
              <DialogDescription>
                Send a new confirmation email to {userName || 'User'}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleResendConfirmation();
          }} className="px-6 pb-6 space-y-4">
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-address">Email address</Label>
                <Input 
                  id="email-address" 
                  type="email" 
                  value={email} 
                  onChange={handleEmailChange} 
                  placeholder="user@example.com"
                  className={emailChanged ? "border-amber-500" : ""}
                  required
                />
                {emailChanged && (
                  <p className="text-xs text-amber-600">
                    The email address has been changed. This will update the user's email in the database.
                  </p>
                )}
              </div>
              
              <p className="text-sm text-gray-500">
                This will send a confirmation email to the address above. 
                The user will need to click the link in the email to confirm their account.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => checkEmailSettings()}
                type="button"
              >
                <Settings className="mr-2 h-4 w-4" />
                Check Email Settings
              </Button>
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)} 
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Confirmation Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResendConfirmationEmail;
