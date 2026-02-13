/**
 * Job Lock Module
 * 
 * Prevents concurrent execution of cron jobs using database locks
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type JobName = 'discover' | 'sync' | 'finalize' | 'settle' | 'backfill';

export interface JobLock {
  job_name: string;
  locked_at: string;
  expires_at: string;
  locked_by: string | null;
  meta: Record<string, any>;
}

export interface LockResult {
  acquired: boolean;
  existingLock?: JobLock;
  failOpen?: boolean;
}

// Worker ID for this instance
const WORKER_ID = process.env.ADMIN_WORKER_ID || `worker-${process.pid}-${Date.now()}`;

/**
 * Attempt to acquire a job lock
 * Returns true if lock acquired, false if already locked by another process
 */
export async function acquireJobLock(
  adminClient: SupabaseClient,
  jobName: JobName,
  options?: { ttlMinutes?: number }
): Promise<LockResult> {
  const ttlMinutes = options?.ttlMinutes ?? 5;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  const formatError = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === "string" ? error : "Unknown error";
  };

  const failOpen = (error: unknown): LockResult => {
    const message = formatError(error);
    console.warn(`[job-lock] WARN fail-open: ${message}`);
    return { acquired: true, failOpen: true };
  };

  try {
    await adminClient
      .from('job_locks')
      .delete()
      .eq('job_name', jobName)
      .lt('expires_at', now.toISOString());
  } catch (error) {
    if ((error instanceof Error && /Could not find the table/i.test(error.message)) || /schema cache/i.test(formatError(error))) {
      return failOpen(error);
    }
    return failOpen(error);
  }

  let existingLock: JobLock | null = null;
  try {
    const { data } = await adminClient
      .from('job_locks')
      .select('*')
      .eq('job_name', jobName)
      .single();
    existingLock = data || null;
  } catch (error) {
    return failOpen(error);
  }

  if (existingLock && new Date(existingLock.expires_at) > now) {
    console.log(`[job-lock] INFO lock held, skipping: key=${jobName} locked_until=${existingLock.expires_at} owner=${existingLock.locked_by}`);
    return { acquired: false, existingLock };
  }

  try {
    const { error } = await adminClient
      .from('job_locks')
      .upsert({
        job_name: jobName,
        locked_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        locked_by: WORKER_ID,
        meta: { started_at: now.toISOString() },
      }, { onConflict: 'job_name' });
    if (error) throw error;
  } catch (error) {
    return failOpen(error);
  }

  try {
    const { data: verifyLock } = await adminClient
      .from('job_locks')
      .select('*')
      .eq('job_name', jobName)
      .single();

    if (verifyLock?.locked_by === WORKER_ID) {
      console.log(`[job-lock] INFO lock acquired: key=${jobName} owner=${WORKER_ID} locked_until=${expiresAt.toISOString()}`);
      return { acquired: true };
    }
    return { acquired: false, existingLock: verifyLock };
  } catch (error) {
    return failOpen(error);
  }
}

/**
 * Release a job lock
 */
export async function releaseJobLock(
  adminClient: SupabaseClient,
  jobName: JobName
): Promise<boolean> {
  const { error } = await adminClient
    .from('job_locks')
    .delete()
    .eq('job_name', jobName);

  if (error) {
    console.error(`[job-lock] Failed to release lock for ${jobName}:`, error.message);
    return false;
  }

  console.log(`[job-lock] Released lock for ${jobName}`);
  return true;
}

/**
 * Extend a job lock's expiration
 */
export async function extendJobLock(
  adminClient: SupabaseClient,
  jobName: JobName,
  additionalMinutes: number = 5
): Promise<boolean> {
  const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

  const { error } = await adminClient
    .from('job_locks')
    .update({
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('job_name', jobName)
    .eq('locked_by', WORKER_ID);

  if (error) {
    console.error(`[job-lock] Failed to extend lock for ${jobName}:`, error.message);
    return false;
  }

  return true;
}

/**
 * Get all current job locks (for monitoring)
 */
export async function getJobLocks(
  adminClient: SupabaseClient
): Promise<JobLock[]> {
  const { data, error } = await adminClient
    .from('job_locks')
    .select('*')
    .order('locked_at', { ascending: false });

  if (error) {
    console.error('[job-lock] Failed to get locks:', error.message);
    return [];
  }

  return (data || []) as JobLock[];
}

/**
 * Force release a specific lock (admin only)
 */
export async function forceReleaseJobLock(
  adminClient: SupabaseClient,
  jobName: string
): Promise<boolean> {
  const { error } = await adminClient
    .from('job_locks')
    .delete()
    .eq('job_name', jobName);

  if (error) {
    console.error(`[job-lock] Failed to force release lock for ${jobName}:`, error.message);
    return false;
  }

  console.log(`[job-lock] Force released lock for ${jobName}`);
  return true;
}

/**
 * Clean up all expired locks
 */
export async function cleanupExpiredLocks(
  adminClient: SupabaseClient
): Promise<number> {
  const { data, error } = await adminClient
    .from('job_locks')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('job_name');

  if (error) {
    console.error('[job-lock] Failed to cleanup expired locks:', error.message);
    return 0;
  }

  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[job-lock] Cleaned up ${count} expired locks`);
  }

  return count;
}

/**
 * Higher-order function to wrap a job with locking
 */
export function withJobLock<T>(
  adminClient: SupabaseClient,
  jobName: JobName,
  jobFn: () => Promise<T>,
  options?: { ttlMinutes?: number }
): () => Promise<{ skipped: boolean; result?: T; error?: string }> {
  return async () => {
    const lockResult = await acquireJobLock(adminClient, jobName, options);

    if (!lockResult.acquired) {
      return {
        skipped: true,
        error: `Job ${jobName} is already running (locked by ${lockResult.existingLock?.locked_by})`,
      };
    }

    try {
      const result = await jobFn();
      return { skipped: false, result };
    } finally {
      await releaseJobLock(adminClient, jobName);
    }
  };
}
