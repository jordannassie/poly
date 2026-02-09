import { getSupabaseClient, getCurrentUser } from './supabase';
import type { Profile, ProfileUpdate } from '@/types/database.types';

// Username validation regex: lowercase, 3-20 chars, only [a-z0-9_]
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// Helper to get supabase client with null check
const getClient = () => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }
  return client;
};

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores' };
  }
  
  return { valid: true };
}

/**
 * Get a profile by username (public)
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('is_public', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching profile by username:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Error in getProfileByUsername:', e);
    return null;
  }
}

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile exists, create one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          return null;
        }
        return newProfile;
      }
      console.error('Error fetching my profile:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Error in getMyProfile:', e);
    return null;
  }
}

/**
 * Update the current user's profile
 */
export async function upsertMyProfile(payload: Omit<ProfileUpdate, 'id'>): Promise<{ success: boolean; error?: string; profile?: Profile }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate username if provided
    if (payload.username) {
      const validation = validateUsername(payload.username);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check availability (excluding current user)
      const available = await isUsernameAvailable(payload.username, user.id);
      if (!available) {
        return { success: false, error: 'Username is taken' };
      }
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...payload,
        username: payload.username?.toLowerCase(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'Username is taken' };
      }
      
      return { success: false, error: 'Failed to save profile' };
    }

    return { success: true, profile: data };
  } catch (e) {
    console.error('Error in upsertMyProfile:', e);
    return { success: false, error: 'Failed to save profile' };
  }
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string, myUserId?: string): Promise<boolean> {
  try {
    const normalizedUsername = username.toLowerCase();
    const supabase = getClient();
    
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername);

    // If we have a user ID, exclude them from the check
    if (myUserId) {
      query = query.neq('id', myUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking username availability:', error);
      return false;
    }

    return data.length === 0;
  } catch (e) {
    console.error('Error in isUsernameAvailable:', e);
    return false;
  }
}

/**
 * Get profile by user ID (for internal use)
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching profile by id:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Error in getProfileById:', e);
    return null;
  }
}

/**
 * Get user stats (placeholder - wire to actual tables when available)
 * TODO: Connect to actual picks/trades tables when they exist
 */
export async function getUserStats(userId: string): Promise<{
  totalPicks: number;
  winRate: number;
  totalVolume: string;
  profitLoss: string;
}> {
  // TODO: Replace with actual queries to picks/trades tables
  // For now, return placeholder data
  return {
    totalPicks: 0,
    winRate: 0,
    totalVolume: '$0',
    profitLoss: '$0',
  };
}
