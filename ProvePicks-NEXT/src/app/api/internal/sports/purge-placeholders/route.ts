/**
 * POST /api/internal/sports/purge-placeholders
 * 
 * Admin-only endpoint to delete placeholder games from the database.
 * Removes games with team names like "NFC", "AFC", "TBD", "All-Stars", etc.
 * 
 * Secured by INTERNAL_CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { PLACEHOLDER_TEAM_NAMES } from "@/lib/sports/placeholderTeams";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify secret
  const headerSecret = request.headers.get("x-internal-cron-secret");
  if (!INTERNAL_CRON_SECRET || headerSecret !== INTERNAL_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin client not available" }, { status: 500 });
  }

  try {
    // Get lowercase placeholder names for matching
    const placeholderNames = PLACEHOLDER_TEAM_NAMES.map(name => name.toLowerCase());
    
    // First, count how many games we're about to delete
    const { count: beforeCount } = await adminClient
      .from("sports_games")
      .select("*", { count: "exact", head: true });

    // Find and count placeholder games
    // We need to do separate queries because Supabase doesn't support OR in .in() with different columns
    const { data: homeMatches } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team")
      .filter("home_team", "in", `(${placeholderNames.map(n => `"${n}"`).join(",")})`)
      .limit(1000);

    const { data: awayMatches } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team")
      .filter("away_team", "in", `(${placeholderNames.map(n => `"${n}"`).join(",")})`)
      .limit(1000);

    // Combine and deduplicate by ID
    const matchedIds = new Set<number>();
    const matchedGames: Array<{ id: number; league: string; home_team: string; away_team: string }> = [];
    
    for (const game of [...(homeMatches || []), ...(awayMatches || [])]) {
      if (!matchedIds.has(game.id)) {
        matchedIds.add(game.id);
        matchedGames.push(game);
      }
    }

    if (matchedGames.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No placeholder games found",
        deleted: 0,
        beforeCount,
      });
    }

    // Log what we're deleting
    console.log(`[purge-placeholders] Found ${matchedGames.length} placeholder games to delete:`);
    for (const game of matchedGames.slice(0, 10)) {
      console.log(`  - ${game.league}: ${game.away_team} vs ${game.home_team}`);
    }
    if (matchedGames.length > 10) {
      console.log(`  ... and ${matchedGames.length - 10} more`);
    }

    // Delete the games
    const idsToDelete = Array.from(matchedIds);
    const { error: deleteError } = await adminClient
      .from("sports_games")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("[purge-placeholders] Delete error:", deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message,
      }, { status: 500 });
    }

    // Get after count
    const { count: afterCount } = await adminClient
      .from("sports_games")
      .select("*", { count: "exact", head: true });

    console.log(`[purge-placeholders] Deleted ${matchedGames.length} placeholder games. Before=${beforeCount}, After=${afterCount}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${matchedGames.length} placeholder games`,
      deleted: matchedGames.length,
      beforeCount,
      afterCount,
      samples: matchedGames.slice(0, 10).map(g => `${g.league}: ${g.away_team} vs ${g.home_team}`),
    });
  } catch (err) {
    console.error("[purge-placeholders] Error:", err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET to check status (without deleting)
export async function GET(request: NextRequest) {
  // Verify secret
  const headerSecret = request.headers.get("x-internal-cron-secret");
  if (!INTERNAL_CRON_SECRET || headerSecret !== INTERNAL_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Admin client not available" }, { status: 500 });
  }

  try {
    const placeholderNames = PLACEHOLDER_TEAM_NAMES.map(name => name.toLowerCase());

    // Count placeholder games
    const { data: homeMatches } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team")
      .filter("home_team", "in", `(${placeholderNames.map(n => `"${n}"`).join(",")})`)
      .limit(1000);

    const { data: awayMatches } = await adminClient
      .from("sports_games")
      .select("id, league, home_team, away_team")
      .filter("away_team", "in", `(${placeholderNames.map(n => `"${n}"`).join(",")})`)
      .limit(1000);

    // Combine and deduplicate by ID
    const matchedIds = new Set<number>();
    const matchedGames: Array<{ id: number; league: string; home_team: string; away_team: string }> = [];
    
    for (const game of [...(homeMatches || []), ...(awayMatches || [])]) {
      if (!matchedIds.has(game.id)) {
        matchedIds.add(game.id);
        matchedGames.push(game);
      }
    }

    return NextResponse.json({
      placeholderCount: matchedGames.length,
      samples: matchedGames.slice(0, 20).map(g => `${g.league}: ${g.away_team} vs ${g.home_team}`),
      placeholderNames: PLACEHOLDER_TEAM_NAMES,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
