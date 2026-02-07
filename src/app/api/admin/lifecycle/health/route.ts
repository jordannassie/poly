/**
 * Lifecycle Health Check API
 * 
 * GET - Returns health status of the game lifecycle system
 * POST - Run health remediation actions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { 
  runHealthChecks, 
  releaseStaleProcessingLocks,
  enqueueOrphanedFinalGames 
} from "@/lib/lifecycle/health";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient();
    const includeItems = request.nextUrl.searchParams.get('items') !== 'false';
    
    const healthResult = await runHealthChecks(adminClient, { includeItems });

    return NextResponse.json(healthResult);
  } catch (error) {
    console.error("[health] Error running health checks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    const adminClient = getAdminClient();
    let result: any = { success: false };

    switch (action) {
      case 'release-stale-locks':
        const releasedCount = await releaseStaleProcessingLocks(adminClient);
        result = { success: true, action, released: releasedCount };
        break;

      case 'enqueue-orphaned':
        const enqueuedCount = await enqueueOrphanedFinalGames(adminClient);
        result = { success: true, action, enqueued: enqueuedCount };
        break;

      case 'fix-all':
        const released = await releaseStaleProcessingLocks(adminClient);
        const enqueued = await enqueueOrphanedFinalGames(adminClient);
        result = { success: true, action, released, enqueued };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[health] Error running remediation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
