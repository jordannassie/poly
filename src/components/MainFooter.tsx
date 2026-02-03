import Link from "next/link";
import { Youtube, Facebook } from "lucide-react";
import { LOGO_URL } from "./ui/ProvePicksLogo";

// Custom X (Twitter) icon
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Custom TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

// Social link component
function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
      aria-label={label}
    >
      {children}
    </a>
  );
}

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
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80 hidden sm:block">
              Demo UI for prediction markets.
            </span>
            <div className="flex items-center gap-2">
              <SocialLink href="https://www.youtube.com/@ProvePicks" label="YouTube">
                <Youtube className="h-5 w-5 text-white" />
              </SocialLink>
              <SocialLink href="http://tiktok.com/@provepicks" label="TikTok">
                <TikTokIcon className="h-5 w-5 text-white" />
              </SocialLink>
              <SocialLink href="https://x.com/jesus_got62301" label="X (Twitter)">
                <XIcon className="h-4 w-4 text-white" />
              </SocialLink>
              <SocialLink href="https://www.facebook.com/profile.php?id=61587495478115" label="Facebook">
                <Facebook className="h-5 w-5 text-white" />
              </SocialLink>
            </div>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-3">
          <Link href="/" className="hover:text-white">
            Markets
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
