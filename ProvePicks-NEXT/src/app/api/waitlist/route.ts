import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

// POST - Add email to waitlist (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const adminClient = getAdminClient();
    if (!adminClient) {
      // Silently accept but don't store if no admin client
      return NextResponse.json({ success: true, message: "Added to waitlist" });
    }

    // Get request metadata
    const userAgent = request.headers.get("user-agent") || null;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

    // Insert email (upsert to handle duplicates gracefully)
    const { error } = await adminClient
      .from("waitlist")
      .upsert(
        {
          email: normalizedEmail,
          source: "gate_page",
          ip_address: ipAddress,
          user_agent: userAgent,
        },
        {
          onConflict: "email",
          ignoreDuplicates: true,
        }
      );

    if (error) {
      console.error("Waitlist insert error:", error);
      // Still return success to user even if DB fails
      return NextResponse.json({ success: true, message: "Added to waitlist" });
    }

    return NextResponse.json({ success: true, message: "Added to waitlist" });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ success: true, message: "Added to waitlist" });
  }
}
