/**
 * Admin Supabase Client (Server-Only)
 * 
 * This file creates a Supabase client with service role access for admin operations.
 * MUST ONLY be imported by server-side code (API routes, server components).
 * 
 * NEVER import this file in client components or pages.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient: SupabaseClient | null = null;

/**
 * Check if admin client can be created (service role key exists)
 */
export function isAdminConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceRoleKey);
}

/**
 * Get the admin Supabase client with service role access.
 * Returns null if service role key is not configured.
 */
export function getAdminClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

/**
 * Log a system event (admin-only)
 */
export async function logSystemEvent(params: {
  eventType: string;
  severity?: 'info' | 'warn' | 'error';
  actorUserId?: string;
  actorWallet?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const client = getAdminClient();
  if (!client) return;

  try {
    await client.from('system_events').insert({
      event_type: params.eventType,
      severity: params.severity || 'info',
      actor_user_id: params.actorUserId || null,
      actor_wallet: params.actorWallet || null,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      payload: params.payload || {},
    });
  } catch (error) {
    // Silently fail - don't break admin operations if logging fails
    console.error('Failed to log system event:', error);
  }
}
