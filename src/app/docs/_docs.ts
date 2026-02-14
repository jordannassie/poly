export const PROVEPICKS_DOCS_TEXT = `
PROVEPICKS SYSTEM BLUEPRINT (Single Source of Truth)

PRODUCTION REALITY
- Production app root is src/ unless /api/diag/version says otherwise.
- Do not assume ProvePicks-NEXT is production.

DATA TRUTH
- Table: public.sports_games
- Columns: id, league, starts_at, status, home_score, away_score, season, created_at
- Rules:
  - All time logic MUST use starts_at.
  - Never use start_time / startTime.

STATUS NORMALIZATION
- UPCOMING: NS, Not Started
- LIVE: 1H, HT, 2H, Second Half (and anything containing "Half")
- FINAL: FT
- CANCELLED: Cancelled, Canceled
- Use existing helpers: normalizeGameStatus / isLiveStatus / isFinalStatus / isUpcomingStatus

TIME WINDOW RULES
- Canonical constants:
  - PAST_DAYS = 7
  - FUTURE_DAYS = 30 (may be raised to 60/90/365 for marketing)
- All APIs and ingestion windows must reference these constants.

HOMEPAGE NON-EMPTY RULE (MUST)
If sports_games has any rows, Home must not show “0 games”.
Derived lists:
- ALL_GAMES: games with valid starts_at
- UPCOMING: starts_at >= now AND not final/cancelled
- LIVE: normalized LIVE
- RECENT: starts_at < now

Featured:
1) LIVE[0] else 2) UPCOMING[0] else 3) RECENT[0] else hide section

Tabs:
- LIVE tab: LIVE else UPCOMING(10) else RECENT(10)
- STARTING SOON: UPCOMING within 48h else UPCOMING(10) else RECENT(10)
- HOT RIGHT NOW: LIVE + UPCOMING (dedupe) else RECENT(10)
- No “today-only” strict filters.

DIAGNOSTICS
- /api/diag/version: confirms which app root is live + git sha
- /api/diag/sports: confirms counts and sample

DO NOT TOUCH GUARDRAILS
Every Cursor prompt MUST:
1) Open and read src/app/docs/_docs.ts
2) Follow it. If prompt conflicts, STOP.
3) Make only one subsystem change.
4) LAST STEP: append to Change Log with files + verify steps + commit hash.

ROOT CAUSE OF "0 GAMES" BUG (for future reference)
Home fetches /api/sports/hot. That endpoint called getHotGamesFromCache() which used the
ANON Supabase client. RLS blocks anon reads on sports_games => 0 rows returned => Home empty.
Additionally the query window was only now+24h, so even without RLS, stale data returned 0.
Fix: /api/sports/hot now uses getServiceClient() (service role), queries PAST_DAYS back to
FUTURE_DAYS forward, and returns LIVE + UPCOMING + RECENT as fallback categories.

CHANGE LOG
- 2026-02-12: Updated home fallback logic to ensure games display when tabs would be empty; file: src/app/home-client.tsx
- 2026-02-14: ROOT CAUSE FIX — Rewrote /api/sports/hot to use service-role Supabase client
  and wide time window (PAST_DAYS/FUTURE_DAYS). Returns LIVE+UPCOMING+RECENT categories.
  Fixed home empty-state to only show when displayGames AND fallbackGames are both empty.
  Files: src/app/api/sports/hot/route.ts, src/app/home-client.tsx, src/app/docs/_docs.ts
  Verify: /api/sports/hot returns non-empty games array; Home shows games in Hot/Live/Starting Soon;
  Featured shows a real matchup (not AWA/HOM placeholder).
`;
