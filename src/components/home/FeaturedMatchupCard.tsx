export default function FeaturedMatchupCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-zinc-900 to-black p-6">
      <div className="text-lg font-semibold">Featured Matchup</div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-center">
          <div className="text-sm text-white/60">Team A</div>
          <div className="text-xl font-bold">DAL</div>
        </div>

        <div className="text-white/40 text-sm">VS</div>

        <div className="text-center">
          <div className="text-sm text-white/60">Team B</div>
          <div className="text-xl font-bold">NYG</div>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/60">
        Sunday • 4:25 PM ET
      </div>
    </div>
  );
}
