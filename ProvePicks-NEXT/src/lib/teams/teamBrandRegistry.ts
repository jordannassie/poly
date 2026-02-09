export type TeamBrand = { abbr: string; color: string };

const PUNCTUATION_REGEX = /[.,'()&\/\-]/g;
const MULTI_SPACE_REGEX = /\s+/g;

export function getTeamBrandKey(league: string, name: string): string {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(PUNCTUATION_REGEX, "")
    .replace(MULTI_SPACE_REGEX, " ");

  return `${league.toUpperCase()}::${normalizedName}`;
}

export const TEAM_BRANDS: Record<string, TeamBrand> = {
  "NBA::detroit pistons": { abbr: "DET", color: "#C8102E" },
  "NBA::charlotte hornets": { abbr: "CHA", color: "#1D1160" },
  "NBA::chicago bulls": { abbr: "CHI", color: "#CE1141" },
  "NBA::brooklyn nets": { abbr: "BKN", color: "#000000" },
  "NBA::utah jazz": { abbr: "UTA", color: "#002B5C" },
  "NBA::miami heat": { abbr: "MIA", color: "#98002E" },
};

export function resolveTeamBrand(args: {
  league: string;
  name: string;
  fallbackAbbr?: string;
  fallbackColor?: string;
}): TeamBrand {
  const key = getTeamBrandKey(args.league, args.name);
  const brand = TEAM_BRANDS[key];

  if (brand) {
    return brand;
  }

  return {
    abbr: args.fallbackAbbr ?? "",
    color: args.fallbackColor ?? "",
  };
}
