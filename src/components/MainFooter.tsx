import Link from "next/link";
import { Zap } from "lucide-react";

export function MainFooter() {
  return (
    <footer className="border-t border-orange-500/20 bg-gradient-to-r from-[color:var(--surface)] via-[color:var(--surface)] to-orange-500/5">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[color:var(--text-strong)]">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">ProvePicks</span>
          </div>
          <div className="text-sm text-[color:var(--text-subtle)]">
            Demo UI for prediction markets.
          </div>
        </div>
        <div className="grid gap-3 text-sm text-[color:var(--text-muted)] sm:grid-cols-3">
          <Link href="/" className="hover:text-[color:var(--text-strong)]">
            Markets
          </Link>
          <Link href="/breaking" className="hover:text-[color:var(--text-strong)]">
            Breaking news
          </Link>
          <Link href="/sports" className="hover:text-[color:var(--text-strong)]">
            Sports
          </Link>
          <span>Careers</span>
          <span>Terms of Use</span>
          <span>Privacy</span>
        </div>
        <div className="text-xs text-[color:var(--text-subtle)]">
          © 2026 ProvePicks. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
