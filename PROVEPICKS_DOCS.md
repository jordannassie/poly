# ProvePicks System Blueprint (Single Source of Truth)

## Production Reality
- Production app root is **src/** unless https://provepicks.com/api/diag/version says otherwise.
- Never assume ProvePicks-NEXT is production.

## Data Truth
Table: public.sports_games
Columns: id, league, starts_at, status, home_score, away_score, season, created_at
Rules:
- All time logic MUST use `starts_at`.
- Do not use `start_time` / `startTime`.

## Status Normalization
Provider statuses seen:
- UPCOMING: NS, Not Started
- LIVE: 1H, HT, 2H, Second Half (and anything containing "Half")
- FINAL: FT
- CANCELLED: Cancelled, Canceled

Use helpers:
- normalizeGameStatus()
- isLiveStatus(), isUpcomingStatus(), isFinalStatus()

## Time Window Rules
Canonical constants:
- PAST_DAYS = 7
- FUTURE_DAYS = 30 (can be raised to 60/90/365 for marketing)

All APIs and ingestion windows must reference these constants.

## Homepage Rules (must never look dead)
Home must never show “0 games” if ANY games exist in DB.

Derived lists:
- ALL_GAMES: games with valid starts_at
- UPCOMING: starts_at >= now, not final/cancelled
- LIVE: normalized LIVE
- RECENT: starts_at < now

Featured:
1) LIVE[0] else
2) UPCOMING[0] else
3) RECENT[0] else hide section

Tabs:
- LIVE tab: LIVE else UPCOMING(10) else RECENT(10)
- STARTING SOON: UPCOMING within 48h else UPCOMING(10) else RECENT(10)
- HOT RIGHT NOW: LIVE + UPCOMING (dedupe) else RECENT(10)

No “today-only” strict filters.

## Diagnostics
- /api/diag/version verifies which app root is live.
- /api/diag/sports verifies counts/sample and confirms env + reads.

## DO NOT TOUCH Guardrails
Every Cursor prompt MUST include:
1) STEP 0 — Open and read PROVEPICKS_DOCS.md
2) Hard “DO NOT TOUCH” block
3) One change only
4) LAST STEP — Append Change Log entry

## Change Log
- (append new entries here)
