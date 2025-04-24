import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // Import generated types

// --- Supabase Configuration ---
// Read keys from environment variables (ensure they are prefixed with NEXT_PUBLIC_ for client-side access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is missing. Make sure NEXT_PUBLIC_SUPABASE_URL is set in your environment variables.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your environment variables.");
}

// Initialize Supabase Client
// The client automatically handles auth state changes when using Supabase Auth methods.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, { // Use generated types
  auth: {
    // Enable automatic token refreshing
    autoRefreshToken: true,
    // Persist session across browser tabs/windows
    persistSession: true,
    // Detect session automatically from URL fragment (useful for OAuth redirects)
    detectSessionInUrl: true,
  },
});
