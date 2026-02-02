/**
 * Supabase Storage helpers
 * 
 * Utility functions for uploading and managing files in Supabase Storage.
 */

import { SupabaseClient } from "@supabase/supabase-js";

const SPORTS_BUCKET = "SPORTS";

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Upload a team logo to Supabase Storage
 * 
 * @param adminClient - Supabase client with service role access
 * @param league - League identifier (e.g., "NFL", "NBA")
 * @param apiTeamId - Team ID from API-Sports
 * @param imageBuffer - Image data as Uint8Array
 * @param contentType - MIME type of the image
 * @returns UploadResult with success status and path/URL
 */
export async function uploadTeamLogo(
  adminClient: SupabaseClient,
  league: string,
  apiTeamId: number,
  imageBuffer: Uint8Array,
  contentType: string = "image/png"
): Promise<UploadResult> {
  const path = `logos/teams/${league.toLowerCase()}/${apiTeamId}.png`;

  try {
    const { data, error } = await adminClient.storage
      .from(SPORTS_BUCKET)
      .upload(path, imageBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`Failed to upload logo for ${league} team ${apiTeamId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = adminClient.storage
      .from(SPORTS_BUCKET)
      .getPublicUrl(path);

    return {
      success: true,
      path,
      publicUrl: urlData.publicUrl,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error uploading logo for ${league} team ${apiTeamId}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Download an image from a URL
 * 
 * @param url - URL of the image to download
 * @returns Uint8Array of image data or null if failed
 */
export async function downloadImage(url: string): Promise<{
  buffer: Uint8Array;
  contentType: string;
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // Some servers require a user agent
        "User-Agent": "ProvePicks/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Failed to download image from ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    return { buffer, contentType };
  } catch (err) {
    console.error(`Error downloading image from ${url}:`, err);
    return null;
  }
}

/**
 * Get the public URL for a team logo stored in Supabase Storage
 * 
 * @param logoPath - Path to the logo in storage (e.g., "logos/teams/nfl/1.png")
 * @returns Full public URL
 */
export function getStoragePublicUrl(logoPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return "";
  }
  return `${supabaseUrl}/storage/v1/object/public/${SPORTS_BUCKET}/${logoPath}`;
}
