import Link from "next/link";
import { Zap } from "lucide-react";

export function MainFooter() {
  return (
    <footer className="bg-gradient-to-r from-orange-500 to-amber-500">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ProvePicks</span>
          </div>
          <div className="text-sm text-white/80">
            Demo UI for prediction markets.
          </div>
        </div>
        <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3">
          <Link href="/" className="hover:text-white">
            Markets
          </Link>
          <Link href="/breaking" className="hover:text-white">
            Breaking news
          </Link>
          <Link href="/sports" className="hover:text-white">
            Sports
          </Link>
          <span className="hover:text-white cursor-pointer">Careers</span>
          <span className="hover:text-white cursor-pointer">Terms of Use</span>
          <span className="hover:text-white cursor-pointer">Privacy</span>
        </div>
        <div className="text-xs text-white/70">
          © 2026 ProvePicks. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
