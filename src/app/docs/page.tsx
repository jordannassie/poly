export default function DocsPage() {
  const sections = [
    {
      title: "ProvePicks MVP Goal",
      bullets: [
        "Ship a stable prediction experience that always shows real games and avoids empty states.",
        "Prioritize small, safe, production-first changes that keep data flowing.",
      ],
    },
    {
      title: "Production App Root",
      bullets: [
        "Production runs from src/app (root-src). ProvePicks-NEXT exists but is not the production root unless diag/version says so.",
      ],
    },
    {
      title: "Sports Data Truth",
      bullets: [
        "sports_games columns: id, league, starts_at, status, home_score, away_score, season",
        "Provider statuses seen: NS, Not Started, 1H, HT, 2H, Second Half, FT, Cancelled",
      ],
    },
    {
      title: "Normalized Status Rules",
      bullets: [
        "UPCOMING: NS, Not Started",
        'LIVE: 1H, HT, 2H, Second Half, anything containing "Half"',
        "FINAL: FT",
        "CANCELLED: Cancelled/Canceled",
      ],
    },
    {
      title: "Time Window Rules (must be consistent everywhere)",
      bullets: [
        "Default query window: PAST_DAYS=7, FUTURE_DAYS=30",
        "League pages can show 7D / 30D / 90D / 365D",
        'Homepage must show future games, not “today only”',
      ],
    },
    {
      title: "Homepage Sections Rules",
      bullets: [
        "Hot Right Now: featured set of upcoming games in next 48h (or top 10 in next 7 days if none)",
        "Live: normalized LIVE games",
        "Starting Soon: games starting within next 6h",
        'Big Volume: placeholder until real volume exists (use “most picked” later)',
      ],
    },
    {
      title: "Featured Matchup Rules",
      bullets: [
        "Should NEVER show AWA/HOM placeholder",
        "Picks from: LIVE first, else next UPCOMING, else earliest future game, else hide the section",
        "Must support cycling top 3 games (future enhancement)",
      ],
    },
    {
      title: "Diagnostics",
      bullets: [
        "/api/diag/version tells which app root is live",
        "/api/diag/sports shows totalCount, next7DaysCount, sample",
        "If next7DaysCount is 0, do NOT change UI — fix ingestion/data",
      ],
    },
    {
      title: "DO NOT TOUCH Guardrails",
      bullets: [
        "Every Cursor prompt must include DO NOT TOUCH rules",
        "Only change one subsystem per step",
        "Always verify with diag endpoints after deploy",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 md:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">ProvePicks Docs</p>
          <h1 className="text-3xl font-bold md:text-4xl">ProvePicks System Blueprint</h1>
          <p className="text-white/70 text-sm md:text-base">
            Static reference for production behavior, data windows, homepage rules, and guardrails.
          </p>
        </header>

        <div className="grid gap-6 md:gap-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            >
              <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
              <ul className="space-y-2 text-sm text-white/80 leading-relaxed">
                {section.bullets.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
