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
    // Parse query params
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    // Build query
    let query = client
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: payouts, error } = await query;

    if (error) {
      console.error('Error fetching payouts:', error);
      return NextResponse.json(
        { payouts: [], error: error.message },
        { status: 200 }
      );
    }

    // Get usernames for payout recipients
    const userIds = [...new Set((payouts || []).map((p) => p.user_id))];
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

    // Enrich payouts with username
    const enrichedPayouts = (payouts || []).map((p) => ({
      ...p,
      username: usernameMap[p.user_id] || 'unknown',
    }));

    // Get counts by status
    const allPayouts = payouts || [];
    const counts = {
      queued: allPayouts.filter((p) => p.status === 'queued').length,
      sent: allPayouts.filter((p) => p.status === 'sent').length,
      failed: allPayouts.filter((p) => p.status === 'failed').length,
      total: allPayouts.length,
    };

    return NextResponse.json({ payouts: enrichedPayouts, counts });
  } catch (error) {
    console.error('Admin payouts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
