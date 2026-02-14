"use client";

import { PROVEPICKS_DOCS_TEXT } from "./_docs";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        <h1 className="mb-6 text-3xl font-bold">ProvePicks System Blueprint</h1>
        <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
            {PROVEPICKS_DOCS_TEXT}
          </pre>
        </div>
      </div>
    </main>
  );
}
