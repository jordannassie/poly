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
    // Query wallet_connections with profile info
    const { data: wallets, error } = await client
      .from('wallet_connections')
      .select(`
        id,
        user_id,
        chain,
        wallet_address,
        verified,
        primary,
        created_at,
        last_seen_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      return NextResponse.json(
        { wallets: [], error: error.message },
        { status: 200 }
      );
    }

    // Get usernames for wallet owners
    const userIds = [...new Set((wallets || []).map((w) => w.user_id))];
    let usernameMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      profiles?.forEach((p) => {
        usernameMap[p.id] = p.username || 'unknown';
      });
    }

    // Enrich wallets with username
    const enrichedWallets = (wallets || []).map((w) => ({
      ...w,
      username: usernameMap[w.user_id] || 'unknown',
    }));

    return NextResponse.json({ wallets: enrichedWallets });
  } catch (error) {
    console.error('Admin wallets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}
