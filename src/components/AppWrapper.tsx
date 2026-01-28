"use client";

import { CodeGate } from "./CodeGate";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  return <CodeGate>{children}</CodeGate>;
}
