import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && 
         !!supabaseAnonKey && 
         supabaseUrl !== 'your_supabase_url' && 
         supabaseAnonKey !== 'your_supabase_anon_key' &&
         supabaseUrl.startsWith('https://');
};

// Create Supabase client only if properly configured
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

if (!isSupabaseConfigured()) {
  console.warn('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file with valid credentials.');
}