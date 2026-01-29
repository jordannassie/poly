import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: NextRequest): boolean {
  const adminCookie = request.cookies.get("pp_admin")?.value;
  const adminToken = process.env.ADMIN_TOKEN;
  return !!adminToken && adminCookie === adminToken;
}

// GET - Fetch all waitlist emails (admin only)
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Admin service key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    const { data: emails, error } = await adminClient
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Waitlist fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return CSV format if requested
    if (format === "csv") {
      const csvHeader = "email,source,created_at\n";
      const csvRows = (emails || [])
        .map((row) => `${row.email},${row.source || ""},${row.created_at}`)
        .join("\n");
      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      emails: emails || [],
      total: emails?.length || 0,
    });
  } catch (error) {
    console.error("Waitlist admin error:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}
