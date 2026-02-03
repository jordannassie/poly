/**
 * Netlify Scheduled Function: Live Games Sync
 * 
 * Runs every 1 minute to update live game scores.
 * 
 * Schedule: "* * * * *" (every minute)
 * 
 * To set up in Netlify:
 * 1. Go to Netlify Dashboard > Site > Functions
 * 2. Find "sync-games-live"
 * 3. Add schedule: * * * * *
 */

import { schedule } from "@netlify/functions";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

const handler = async () => {
  console.log("[sync-games-live] Starting scheduled live sync");
  
  if (!INTERNAL_CRON_SECRET) {
    console.error("[sync-games-live] INTERNAL_CRON_SECRET not configured");
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

    return { statusCode: response.ok ? 200 : 500 };
  } catch (error) {
    console.error("[sync-games-live] Error:", error);
    return { statusCode: 500 };
  }
};

// Schedule: every minute
export const main = schedule("* * * * *", handler);
