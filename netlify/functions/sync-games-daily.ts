/**
 * Netlify Scheduled Function: Daily Games Sync
 * 
 * Runs every 30 minutes to keep upcoming games up-to-date.
 * 
 * Schedule: "*/30 * * * *" (every 30 minutes)
 * 
 * To set up in Netlify:
 * 1. Go to Netlify Dashboard > Site > Functions
 * 2. Find "sync-games-daily" 
 * 3. Add schedule: */30 * * * *
 */

import { schedule } from "@netlify/functions";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

const handler = async () => {
  console.log("[sync-games-daily] Starting scheduled daily sync");
  
  if (!INTERNAL_CRON_SECRET) {
    console.error("[sync-games-daily] INTERNAL_CRON_SECRET not configured");
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
        mode: "daily",
      }),
    });

    const data = await response.json();
    
    console.log("[sync-games-daily] Sync complete:", {
      success: data.success,
      totalGames: data.totalGames,
      totalInserted: data.totalInserted,
      totalUpdated: data.totalUpdated,
      duration: data.duration,
    });

    return { statusCode: response.ok ? 200 : 500 };
  } catch (error) {
    console.error("[sync-games-daily] Error:", error);
    return { statusCode: 500 };
  }
};

// Schedule: every 30 minutes
export const main = schedule("*/30 * * * *", handler);
