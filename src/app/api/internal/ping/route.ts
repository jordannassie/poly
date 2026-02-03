/**
 * Internal Ping Route
 * 
 * GET /api/internal/ping
 * 
 * Returns status of internal configuration.
 * Useful for confirming INTERNAL_CRON_SECRET is set in production.
 */

import { NextRequest, NextResponse } from "next/server";

const INTERNAL_CRON_SECRET = process.env.INTERNAL_CRON_SECRET;

export async function GET(request: NextRequest) {
  // Check if the caller provided the secret (to verify the secret itself works)
  const headerSecret = request.headers.get("x-internal-cron-secret");
  const isSecretMatch = INTERNAL_CRON_SECRET && headerSecret === INTERNAL_CRON_SECRET;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: "ok",
    config: {
      INTERNAL_CRON_SECRET_SET: !!INTERNAL_CRON_SECRET,
      INTERNAL_CRON_SECRET_LENGTH: INTERNAL_CRON_SECRET?.length || 0,
      SECRET_HEADER_PROVIDED: !!headerSecret,
      SECRET_MATCH: isSecretMatch,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      NETLIFY: !!process.env.NETLIFY,
    },
  });
}
