import React from "react";
import {
  Flame,
  Radio,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  Globe,
  Shield,
  Swords,
} from "lucide-react";

export type IconName =
  | "hot"
  | "live"
  | "startingSoon"
  | "bigVolume"
  | "nfl"
  | "nba"
  | "mlb"
  | "nhl"
  | "soccer";

const ICONS: Record<IconName, React.ComponentType<any>> = {
  hot: Flame,
  live: Radio,
  startingSoon: Clock,
  bigVolume: TrendingUp,
  nfl: Activity,
  nba: Zap,
  mlb: Shield,
  nhl: Swords,
  soccer: Globe,
};

export default function AppIcon({
  name,
  className,
  size = 16,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} aria-hidden="true" />;
}
