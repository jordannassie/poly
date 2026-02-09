import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const COOKIE_NAME = "pp_admin";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminCookie = request.cookies.get(COOKIE_NAME);
    
    // Also check for token in query string for backward compatibility with sports page
    const tokenParam = request.nextUrl.searchParams.get("token");
    
    const isValidCookie = adminCookie?.value === ADMIN_TOKEN;
    const isValidToken = tokenParam === ADMIN_TOKEN;

    if (!ADMIN_TOKEN) {
      // If no admin token configured, allow access (dev mode)
      return NextResponse.next();
    }

    if (!isValidCookie && !isValidToken) {
      // Redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
