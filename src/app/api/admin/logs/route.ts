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
    const severity = searchParams.get('severity');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query
    let query = client
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json(
        { logs: [], error: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
