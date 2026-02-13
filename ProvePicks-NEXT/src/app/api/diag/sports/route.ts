"use server";

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { client: null, hasUrl: Boolean(url), hasServiceKey: Boolean(serviceKey) };
  }
  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client, hasUrl: true, hasServiceKey: true };
}

export async function GET() {
  const appRootHint = "ProvePicks-NEXT";
  const { client, hasUrl, hasServiceKey } = getServiceClient();
  const urlHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (() => {
        try {
          return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;
        } catch {
          return "";
        }
      })()
    : "";

  if (!client) {
    return NextResponse.json({
      ok: false,
      appRootHint,
      hasUrl,
      hasServiceKey,
      urlHost,
      error: "Supabase service client not available (check env vars)",
    });
  }

  try {
    const { data: totalRow, error: totalError } = await client
      .from("sports_games")
      .select("*", { count: "exact", head: true });

    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: nextRows, count: nextCount, error: nextError } = await client
      .from("sports_games")
      .select("id, league, starts_at, status", { count: "exact" })
      .gte("starts_at", now.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .limit(3);

    const totalCount = totalRow?.length === 0 && totalError?.code === "PGRST301" ? 0 : totalRow ? totalRow.length : totalError ? 0 : null;

    return NextResponse.json({
      ok: !totalError && !nextError,
      appRootHint,
      hasUrl,
      hasServiceKey,
      urlHost,
      totalCount: totalCount ?? null,
      next7DaysCount: nextCount ?? null,
      sample: nextRows ?? [],
      error: totalError?.message || nextError?.message || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      appRootHint,
      hasUrl,
      hasServiceKey,
      urlHost,
      error: message,
    });
  }
}
