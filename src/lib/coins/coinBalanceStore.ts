import { getUntypedSupabaseClient } from "@/lib/supabase";

type Subscriber = (state: CoinBalanceState) => void;

interface CoinBalanceState {
  balance: number | null;
  loading: boolean;
  userId: string | null;
}

let state: CoinBalanceState = {
  balance: null,
  loading: false,
  userId: null,
};

const subscribers = new Set<Subscriber>();
let currentUserId: string | null = null;
let activeFetchId = 0;

function notifySubscribers() {
  subscribers.forEach((subscriber) => {
    subscriber(state);
  });
}

function updateState(update: Partial<CoinBalanceState>) {
  state = { ...state, ...update };
  notifySubscribers();
}

async function fetchFromSupabase(userId: string): Promise<number> {
  const client = getUntypedSupabaseClient();
  if (!client) return 0;

  const { data } = await client
    .from("coin_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.balance ?? 0;
}

async function loadBalance(userId: string) {
  const fetchId = ++activeFetchId;
  updateState({ loading: true, userId });

  try {
    const res = await fetch("/api/coins/balance");
    if (fetchId !== activeFetchId || userId !== currentUserId) {
      return;
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        updateState({ balance: data.balance ?? 0, loading: false });
        return;
      }
    }

    const fallbackBalance = await fetchFromSupabase(userId);
    if (fetchId !== activeFetchId || userId !== currentUserId) {
      return;
    }
    updateState({ balance: fallbackBalance, loading: false });
  } catch (error) {
    if (fetchId !== activeFetchId || userId !== currentUserId) {
      return;
    }
    console.error("Failed to load coin balance:", error);
    const fallbackBalance = await fetchFromSupabase(userId);
    if (fetchId !== activeFetchId || userId !== currentUserId) {
      return;
    }
    updateState({ balance: fallbackBalance, loading: false });
  }
}

export function setActiveCoinUser(userId: string | null) {
  if (userId === currentUserId) {
    if (userId) {
      loadBalance(userId);
    }
    return;
  }

  currentUserId = userId;

  if (!userId) {
    state = { balance: null, loading: false, userId: null };
    notifySubscribers();
    return;
  }

  loadBalance(userId);
}

export function refreshCoinBalance() {
  if (!currentUserId) {
    updateState({ balance: null, loading: false, userId: null });
    return;
  }
  loadBalance(currentUserId);
}

export function subscribeCoinBalance(subscriber: Subscriber) {
  subscribers.add(subscriber);
  subscriber(state);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function getCurrentCoinBalanceState() {
  return state;
}
