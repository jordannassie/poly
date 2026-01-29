import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireServiceRole } from '@/lib/admin/requireAdmin';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  // Check admin auth
  const auth = requireAdmin(request);
  if (!auth.authenticated) {
    return auth.error;
  }

  // Check service role key
  const serviceError = requireServiceRole();
  if (serviceError) {
    return serviceError;
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Admin service key not configured' },
      { status: 500 }
    );
  }

  try {
    // Query profiles table
    const { data: profiles, error } = await client
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist or other error
      console.error('Error fetching profiles:', error);
      return NextResponse.json(
        { users: [], error: error.message },
        { status: 200 }
      );
    }

    // Get wallet counts per user
    const { data: walletCounts } = await client
      .from('wallet_connections')
      .select('user_id');

    const walletCountMap: Record<string, number> = {};
    walletCounts?.forEach((w) => {
      walletCountMap[w.user_id] = (walletCountMap[w.user_id] || 0) + 1;
    });

    // Enrich profiles with wallet count
    const users = (profiles || []).map((p) => ({
      ...p,
      wallet_count: walletCountMap[p.id] || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
