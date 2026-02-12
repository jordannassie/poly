/**
 * POST /api/coins/ensure
 *
 * Ensures the current authenticated user has a coin balance row and,
 * if they have never received the signup bonus, safely grants 1,000 coins.
 * This route is protected via the wallet session cookie and uses the
 * Supabase service-role client to bypass RLS and perform the writes.
 */

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
    // Ignore invalid cookie
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    // Ensure coin balance row exists
    const { data: balanceRow, error: balanceError } = await adminClient
      .from("coin_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (balanceError) {
      console.error("Error reading coin balance:", balanceError);
      return NextResponse.json({ ok: false, error: "Failed to read balance" }, { status: 500 });
    }

    let currentBalance = balanceRow?.balance ?? 0;

    if (!balanceRow) {
      const { error: insertError } = await adminClient
        .from("coin_balances")
        .insert({ user_id: userId, balance: 0 });

      if (insertError) {
        console.error("Error creating coin balance row:", insertError);
        return NextResponse.json({ ok: false, error: "Failed to create balance" }, { status: 500 });
      }
    }

    // Check if signup bonus was already granted
    const { data: bonusRow, error: bonusError } = await adminClient
      .from("coin_ledger")
      .select("id")
      .eq("user_id", userId)
      .eq("entry_type", "SIGNUP_BONUS")
      .limit(1)
      .maybeSingle();

    if (bonusError) {
      console.error("Error checking signup bonus ledger:", bonusError);
      return NextResponse.json(
        { ok: false, error: "Failed to read ledger" },
        { status: 500 },
      );
    }

    let granted = false;

    if (!bonusRow) {
      granted = true;
      const bonusAmount = 1000;

      const { error: ledgerError } = await adminClient.from("coin_ledger").insert({
        user_id: userId,
        amount: bonusAmount,
        entry_type: "SIGNUP_BONUS",
        meta: {},
        created_at: new Date().toISOString(),
      });

      if (ledgerError) {
        console.error("Error inserting signup bonus ledger:", ledgerError);
        return NextResponse.json(
          { ok: false, error: "Failed to record bonus" },
          { status: 500 },
        );
      }

      const { data: updatedBalanceRow, error: updateError } = await adminClient
        .from("coin_balances")
        .update({
          balance: currentBalance + bonusAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select("balance")
        .single();

      if (updateError) {
        console.error("Error updating coin balance:", updateError);
        return NextResponse.json(
          { ok: false, error: "Failed to update balance" },
          { status: 500 },
        );
      }

      currentBalance = updatedBalanceRow?.balance ?? currentBalance + bonusAmount;
    }

    return NextResponse.json({
      ok: true,
      balance: currentBalance,
      granted,
    });
  } catch (error) {
    console.error("Error in /api/coins/ensure:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
