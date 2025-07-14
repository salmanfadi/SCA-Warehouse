import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Create a Supabase client with the service role key for admin operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are missing
let supabaseAdmin: any;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase URL or service role key in environment variables');
  
  // Create a mock admin client
  supabaseAdmin = {
    auth: {
      admin: {
        createUser: async () => ({ 
          data: { user: null }, 
          error: { message: 'Mock: No admin credentials configured' } 
        }),
        updateUserById: async () => ({ 
          data: { user: null }, 
          error: { message: 'Mock: No admin credentials configured' } 
        })
      }
    },
    from: () => ({
      select: () => ({ 
        eq: () => ({ 
          single: async () => ({ 
            data: null, 
            error: { message: 'Mock: No database connection' } 
          }) 
        }) 
      }),
      insert: () => ({ 
        select: () => ({ 
          single: async () => ({ 
            data: null, 
            error: { message: 'Mock: No database connection' } 
          }) 
        }) 
      }),
      update: () => ({ 
        eq: () => ({ 
          select: async () => ({ 
            data: null, 
            error: { message: 'Mock: No database connection' } 
          }) 
        }) 
      }),
    }),
  } as any;
} else {
  supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export { supabaseAdmin };

/**
 * Get the current auth settings
 * @returns The current auth settings
 */
export const getAuthSettings = async () => {
  try {
    // Use the available admin API methods
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error getting auth settings:', error);
    return { data: null, error };
  }
};

/**
 * Send a confirmation email to a user using admin privileges
 * @param email User's email address
 * @param redirectTo URL to redirect to after confirmation
 * @returns Result of the operation
 */
export const sendAdminConfirmationEmail = async (
  email: string, 
  redirectTo: string = `${window.location.origin}/auth/callback`
) => {
  try {
    // First, check if the user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      throw userError;
    }
    
    // Use type assertion to access email property
    const user = userData.users.find(u => (u as any).email === email);
    
    // If user doesn't exist, create a new invitation
    if (!user) {
      // Use the regular auth API to send an invitation
      const { data, error } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo,
        }
      });
      
      if (error) {
        throw error;
      }
      
      return { 
        data, 
        error: null,
        message: `Invitation email sent to ${email}` 
      };
    }
    
    // For existing users, use the admin API to send a magic link
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });
    
    if (error) {
      throw error;
    }
    
    return { 
      data, 
      error: null,
      message: `Confirmation email sent to ${email} with admin privileges` 
    };
  } catch (error) {
    console.error('Error sending admin confirmation email:', error);
    return { 
      data: null, 
      error,
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

/**
 * Update a user's email in the profiles table
 * @param userId User ID
 * @param oldEmail Current email address
 * @param newEmail New email address
 * @returns Result of the operation
 */
export const updateUserEmail = async (
  userId: string,
  oldEmail: string | null,
  newEmail: string
) => {
  try {
    // Use the regular supabase client to update the profiles table
    // This avoids permission issues with the admin client
    const { supabase } = await import('@/lib/supabase');
    
    // Update the email in the profiles table
    // Use type assertion to handle the email field
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail } as any)
      .eq('id', userId);
      
    if (profileError) {
      throw profileError;
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating user email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};
