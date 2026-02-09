/**
 * Admin Auth Guard for API Routes
 * 
 * Validates the admin cookie against ADMIN_TOKEN.
 * Use this at the start of every /api/admin/* route handler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = 'pp_admin';

export interface AdminAuthResult {
  authenticated: boolean;
  error?: NextResponse;
}

/**
 * Check if the request has valid admin authentication.
 * Returns { authenticated: true } if valid, or { authenticated: false, error: NextResponse } if not.
 */
export function requireAdmin(request: NextRequest): AdminAuthResult {
  // Check if ADMIN_TOKEN is configured
  if (!ADMIN_TOKEN) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Admin token not configured on server' },
        { status: 500 }
      ),
    };
  }

  // Check cookie
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);

  // Also check query param for backward compatibility
  const tokenParam = request.nextUrl.searchParams.get('token');

  const isValidCookie = adminCookie?.value === ADMIN_TOKEN;
  const isValidToken = tokenParam === ADMIN_TOKEN;

  if (!isValidCookie && !isValidToken) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { authenticated: true };
}

/**
 * Check if service role key is configured.
 * Returns error response if not.
 */
export function requireServiceRole(): NextResponse | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Admin service key not configured' },
      { status: 500 }
    );
  }
  return null;
}
