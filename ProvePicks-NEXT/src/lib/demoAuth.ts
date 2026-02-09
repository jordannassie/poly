/**
 * Demo Mode - DISABLED FOR PRODUCTION
 * 
 * All demo functionality has been disabled.
 * Users must authenticate via real auth providers.
 * 
 * These functions are kept as no-ops to avoid breaking imports.
 */

export type DemoUser = {
  name: string;
  handle: string;
  email: string;
};

export type DemoBet = {
  id: string;
  marketSlug: string;
  marketTitle: string;
  outcomeName: string;
  side: "buy" | "sell";
  position: "yes" | "no";
  price: number;
  amount: number;
  placedAt: string;
};

// DEMO MODE DISABLED - Always returns null
export const getDemoUser = (): DemoUser | null => {
  return null;
};

// DEMO MODE DISABLED - No-op, returns empty user
export const setDemoUser = (email?: string): DemoUser => {
  console.warn("[DISABLED] Demo mode is disabled in production");
  return {
    name: "",
    handle: "",
    email: "",
  };
};

// DEMO MODE DISABLED - No-op
export const clearDemoUser = () => {
  // No-op
};

// DEMO MODE DISABLED - Always returns empty array
export const getDemoBets = (): DemoBet[] => {
  return [];
};

// DEMO MODE DISABLED - No-op, returns empty array
export const addDemoBet = (bet: DemoBet): DemoBet[] => {
  console.warn("[DISABLED] Demo bets are disabled in production");
  return [];
};

// Clear any existing demo data on load
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("poly-demo-user");
    window.localStorage.removeItem("poly-demo-bets");
  } catch {
    // Ignore errors
  }
}
