import { supabase } from './supabase';
import { sendAdminConfirmationEmail } from './supabase-admin';
import { toast } from 'sonner';

/**
 * Test function to verify email sending functionality
 * @param email Email address to send test email to
 */
export const testEmailSending = async (email: string): Promise<void> => {
  try {
    console.log('Testing email sending to:', email);
    
    // First try with regular supabase client
    console.log('Attempting with regular client...');
    const regularResult = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    console.log('Regular client result:', regularResult);
    
    if (regularResult.error) {
      console.warn('Regular client error:', regularResult.error.message);
      
      // Try with admin client
      console.log('Attempting with admin client...');
      const adminResult = await sendAdminConfirmationEmail(
        email,
        `${window.location.origin}/auth/callback`
      );
      
      console.log('Admin client result:', adminResult);
      
      if (adminResult.error) {
        throw new Error(`Admin client error: ${adminResult.error.message || 'Unknown error'}`);
      } else {
        toast.success('Email sent with admin client', {
          description: adminResult.message,
        });
      }
    } else {
      toast.success('Email sent with regular client', {
        description: `Confirmation email sent to ${email}`,
      });
    }
  } catch (error) {
    console.error('Email test failed:', error);
    toast.error('Email test failed', {
      description: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};

/**
 * Check Supabase project settings that might affect email delivery
 */
export const checkEmailSettings = async (): Promise<void> => {
  try {
    console.log('Checking Supabase environment variables:');
    console.log('URL available:', !!import.meta.env.VITE_SUPABASE_URL);
    console.log('Anon key available:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('Service key available:', !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user session to check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Current session:', sessionData?.session ? 'Active' : 'None');
    
    toast.info('Email settings check complete', {
      description: 'Check the browser console for details',
    });
  } catch (error) {
    console.error('Error checking email settings:', error);
  }
};
