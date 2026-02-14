import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  expiresAt: string;
}

function getCurrentUserId(): string | null {
  try {
    const cookieStore = cookies();
    const walletSessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);

    if (walletSessionCookie?.value) {
      const session: WalletSession = JSON.parse(walletSessionCookie.value);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return session.userId;
      }
    }
  } catch {
    // Ignore malformed cookie
  }

  return null;
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const amount = Number(body?.amount ?? 1000);
    const reason = String(body?.reason ?? "bonus");

    // Add coins to user's ledger
    const { error: ledgerError } = await adminClient
      .from("coin_ledger")
      .insert({
        user_id: userId,
        amount,
        entry_type: reason,
        ref_type: null,
        ref_id: null,
        meta: { reason: "Free coin bonus" },
      });

    if (ledgerError) {
      console.error("[/api/coins/award] Ledger insert error:", ledgerError.message);
      return NextResponse.json(
        { ok: false, error: "Failed to award coins" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, awarded: amount });
  } catch (error) {
    console.error("[/api/coins/award] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
