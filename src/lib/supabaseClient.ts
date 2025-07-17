import { createClient } from '@supabase/supabase-js';

// These values should be set in your environment variables prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to handle file uploads
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw error;
  }

  return data;
};

// Helper function to get public URL for a file
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

// Helper function to handle errors
export const handleError = (error: unknown, defaultMessage = 'An error occurred') => {
  if (error instanceof Error) {
    console.error(error.message);
    throw new Error(error.message);
  }
  console.error(defaultMessage);
  throw new Error(defaultMessage);
};
