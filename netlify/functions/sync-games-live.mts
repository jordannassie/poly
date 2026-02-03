/**
 * Netlify Scheduled Function: Live Games Sync
 * 
 * Runs every 2 minutes to update live game scores.
 * 
 * Schedule: */2 * * * * (every 2 minutes)
 */

import type { Config, Context } from "@netlify/functions";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

export default async (request: Request, context: Context) => {
  console.log("[sync-games-live] Starting scheduled live sync");
  
  if (!INTERNAL_CRON_SECRET) {
    console.error("[sync-games-live] INTERNAL_CRON_SECRET not configured");
    return new Response("INTERNAL_CRON_SECRET not configured", { status: 500 });
  }

  try {
    const response = await fetch(`${SITE_URL}/api/internal/sports/sync-games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-cron-secret": INTERNAL_CRON_SECRET,
      },
      body: JSON.stringify({
        mode: "live",
      }),
    });

    const data = await response.json();
    
    console.log("[sync-games-live] Sync complete:", {
      success: data.success,
      totalGames: data.totalGames,
      totalUpdated: data.totalUpdated,
      duration: data.duration,
    });

    return new Response(JSON.stringify(data), { 
      status: response.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[sync-games-live] Error:", error);
    return new Response("Error", { status: 500 });
  }
};

export const config: Config = {
  schedule: "*/2 * * * *",
};
