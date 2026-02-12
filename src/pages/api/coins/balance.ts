import { NextApiRequest, NextApiResponse } from "next";
import { getAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  expiresAt: string;
}

function getCurrentUserId(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${WALLET_SESSION_COOKIE}=`));

  if (!match) return null;

  try {
    const session: WalletSession = JSON.parse(decodeURIComponent(match.split("=")[1]));
    if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
      return session.userId;
    }
  } catch {
    return null;
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const userId = getCurrentUserId(req);
  if (!userId) {
    return res.status(401).json({ ok: false, error: "AUTH_REQUIRED" });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return res.status(500).json({ ok: false, error: "Server configuration" });
  }

  const { data, error } = await adminClient
    .from("coin_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("coins/balance error:", error);
    return res.status(500).json({ ok: false, error: "Failed to load balance" });
  }

  return res.status(200).json({ ok: true, balance: data?.balance ?? 0 });
}
