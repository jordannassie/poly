"use client";

export default function DocsPage() {
  const sections = [
    {
      title: "Core Product Model",
      bullets: [
        "Prediction markets on sports matchups with coin/cash modes.",
        "User flows: browse games, place picks, track outcomes, climb leaderboards.",
        "Data model centers on games, markets, users, balances, and settlements.",
      ],
    },
    {
      title: "Sports Data Architecture",
      bullets: [
        "Primary table: sports_games (normalized starts_at, status, teams, scores).",
        "Caches and adapters transform provider payloads to a unified schema.",
        "Service-role Supabase access in server routes; RLS blocks anon by default.",
      ],
    },
    {
      title: "Rolling Time Window (PAST_DAYS / FUTURE_DAYS)",
      bullets: [
        "Past window: PAST_DAYS for recent context and stability.",
        "Future window: FUTURE_DAYS to keep home tabs and featured populated.",
        "Applied consistently across discovery ingest and server API queries.",
      ],
    },
    {
      title: "Homepage Logic Rules",
      bullets: [
        "Live tab: all live games (status normalized), sorted by starts_at asc.",
        "Starting Soon: within 6h; fallback to next upcoming if empty.",
        "Hot: live first, then upcoming; fallback to recent past if no future.",
        "Never show empty when any games exist in DB.",
      ],
    },
    {
      title: "Featured Matchup Rules",
      bullets: [
        "Priority: live earliest -> earliest upcoming -> most recent past.",
        "Top candidates (max 3) rotate every ~8s when multiple exist.",
        "Links route to league-specific game pages or market fallback.",
      ],
    },
    {
      title: "Lifecycle Jobs",
      bullets: [
        "Discover: rolling window ingest (past to future), normalized status, schema-aware upserts.",
        "Sync: updates live scores/status; finalize handles settlements when eligible.",
        "Logs capture window bounds, fetched counts, and upsert results.",
      ],
    },
    {
      title: "Diagnostic Endpoints",
      bullets: [
        "/api/diag/version identifies deployed app root and build metadata.",
        "/api/diag/sports checks env keys and sports_games sample/counts.",
        "/api/diag/games-window reports window counts and min/max starts_at.",
      ],
    },
    {
      title: "DO NOT TOUCH RULES",
      bullets: [
        "No UI/layout/color/spacing changes outside explicit requests.",
        "No wallet/settlement/treasury changes unless specified.",
        "No schema migrations or route renames without approval.",
      ],
    },
    {
      title: "MVP Philosophy",
      bullets: [
        "Small, safe, incremental changes that keep production healthy.",
        "Prefer defensive defaults: never empty states when data exists.",
        "Surface diagnostics to prove correctness before larger moves.",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12 md:px-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            ProvePicks Docs
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">ProvePicks System Blueprint</h1>
          <p className="text-white/70 text-sm md:text-base">
            A concise reference for how data flows, what windows drive the homepage,
            and the guardrails that keep the MVP stable.
          </p>
        </header>

        <div className="grid gap-6 md:gap-8">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
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
