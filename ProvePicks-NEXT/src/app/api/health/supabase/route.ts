/**
 * GET /api/health/supabase
 * 
 * Health check endpoint to verify Supabase configuration and storage accessibility.
 * Returns diagnostic information about:
 * - Environment variable configuration
 * - Storage bucket accessibility
 * - Public URL construction
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthCheckResponse {
  timestamp: string;
  env_next_public_supabase_url: string | null;
  env_supabase_url_present: boolean;
  derived_project_host: string | null;
  storage_test_url: string | null;
  storage_fetch_status: number | string | null;
  storage_fetch_ok: boolean;
  storage_content_type: string | null;
  storage_content_length: string | null;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  
  // Derive project host from URL
  let derivedHost: string | null = null;
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      derivedHost = url.hostname;
    } catch {
      derivedHost = "INVALID_URL";
    }
  }

  // Build test URL to a known file path
  const testFilePath = "logos/images-1.png";
  const storageTestUrl = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/SPORTS/${testFilePath}`
    : null;

  // Test storage accessibility
  let fetchStatus: number | string | null = null;
  let fetchOk = false;
  let contentType: string | null = null;
  let contentLength: string | null = null;

  if (storageTestUrl) {
    try {
      const response = await fetch(storageTestUrl, {
        method: "HEAD",
        cache: "no-store",
      });
      
      fetchStatus = response.status;
      fetchOk = response.ok;
      contentType = response.headers.get("content-type");
      contentLength = response.headers.get("content-length");
    } catch (error) {
      fetchStatus = error instanceof Error ? error.message : "Unknown fetch error";
      fetchOk = false;
    }
  }

  const response: HealthCheckResponse = {
    timestamp: new Date().toISOString(),
    env_next_public_supabase_url: supabaseUrl,
    env_supabase_url_present: !!supabaseUrl,
    derived_project_host: derivedHost,
    storage_test_url: storageTestUrl,
    storage_fetch_status: fetchStatus,
    storage_fetch_ok: fetchOk,
    storage_content_type: contentType,
    storage_content_length: contentLength,
  };

  // Return with appropriate status
  const httpStatus = fetchOk ? 200 : supabaseUrl ? 503 : 500;
  
  return NextResponse.json(response, { status: httpStatus });
}
