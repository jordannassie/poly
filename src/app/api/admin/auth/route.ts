import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logSystemEvent } from "@/lib/supabase/admin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "Admin token not configured" },
        { status: 500 }
      );
    }

    if (token !== ADMIN_TOKEN) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Log admin login event
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await logSystemEvent({
      eventType: "ADMIN_LOGIN",
      severity: "info",
      payload: {
        ip: ip.split(",")[0].trim(),
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date().toISOString(),
      },
    });

    // Set the admin cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Logout - clear the cookie
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
