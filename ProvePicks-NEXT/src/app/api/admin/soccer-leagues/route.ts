/**
 * GET /api/admin/soccer-leagues - List all soccer leagues with enabled status
 * PATCH /api/admin/soccer-leagues - Toggle enabled status for leagues
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

export interface SoccerLeague {
  id: number;
  sport: string;
  api_provider: string;
  league_id: number;
  name: string;
  type: string | null;
  country: string | null;
  country_code: string | null;
  season: string | null;
  logo_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// GET - List all soccer leagues
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  try {
    // Get search param if any
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const enabledOnly = searchParams.get("enabled") === "true";

    let query = adminClient
      .from("sports_leagues")
      .select("*")
      .eq("sport", "soccer")
      .order("enabled", { ascending: false })
      .order("country", { ascending: true })
      .order("name", { ascending: true });

    if (enabledOnly) {
      query = query.eq("enabled", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[soccer-leagues] Query error:", error);
      return NextResponse.json({
        ok: false,
        error: error.message,
        leagues: [],
      }, { status: 500 });
    }

    // Filter by search if provided
    let leagues = data || [];
    if (search) {
      const searchLower = search.toLowerCase();
      leagues = leagues.filter((l: SoccerLeague) => 
        l.name.toLowerCase().includes(searchLower) ||
        (l.country?.toLowerCase().includes(searchLower))
      );
    }

    // Count enabled
    const enabledCount = leagues.filter((l: SoccerLeague) => l.enabled).length;

    return NextResponse.json({
      ok: true,
      leagues,
      total: leagues.length,
      enabledCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[soccer-leagues] Error:", message);
    return NextResponse.json({
      ok: false,
      error: message,
      leagues: [],
    }, { status: 500 });
  }
}

// PATCH - Update enabled status for one or more leagues
export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  try {
    const body = await request.json();
    
    // Support single update or bulk update
    // { id: number, enabled: boolean } or { ids: number[], enabled: boolean }
    const { id, ids, enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({
        ok: false,
        error: "enabled must be a boolean",
      }, { status: 400 });
    }

    const idsToUpdate = ids ? ids : (id ? [id] : []);
    
    if (idsToUpdate.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "id or ids required",
      }, { status: 400 });
    }

    const { error, count } = await adminClient
      .from("sports_leagues")
      .update({ enabled, updated_at: new Date().toISOString() })
      .in("id", idsToUpdate)
      .eq("sport", "soccer");

    if (error) {
      console.error("[soccer-leagues] Update error:", error);
      return NextResponse.json({
        ok: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      updated: count || idsToUpdate.length,
      message: `Updated ${idsToUpdate.length} league(s) to enabled=${enabled}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[soccer-leagues] Error:", message);
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
