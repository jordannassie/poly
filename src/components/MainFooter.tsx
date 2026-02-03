import Link from "next/link";
import { Youtube } from "lucide-react";
import { LOGO_URL } from "./ui/ProvePicksLogo";

export function MainFooter() {
  return (
    <footer className="bg-gradient-to-r from-orange-500 to-amber-500">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="ProvePicks" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-lg font-bold text-white">ProvePicks</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">
              Demo UI for prediction markets.
            </span>
            <a 
              href="https://www.youtube.com/@ProvePicks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="ProvePicks YouTube Channel"
            >
              <Youtube className="h-5 w-5 text-white" />
            </a>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-4">
          <Link href="/" className="hover:text-white">
            Markets
          </Link>
          <Link href="/breaking" className="hover:text-white">
            Breaking news
          </Link>
          <Link href="/sports" className="hover:text-white">
            Sports
          </Link>
          <Link href="/admin/sports" className="hover:text-white">
            Admin
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
