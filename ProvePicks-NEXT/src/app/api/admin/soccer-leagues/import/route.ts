/**
 * POST /api/admin/soccer-leagues/import
 * 
 * Import all soccer leagues from API-Sports into sports_leagues table.
 * This fetches ALL available leagues, not just the pre-selected ones.
 * Admin can then enable/disable specific leagues.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { apiSportsFetchSafe, buildApiSportsUrl } from "@/lib/apiSports/client";
import { getLeagueConfig } from "@/lib/apiSports/leagueConfig";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY || "";

function isAuthorized(request: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  
  const cookieStore = cookies();
  const adminCookie = cookieStore.get(COOKIE_NAME);
  if (adminCookie?.value === ADMIN_TOKEN) return true;
  
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken === ADMIN_TOKEN) return true;
  
  return false;
}

// API-Sports soccer leagues response structure
interface ApiSportsLeagueResponse {
  response: Array<{
    league: {
      id: number;
      name: string;
      type: string;
      logo: string;
    };
    country: {
      name: string;
      code: string | null;
      flag: string | null;
    };
    seasons: Array<{
      year: number;
      current: boolean;
    }>;
  }>;
}

// Top-tier league IDs that should be enabled by default
const TOP_TIER_LEAGUE_IDS = new Set([
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  135,  // Serie A (Italy)
  78,   // Bundesliga (Germany)
  61,   // Ligue 1 (France)
  253,  // MLS (USA)
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Conference League
  262,  // Liga MX (Mexico)
  71,   // Primeira Liga (Brazil)
  128,  // Argentine Liga Profesional
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  144,  // Jupiler Pro League (Belgium)
]);

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!API_SPORTS_KEY) {
    console.error("[soccer-leagues/import] Missing APISPORTS_KEY env var");
    return NextResponse.json({
      ok: false,
      error: "Missing APISPORTS_KEY env var",
    }, { status: 500 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY not configured",
    }, { status: 500 });
  }

  try {
    // Parse options from request body
    const body = await request.json().catch(() => ({}));
    const { topTierOnly = false, currentSeasonOnly = true } = body;

    const config = getLeagueConfig("SOCCER");
    const url = buildApiSportsUrl(config.baseUrl, "/leagues");
    
    console.log(`[soccer-leagues/import] Fetching leagues from: ${url}`);

    const result = await apiSportsFetchSafe<ApiSportsLeagueResponse>(url, API_SPORTS_KEY);

    if (!result.ok) {
      console.error("[soccer-leagues/import] API error:", result.message);
      return NextResponse.json({
        ok: false,
        error: `API fetch failed: ${result.message}`,
      }, { status: 500 });
    }

    const allLeagues = result.data.response || [];
    console.log(`[soccer-leagues/import] Fetched ${allLeagues.length} leagues from API`);

    // Process leagues
    const records: Array<{
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
    }> = [];

    for (const item of allLeagues) {
      const league = item.league;
      const country = item.country;
      const seasons = item.seasons || [];
      
      // Find current season
      const currentSeason = seasons.find(s => s.current);
      const season = currentSeason 
        ? String(currentSeason.year) 
        : (seasons.length > 0 ? String(Math.max(...seasons.map(s => s.year))) : null);

      // Skip if currentSeasonOnly and no current season
      if (currentSeasonOnly && !currentSeason) {
        continue;
      }

      // Skip if topTierOnly and not in our list
      if (topTierOnly && !TOP_TIER_LEAGUE_IDS.has(league.id)) {
        continue;
      }

      records.push({
        sport: "soccer",
        api_provider: "api-sports",
        league_id: league.id,
        name: league.name,
        type: league.type || null,
        country: country.name || null,
        country_code: country.code || null,
        season,
        logo_url: league.logo || null,
        // Enable top-tier leagues by default
        enabled: TOP_TIER_LEAGUE_IDS.has(league.id),
      });
    }

    console.log(`[soccer-leagues/import] Processing ${records.length} leagues`);

    if (records.length === 0) {
      return NextResponse.json({
        ok: true,
        imported: 0,
        message: "No leagues to import",
      });
    }

    // Get existing league IDs to track new vs updated
    const leagueIds = records.map(r => r.league_id);
    const { data: existing } = await adminClient
      .from("sports_leagues")
      .select("league_id, enabled")
      .eq("sport", "soccer")
      .in("league_id", leagueIds);

    const existingMap = new Map(
      (existing || []).map(l => [l.league_id, l.enabled])
    );

    // Preserve existing enabled status for leagues that were already imported
    const recordsToUpsert = records.map(r => {
      if (existingMap.has(r.league_id)) {
        // Keep existing enabled status
        return { ...r, enabled: existingMap.get(r.league_id) as boolean };
      }
      return r;
    });

    // Upsert in batches to avoid timeout
    const BATCH_SIZE = 100;
    let inserted = 0;
    let updated = 0;
    let errors: string[] = [];

    for (let i = 0; i < recordsToUpsert.length; i += BATCH_SIZE) {
      const batch = recordsToUpsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await adminClient
        .from("sports_leagues")
        .upsert(batch, {
          onConflict: "api_provider,sport,league_id,season",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`[soccer-leagues/import] Batch ${i / BATCH_SIZE} error:`, error);
        errors.push(error.message);
      } else {
        // Count new vs existing
        for (const rec of batch) {
          if (existingMap.has(rec.league_id)) {
            updated++;
          } else {
            inserted++;
          }
        }
      }
    }

    const enabledCount = recordsToUpsert.filter(r => r.enabled).length;

    return NextResponse.json({
      ok: errors.length === 0,
      total: records.length,
      inserted,
      updated,
      enabledCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${records.length} leagues (${inserted} new, ${updated} updated, ${enabledCount} enabled)`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[soccer-leagues/import] Error:", message);
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}
