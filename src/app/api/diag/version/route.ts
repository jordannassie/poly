export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    appRoot: "root-src",
    gitSha: process.env.COMMIT_REF ?? process.env.HEAD ?? null,
    buildTime: new Date().toISOString(),
  });
}
