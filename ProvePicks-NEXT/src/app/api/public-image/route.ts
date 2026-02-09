/**
 * GET /api/public-image
 * 
 * Proxy route that streams public Supabase Storage images.
 * This bypasses client DNS resolution issues with *.supabase.co.
 * 
 * Query params:
 * - bucket: Storage bucket name (default: SPORTS)
 * - path: Object path within bucket (required, e.g. logos/teams/nfl/1.png)
 * 
 * Security:
 * - Normalizes path by stripping leading /
 * - Rejects paths containing ..
 * - Rejects full URLs
 * 
 * Caching:
 * - Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Validate and normalize the path
function normalizePath(path: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  // Reject full URLs
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return null;
  }

  // Reject path traversal attempts
  if (path.includes("..")) {
    return null;
  }

  let normalized = path.trim();

  // Strip leading slash
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  // Strip bucket prefix if accidentally included
  if (normalized.startsWith("SPORTS/")) {
    normalized = normalized.slice(7);
  }

  // Strip full storage path prefix if accidentally included
  const fullPathPrefix = "storage/v1/object/public/SPORTS/";
  if (normalized.startsWith(fullPathPrefix)) {
    normalized = normalized.slice(fullPathPrefix.length);
  }

  // Reject empty paths
  if (!normalized) {
    return null;
  }

  return normalized;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") || "SPORTS";
  const rawPath = url.searchParams.get("path");

  // Validate path
  if (!rawPath) {
    return new NextResponse("Missing path parameter", { status: 400 });
  }

  const normalizedPath = normalizePath(rawPath);
  if (!normalizedPath) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  // Build upstream URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("[public-image] NEXT_PUBLIC_SUPABASE_URL not configured");
    return new NextResponse("Storage not configured", { status: 503 });
  }

  const upstreamUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;

  try {
    // Fetch from upstream
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store", // We'll handle caching via response headers
    });

    // If not ok, return appropriate error
    if (!upstreamResponse.ok) {
      if (upstreamResponse.status === 404) {
        return new NextResponse("Not found", { status: 404 });
      }
      if (upstreamResponse.status === 403) {
        return new NextResponse("Access denied", { status: 403 });
      }
      return new NextResponse("Upstream error", { status: upstreamResponse.status });
    }

    // Get content type from upstream
    const contentType = upstreamResponse.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstreamResponse.headers.get("content-length");

    // Stream the response body
    const body = upstreamResponse.body;
    if (!body) {
      return new NextResponse("Empty response", { status: 502 });
    }

    // Build response headers
    const headers: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "X-Proxy-Source": "provepicks-image-proxy",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    // Return streamed response
    return new NextResponse(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[public-image] Fetch error:", error);
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
