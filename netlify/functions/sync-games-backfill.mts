/**
 * Netlify Scheduled Function: Backfill Games Sync
 * 
 * Runs once daily to ensure season games are complete.
 * Will skip if backfill is already complete for the season.
 * 
 * Schedule: 0 4 * * * (4 AM UTC daily)
 */

import type { Config, Context } from "@netlify/functions";

const SITE_URL = process.env.URL || process.env.DEPLOY_URL || "https://provepicks.com";
const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

export default async (request: Request, context: Context) => {
  const startTime = Date.now();
  console.log("[cron] mode=backfill status=started");
  
  if (!INTERNAL_CRON_SECRET) {
    console.error("[cron] mode=backfill status=error reason=INTERNAL_CRON_SECRET_NOT_SET");
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
        mode: "backfill",
        force: false,
      }),
    });

    const data = await response.json();
    const duration_ms = Date.now() - startTime;
    
    console.log(`[cron] mode=backfill status=${data.success ? 'ok' : 'error'} duration_ms=${duration_ms} games=${data.totalGames || 0} inserted=${data.totalInserted || 0} updated=${data.totalUpdated || 0}`);

    return new Response(JSON.stringify(data), { 
      status: response.ok ? 200 : 500,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    console.error(`[cron] mode=backfill status=error duration_ms=${duration_ms} error=${error instanceof Error ? error.message : 'Unknown'}`);
    return new Response("Error", { status: 500 });
  }
};

export const config: Config = {
  schedule: "0 4 * * *",
};
