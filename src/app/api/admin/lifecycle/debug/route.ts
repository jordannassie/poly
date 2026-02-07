/**
 * Admin Lifecycle Debug API
 * 
 * GET /api/admin/lifecycle/debug
 * 
 * Returns finalize candidates and debug stats
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getFinalizeCandidates } from "@/lib/lifecycle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  // Require admin auth
  const authResult = requireAdmin(request);
  if (!authResult.authenticated) {
    return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get finalize candidates
    const debugResult = await getFinalizeCandidates(adminClient);
    
    return NextResponse.json({
      success: true,
      ...debugResult,
    });

  } catch (err) {
    console.error("[admin:lifecycle:debug] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
