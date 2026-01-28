import Link from "next/link";

export function MainFooter() {
  return (
    <footer className="border-t border-[color:var(--border-soft)] bg-[color:var(--surface)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[color:var(--text-strong)]">
            <div className="h-8 w-8 rounded-md bg-[color:var(--accent)] flex items-center justify-center text-sm font-bold text-white">
              P
            </div>
            <span className="text-sm font-semibold">ProvePicks</span>
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
