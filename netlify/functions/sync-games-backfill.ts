/**
 * Netlify Scheduled Function: Backfill Games Sync
 * 
 * Runs once daily to ensure season games are complete.
 * Will skip if backfill is already complete for the season.
 * 
 * Schedule: "0 4 * * *" (4 AM UTC daily)
 * 
 * To set up in Netlify:
 * 1. Go to Netlify Dashboard > Site > Functions
 * 2. Find "sync-games-backfill"
 * 3. Add schedule: 0 4 * * *
 */

import { schedule } from "@netlify/functions";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

const handler = async () => {
  console.log("[sync-games-backfill] Starting scheduled backfill sync");
  
  if (!INTERNAL_CRON_SECRET) {
    console.error("[sync-games-backfill] INTERNAL_CRON_SECRET not configured");
    return { statusCode: 500 };
  }

  try {
    const response = await fetch(`${SITE_URL}/api/internal/sports/sync-games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-cron-secret": INTERNAL_CRON_SECRET,
      },
      body: JSON.stringify({
        mode: "backfill",
        // Don't force - skip if already complete
        force: false,
      }),
    });

    const data = await response.json();
    
    console.log("[sync-games-backfill] Sync complete:", {
      success: data.success,
      totalGames: data.totalGames,
      totalInserted: data.totalInserted,
      totalUpdated: data.totalUpdated,
      duration: data.duration,
    });

    return { statusCode: response.ok ? 200 : 500 };
  } catch (error) {
    console.error("[sync-games-backfill] Error:", error);
    return { statusCode: 500 };
  }
};

// Schedule: 4 AM UTC daily
export const main = schedule("0 4 * * *", handler);
