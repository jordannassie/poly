"use client";

type Team = {
  abbr: string;
  name: string;
  record?: string;
  odds: number;
  color: string;
};

type HeadToHeadChartProps = {
  team1: Team;
  team2: Team;
  gameTime: string;
  volume?: string;
  source?: string;
};

export function HeadToHeadChart({
  team1,
  team2,
  gameTime,
  volume = "$4.02m Vol.",
  source = "ProvePicks",
}: HeadToHeadChartProps) {
  const total = team1.odds + team2.odds;
  const team1Percent = Math.round((team1.odds / total) * 100);
  const team2Percent = 100 - team1Percent;

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 md:p-6">
      {/* Game Time Badge */}
      <div className="flex justify-center mb-4 md:mb-6">
        <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-[color:var(--surface-2)] border border-[color:var(--border-soft)] text-xs md:text-sm font-medium text-[color:var(--text-muted)]">
          {gameTime}
        </span>
      </div>

      {/* Teams and Progress - Horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* Mobile: Team row with both teams side by side */}
        <div className="flex md:hidden items-center justify-between">
          {/* Team 1 */}
          <div className="text-center">
            <div
              className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2"
              style={{ backgroundColor: team1.color }}
            >
              {team1.abbr}
            </div>
            <div className="font-semibold text-sm text-[color:var(--text-strong)]">{team1.name}</div>
          </div>

          {/* VS */}
          <div className="text-[color:var(--text-subtle)] font-medium text-sm">vs</div>

          {/* Team 2 */}
          <div className="text-center">
            <div
              className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2"
              style={{ backgroundColor: team2.color }}
            >
              {team2.abbr}
            </div>
            <div className="font-semibold text-sm text-[color:var(--text-strong)]">{team2.name}</div>
          </div>
        </div>

        {/* Mobile: Progress Bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg font-bold text-[color:var(--text-strong)]">
              {team1Percent}%
            </span>
            <span className="text-lg font-bold text-[color:var(--text-strong)]">
              {team2Percent}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${team1Percent}%`,
                backgroundColor: team1.color,
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${team2Percent}%`,
                backgroundColor: team2.color,
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-[color:var(--text-subtle)]">
            <span>{volume}</span>
            <span>•</span>
            <span>{source}</span>
          </div>
        </div>

        {/* Desktop: Team 1 */}
        <div className="hidden md:block flex-1 text-center">
          <div
            className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-3"
            style={{ backgroundColor: team1.color }}
          >
            {team1.abbr}
          </div>
          <div className="font-semibold text-[color:var(--text-strong)]">{team1.name}</div>
          {team1.record && (
            <div className="text-sm text-[color:var(--text-subtle)]">{team1.record}</div>
          )}
        </div>

        {/* Desktop: Progress Bar Section */}
        <div className="hidden md:block flex-1 max-w-xs">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl font-bold text-[color:var(--text-strong)]">
              {team1Percent}%
            </span>
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-[color:var(--surface-3)] flex">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${team1Percent}%`,
                  backgroundColor: team1.color,
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${team2Percent}%`,
                  backgroundColor: team2.color,
                }}
              />
            </div>
            <span className="text-2xl font-bold text-[color:var(--text-strong)]">
              {team2Percent}%
            </span>
          </div>
          <div className="text-center text-sm text-[color:var(--text-subtle)]">{volume}</div>
          <div className="flex items-center justify-center gap-1 mt-1 text-xs text-[color:var(--text-subtle)]">
            <span>⌐</span>
            <span>{source}</span>
          </div>
        </div>

        {/* Desktop: Team 2 */}
        <div className="hidden md:block flex-1 text-center">
          <div
            className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-3"
            style={{ backgroundColor: team2.color }}
          >
            {team2.abbr}
          </div>
          <div className="font-semibold text-[color:var(--text-strong)]">{team2.name}</div>
          {team2.record && (
            <div className="text-sm text-[color:var(--text-subtle)]">{team2.record}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for lists
export function HeadToHeadRow({
  team1,
  team2,
  gameTime,
  volume,
  onClickTeam1,
  onClickTeam2,
}: {
  team1: Team;
  team2: Team;
  gameTime: string;
  volume: string;
  onClickTeam1?: () => void;
  onClickTeam2?: () => void;
}) {
  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border-soft)] rounded-xl p-4 hover:border-[color:var(--border-strong)] transition">
      <div className="flex items-center gap-4">
        {/* Time & Volume */}
        <div className="w-24">
          <div className="text-sm font-medium text-[color:var(--text-strong)]">{gameTime}</div>
          <div className="text-xs text-[color:var(--text-subtle)]">{volume}</div>
        </div>

        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: team1.color }}
          >
            {team1.abbr}
          </div>
          <div>
            <div className="font-medium text-sm">{team1.name}</div>
            {team1.record && (
              <div className="text-xs text-[color:var(--text-subtle)]">{team1.record}</div>
            )}
          </div>
        </div>

        {/* Moneyline Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClickTeam1}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition"
          >
            {team1.abbr} {team1.odds}¢
          </button>
          <button
            onClick={onClickTeam2}
            className="px-4 py-2 rounded-lg bg-[color:var(--surface-3)] hover:bg-[color:var(--surface-2)] text-[color:var(--text-strong)] font-medium text-sm transition border border-[color:var(--border-soft)]"
          >
            {team2.abbr} {team2.odds}¢
          </button>
        </div>

        {/* Spread */}
        <div className="flex gap-2">
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">{team1.abbr} -4.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">51¢</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">{team2.abbr} +4.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">50¢</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex gap-2">
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">O 46.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">47¢</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-[color:var(--surface-2)] text-sm">
            <span className="text-[color:var(--text-muted)]">U 46.5</span>
            <span className="ml-2 font-medium text-[color:var(--text-strong)]">54¢</span>
          </div>
        </div>

        {/* Game View Link */}
        <button className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)] transition flex items-center gap-1">
          <span className="text-xs bg-[color:var(--surface-2)] px-2 py-1 rounded">68</span>
          Game View &gt;
        </button>
      </div>

      {/* Team 2 Row */}
      <div className="flex items-center gap-4 mt-3 pl-28">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: team2.color }}
          >
            {team2.abbr}
          </div>
          <div>
            <div className="font-medium text-sm">{team2.name}</div>
            {team2.record && (
              <div className="text-xs text-[color:var(--text-subtle)]">{team2.record}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
