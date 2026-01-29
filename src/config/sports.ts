/**
 * Sports Configuration
 * Single source of truth for enabled/disabled sports
 */

export interface SportConfig {
  key: string;
  label: string;
  enabled: boolean;
  route?: string;
  icon?: string;
  count?: number;
}

// List of currently enabled sports
export const ENABLED_SPORTS = ["nfl", "nba", "mlb", "nhl"] as const;
export type EnabledSport = typeof ENABLED_SPORTS[number];

// Check if a sport is enabled
export function isSportEnabled(sportKey: string): boolean {
  return ENABLED_SPORTS.includes(sportKey.toLowerCase() as EnabledSport);
}

// Full sports menu configuration
export const sportsMenu: SportConfig[] = [
  // Enabled sports - active and clickable
  { key: "nfl", label: "NFL", enabled: true, route: "/sports?league=nfl", icon: "🏈" },
  { key: "nba", label: "NBA", enabled: true, route: "/sports?league=nba", icon: "🏀" },
  { key: "mlb", label: "MLB", enabled: true, route: "/sports?league=mlb", icon: "⚾" },
  { key: "nhl", label: "NHL", enabled: true, route: "/sports?league=nhl", icon: "🏒" },
  
  // Disabled sports - visible but greyed out
  { key: "ncaa-cbb", label: "NCAA CBB", enabled: false, icon: "🏀" },
  { key: "ncaa-fb", label: "NCAA FB", enabled: false, icon: "🏈" },
  { key: "ufc", label: "UFC", enabled: false, icon: "🥊" },
  { key: "soccer", label: "Soccer", enabled: false, icon: "⚽" },
  { key: "tennis", label: "Tennis", enabled: false, icon: "🎾" },
  { key: "golf", label: "Golf", enabled: false, icon: "⛳" },
  { key: "f1", label: "Formula 1", enabled: false, icon: "🏎️" },
  { key: "esports", label: "Esports", enabled: false, icon: "🎮" },
  { key: "boxing", label: "Boxing", enabled: false, icon: "🥊" },
  { key: "cricket", label: "Cricket", enabled: false, icon: "🏏" },
  { key: "rugby", label: "Rugby", enabled: false, icon: "🏉" },
];

// Category tabs configuration (top nav chips)
export interface CategoryConfig {
  label: string;
  href: string;
  enabled: boolean;
  isSport?: boolean;
}

export const categoryTabs: CategoryConfig[] = [
  // General tabs - always enabled
  { label: "🔥 Hot Right Now", href: "/", enabled: true },
  { label: "Live", href: "/?view=live", enabled: true },
  { label: "Starting Soon", href: "/?view=starting-soon", enabled: true },
  { label: "Big Volume", href: "/?view=big-volume", enabled: true },
  
  // Enabled sports
  { label: "NFL", href: "/sports?league=nfl", enabled: true, isSport: true },
  { label: "NBA", href: "/sports?league=nba", enabled: true, isSport: true },
  { label: "MLB", href: "/sports?league=mlb", enabled: true, isSport: true },
  { label: "NHL", href: "/sports?league=nhl", enabled: true, isSport: true },
  
  // Disabled sports - visible but greyed out
  { label: "UFC", href: "#", enabled: false, isSport: true },
  { label: "Soccer", href: "#", enabled: false, isSport: true },
  { label: "Tennis", href: "#", enabled: false, isSport: true },
  { label: "Golf", href: "#", enabled: false, isSport: true },
  { label: "F1", href: "#", enabled: false, isSport: true },
  { label: "Esports", href: "#", enabled: false, isSport: true },
];

// Get enabled sports only
export function getEnabledSports(): SportConfig[] {
  return sportsMenu.filter(s => s.enabled);
}

// Get disabled sports only  
export function getDisabledSports(): SportConfig[] {
  return sportsMenu.filter(s => !s.enabled);
}
