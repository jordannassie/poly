import React from "react";

type Props = {
  league?: string | null;
  awayName?: string | null;
  homeName?: string | null;
  awayAbbr?: string | null;
  homeAbbr?: string | null;
  awayLogoUrl?: string | null;
  homeLogoUrl?: string | null;
  startsAtText?: string | null;
  ctaHref?: string | null;
};

export default function FeaturedMatchupHero(p: Props) {
  const league = p.league ?? "Featured";
  const awayName = p.awayName ?? "Away";
  const homeName = p.homeName ?? "Home";
  const awayAbbr = p.awayAbbr ?? awayName;
  const homeAbbr = p.homeAbbr ?? homeName;
  const startsAtText = p.startsAtText ?? "Starting soon";
  const ctaHref = p.ctaHref ?? "/sports";

  return (
    <div
      data-featured-hero="v2"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] p-8 text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(800px 300px at 20% 30%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(800px 300px at 80% 30%, rgba(249,115,22,0.25), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="text-center">
          <div className="text-sm tracking-widest text-white/70">FEATURED MATCHUP</div>
          <div className="mt-2 text-3xl font-extrabold">
            {awayName} <span className="text-white/40">@</span> {homeName}
          </div>
          <div className="mt-2 text-sm text-white/60">
            {league} • {startsAtText}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-10">
          <div className="text-center">
            <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden">
              {p.awayLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.awayLogoUrl} alt={awayName} className="h-full w-full object-contain" />
              ) : (
                <div className="text-xl font-bold">{String(awayAbbr).slice(0, 3).toUpperCase()}</div>
              )}
            </div>
            <div className="mt-2 text-sm text-white/70">{awayName}</div>
          </div>

          <div className="text-white/30 text-3xl font-black">VS</div>

          <div className="text-center">
            <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden">
              {p.homeLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.homeLogoUrl} alt={homeName} className="h-full w-full object-contain" />
              ) : (
                <div className="text-xl font-bold">{String(homeAbbr).slice(0, 3).toUpperCase()}</div>
              )}
            </div>
            <div className="mt-2 text-sm text-white/70">{homeName}</div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <a href={ctaHref} className="rounded-xl bg-white/15 px-6 py-3 text-sm font-semibold hover:bg-white/20">
            View Matchup
          </a>
        </div>
      </div>
    </div>
  );
}
