import React from "react";

type FeaturedMatchupCardProps = {
  league?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeTeamAbbr?: string | null;
  awayTeamAbbr?: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  startsAtText?: string | null;
};

export default function FeaturedMatchupCard(props: FeaturedMatchupCardProps) {
  const league = props.league ?? "Featured";
  const homeName = props.homeTeamName ?? "Home";
  const awayName = props.awayTeamName ?? "Away";
  const homeAbbr = props.homeTeamAbbr ?? "";
  const awayAbbr = props.awayTeamAbbr ?? "";
  const startsAtText = props.startsAtText ?? "Starting soon";

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-6">
      <div className="text-lg font-semibold">Featured Matchup</div>
      <div className="mt-1 text-sm text-white/60">{league}</div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 overflow-hidden rounded bg-white/5 flex items-center justify-center">
            {props.awayLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.awayLogoUrl} alt={awayName} className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-white/40">LOGO</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white/60 truncate">{awayName}</div>
            <div className="text-xl font-bold truncate">{awayAbbr || awayName}</div>
          </div>
        </div>

        <div className="text-white/40 text-sm">VS</div>

        <div className="flex items-center gap-3 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="text-sm text-white/60 truncate">{homeName}</div>
            <div className="text-xl font-bold truncate">{homeAbbr || homeName}</div>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded bg-white/5 flex items-center justify-center">
            {props.homeLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.homeLogoUrl} alt={homeName} className="h-full w-full object-contain" />
            ) : (
              <div className="text-xs text-white/40">LOGO</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/60">{startsAtText}</div>
    </div>
  );
}
