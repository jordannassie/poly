import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/serverServiceClient";
import { PAST_DAYS, FUTURE_DAYS } from "@/lib/sports/window";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getServiceClient();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const pastIso = new Date(nowMs - PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const futureIso = new Date(nowMs + FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: allData, error: allErr } = await client
      .from("sports_games")
      .select("starts_at", { count: "exact", head: false })
      .order("starts_at", { ascending: true });

    if (allErr) {
      return NextResponse.json({ ok: false, error: allErr.message }, { status: 500 });
    }

    const starts = (allData || []).map((g) => g.starts_at).filter(Boolean) as string[];
    const total = starts.length;
    const minStartsAt = starts.length > 0 ? starts[0] : null;
    const maxStartsAt = starts.length > 0 ? starts[starts.length - 1] : null;

    const inWindow = starts.filter((s) => s >= pastIso && s < futureIso).length;
    const next30Days = starts.filter((s) => s >= nowIso && s < futureIso).length;

    return NextResponse.json({
      ok: true,
      nowIso,
      pastIso,
      futureIso,
      total,
      inWindow,
      next30Days,
      minStartsAt,
      maxStartsAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
