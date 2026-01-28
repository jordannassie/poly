export type DemoUser = {
  name: string;
  handle: string;
  email: string;
};

export type DemoBet = {
  id: string;
  marketTitle: string;
  outcomeName: string;
  side: "buy" | "sell";
  position: "yes" | "no";
  price: number;
  amount: number;
  placedAt: string;
};

const USER_KEY = "poly-demo-user";
const BETS_KEY = "poly-demo-bets";

export const getDemoUser = (): DemoUser | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
};

export const setDemoUser = (email?: string): DemoUser => {
  const normalizedEmail = email?.trim() || "demo@polymarket.com";
  const handleBase = normalizedEmail.split("@")[0] || "demo";
  const user: DemoUser = {
    name: "Demo Trader",
    handle: handleBase,
    email: normalizedEmail,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
};

export const clearDemoUser = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(USER_KEY);
  }
};

export const getDemoBets = (): DemoBet[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(BETS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DemoBet[];
  } catch {
    return [];
  }
};

export const addDemoBet = (bet: DemoBet): DemoBet[] => {
  if (typeof window === "undefined") return [];
  const existing = getDemoBets();
  const updated = [bet, ...existing].slice(0, 10);
  window.localStorage.setItem(BETS_KEY, JSON.stringify(updated));
  return updated;
};
