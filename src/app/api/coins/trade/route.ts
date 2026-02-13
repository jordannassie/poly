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
    const amountCoins = Number(body?.amountCoins ?? 0);
    const marketId = String(body?.marketId ?? "").trim();
    const side = String(body?.side ?? "yes").trim().toLowerCase();
    const marketTitle = body?.marketTitle ?? null;
    const marketSlug = body?.marketSlug ?? null;

    if (!marketId || amountCoins <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient.rpc("process_coin_trade", {
      p_user_id: userId,
      p_market_id: marketId,
      p_side: side,
      p_amount: amountCoins,
      p_market_title: marketTitle,
      p_market_slug: marketSlug,
    });

    if (error) {
      const message = error.message || "Failed to place trade";
      const status = message.includes("INSUFFICIENT_BALANCE") ? 400 : 500;
      return NextResponse.json(
        { ok: false, error: message },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      balance: data?.new_balance ?? null,
      positionId: data?.position_id ?? null,
    });
  } catch (error) {
    console.error("Error in /api/coins/trade:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to place trade" },
      { status: 500 },
    );
  }
}
