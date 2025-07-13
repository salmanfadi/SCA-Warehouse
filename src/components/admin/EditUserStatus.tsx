import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface EditUserStatusProps {
  userId: string;
  userEmail: string;
  userName: string;
  isActive: boolean;
}

/**
 * Component for editing user active status
 */
export const EditUserStatus: React.FC<EditUserStatusProps> = ({
  userId,
  userEmail,
  userName,
  isActive,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [active, setActive] = useState<boolean>(isActive);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const handleStatusChange = async () => {
    setIsSubmitting(true);
    
    try {
      // Update the user's active status in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ active })
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      toast.success(`User status updated`, {
        description: `${userName} is now ${active ? 'active' : 'inactive'}.`,
      });
      
      // Close the dialog
      setOpen(false);
      
      // Invalidate and refetch users query
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status', {
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
        className="h-8 w-8 p-0"
      >
        <span className="sr-only">Edit user status</span>
        <Edit2 className="h-4 w-4" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Status</DialogTitle>
            <DialogDescription>
              Change the active status for {userName} ({userEmail})
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="user-active-status" className="text-right">
                User is active
              </Label>
              <Switch
                id="user-active-status"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
            
            <p className="text-sm text-gray-500">
              {active 
                ? "Active users can log in and access the system." 
                : "Inactive users cannot log in to the system."}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                  Saving...
                </span>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditUserStatus;
