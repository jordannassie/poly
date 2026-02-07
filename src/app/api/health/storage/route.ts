/**
 * GET /api/health/storage
 * 
 * Server-side probe to test Supabase Storage connectivity.
 * Compares SUPABASE_URL vs NEXT_PUBLIC_SUPABASE_URL and tests both.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StorageHealthResponse {
  timestamp: string;
  supabase_url: string | null;
  next_public_supabase_url: string | null;
  urls_match: boolean;
  test_path: string;
  test_url_server: string | null;
  test_url_public: string | null;
  status_server: number | string | null;
  status_public: number | string | null;
  ok_server: boolean;
  ok_public: boolean;
  error_server: string | null;
  error_public: string | null;
  content_type_server: string | null;
  content_type_public: string | null;
  content_length_server: string | null;
  content_length_public: string | null;
}

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || null;
  const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  
  const testPath = "logos/images-1.png";
  
  const testUrlServer = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/SPORTS/${testPath}`
    : null;
  const testUrlPublic = nextPublicSupabaseUrl
    ? `${nextPublicSupabaseUrl}/storage/v1/object/public/SPORTS/${testPath}`
    : null;

  const response: StorageHealthResponse = {
    timestamp: new Date().toISOString(),
    supabase_url: supabaseUrl,
    next_public_supabase_url: nextPublicSupabaseUrl,
    urls_match: supabaseUrl === nextPublicSupabaseUrl,
    test_path: testPath,
    test_url_server: testUrlServer,
    test_url_public: testUrlPublic,
    status_server: null,
    status_public: null,
    ok_server: false,
    ok_public: false,
    error_server: null,
    error_public: null,
    content_type_server: null,
    content_type_public: null,
    content_length_server: null,
    content_length_public: null,
  };

  // Test server URL (SUPABASE_URL)
  if (testUrlServer) {
    try {
      const res = await fetch(testUrlServer, {
        method: "HEAD",
        cache: "no-store",
      });
      response.status_server = res.status;
      response.ok_server = res.ok;
      response.content_type_server = res.headers.get("content-type");
      response.content_length_server = res.headers.get("content-length");
      if (!res.ok) {
        response.error_server = `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (error) {
      response.status_server = "FETCH_ERROR";
      response.error_server = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    response.error_server = "SUPABASE_URL not set";
  }

  // Test public URL (NEXT_PUBLIC_SUPABASE_URL)
  if (testUrlPublic) {
    try {
      const res = await fetch(testUrlPublic, {
        method: "HEAD",
        cache: "no-store",
      });
      response.status_public = res.status;
      response.ok_public = res.ok;
      response.content_type_public = res.headers.get("content-type");
      response.content_length_public = res.headers.get("content-length");
      if (!res.ok) {
        response.error_public = `HTTP ${res.status} ${res.statusText}`;
      }
    } catch (error) {
      response.status_public = "FETCH_ERROR";
      response.error_public = error instanceof Error ? error.message : "Unknown error";
    }
  } else {
    response.error_public = "NEXT_PUBLIC_SUPABASE_URL not set";
  }

  // Determine HTTP status code based on results
  const httpStatus = response.ok_server || response.ok_public ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}
