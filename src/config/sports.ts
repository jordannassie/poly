/**
 * Sports Configuration
 * Single source of truth for enabled/disabled sports
 */

import { IconName } from "@/components/ui/AppIcon";

export interface SportConfig {
  key: string;
  label: string;
  enabled: boolean;
  route?: string;
  icon?: IconName;
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
// Only live/enabled sports are shown in the sidebar
export const sportsMenu: SportConfig[] = [
  { key: "nfl", label: "NFL", enabled: true, route: "/sports?league=nfl", icon: "nfl" },
  { key: "nba", label: "NBA", enabled: true, route: "/sports?league=nba", icon: "nba" },
  { key: "mlb", label: "MLB", enabled: true, route: "/sports?league=mlb", icon: "mlb" },
  { key: "nhl", label: "NHL", enabled: true, route: "/sports?league=nhl", icon: "nhl" },
  { key: "soccer", label: "Soccer", enabled: false, route: "/sports?league=soccer", icon: "soccer" },
];

// Category tabs configuration (top nav chips)
export interface CategoryConfig {
  label: string;
  href: string;
  enabled: boolean;
  isSport?: boolean;
  icon?: IconName;
}

export const categoryTabs: CategoryConfig[] = [
  // General tabs
  { label: "Hot Right Now", href: "/", enabled: true, icon: "hot" },
  { label: "Live", href: "/?view=live", enabled: true, icon: "live" },
  { label: "Starting Soon", href: "/?view=starting-soon", enabled: true, icon: "startingSoon" },
  { label: "Big Volume", href: "/?view=big-volume", enabled: true, icon: "bigVolume" },
  
  // Live sports only
  { label: "NFL", href: "/sports?league=nfl", enabled: true, isSport: true, icon: "nfl" },
  { label: "NBA", href: "/sports?league=nba", enabled: true, isSport: true, icon: "nba" },
  { label: "MLB", href: "/sports?league=mlb", enabled: true, isSport: true, icon: "mlb" },
  { label: "NHL", href: "/sports?league=nhl", enabled: true, isSport: true, icon: "nhl" },
  { label: "Soccer", href: "/sports?league=soccer", enabled: false, isSport: true, icon: "soccer" },
];

// Get enabled sports only
export function getEnabledSports(): SportConfig[] {
  return sportsMenu.filter(s => s.enabled);
}

// Get disabled sports only  
export function getDisabledSports(): SportConfig[] {
  return sportsMenu.filter(s => !s.enabled);
}
