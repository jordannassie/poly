import Link from "next/link";

export function MainFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1320]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-md bg-[#2d7ff9] flex items-center justify-center text-sm font-bold">
              P
            </div>
            <span className="text-sm font-semibold">Polymarket</span>
          </div>
          <div className="text-sm text-white/50">
            Demo UI for prediction markets.
          </div>
        </div>
        <div className="grid gap-3 text-sm text-white/60 sm:grid-cols-3">
          <Link href="/" className="hover:text-white">
            Markets
          </Link>
          <Link href="/breaking" className="hover:text-white">
            Breaking news
          </Link>
          <Link href="/sports" className="hover:text-white">
            Sports
          </Link>
          <span>Careers</span>
          <span>Terms of Use</span>
          <span>Privacy</span>
        </div>
        <div className="text-xs text-white/40">
          © 2026 Polymarket UI. Built for demo purposes.
        </div>
      </div>
    </footer>
  );
}
