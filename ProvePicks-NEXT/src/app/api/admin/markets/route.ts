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
    const league = searchParams.get('league');
    const marketStatus = searchParams.get('market_status');
    const gameStatus = searchParams.get('game_status');

    // Build query
    let query = client
      .from('markets')
      .select('*')
      .order('start_time', { ascending: false });

    if (league) {
      query = query.eq('league', league.toUpperCase());
    }
    if (marketStatus) {
      query = query.eq('market_status', marketStatus);
    }
    if (gameStatus) {
      query = query.eq('game_status', gameStatus);
    }

    const { data: markets, error } = await query;

    if (error) {
      console.error('Error fetching markets:', error);
      return NextResponse.json(
        { markets: [], error: error.message },
        { status: 200 }
      );
    }

    // Get counts by status
    const counts = {
      open: (markets || []).filter((m) => m.market_status === 'open').length,
      live: (markets || []).filter((m) => m.game_status === 'live').length,
      settled: (markets || []).filter((m) => m.market_status === 'settled').length,
      total: (markets || []).length,
    };

    return NextResponse.json({ markets: markets || [], counts });
  } catch (error) {
    console.error('Admin markets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}
