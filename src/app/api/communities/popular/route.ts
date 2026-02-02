/**
 * GET /api/communities/popular
 * 
 * Returns popular team communities for sidebar display.
 */

import { NextResponse } from "next/server";
import { getPopularTeams } from "@/lib/teams/getPopularTeams";

export async function GET() {
  try {
    const teams = await getPopularTeams(6);

    return NextResponse.json({
      teams,
      count: teams.length,
    });
  } catch (error) {
    console.error("[/api/communities/popular] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch popular teams", teams: [] },
      { status: 500 }
    );
  }
}
