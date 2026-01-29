import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Browser client for client-side operations
// Create a lazy-initialized client to handle missing env vars during build
let _supabase: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured');
    return null;
  }
  if (!_supabase) {
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
};

// Legacy export for compatibility - use getSupabaseClient() for null safety
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey) 
  : null as unknown as SupabaseClient<Database>;

// Helper to get the current user
export async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data: { user }, error } = await client.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}

// Auth state change listener
export function onAuthStateChange(callback: (user: any) => void) {
  const client = getSupabaseClient();
  if (!client) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  return client.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}

// Sign out helper
export async function signOut() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }
  const { error } = await client.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
