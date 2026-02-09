/**
 * POST /api/profile/upload
 * 
 * Upload avatar or banner image to Supabase Storage.
 * Accepts multipart form data with 'file' and 'type' (avatar|banner).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

const WALLET_SESSION_COOKIE = "pp_wallet_session";

interface WalletSession {
  userId: string;
  expiresAt: string;
}

function getCurrentUserId(): string | null {
  try {
    const cookieStore = cookies();
    const walletSessionCookie = cookieStore.get(WALLET_SESSION_COOKIE);
    
    if (walletSessionCookie?.value) {
      const session: WalletSession = JSON.parse(walletSessionCookie.value);
      if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
        return session.userId;
      }
    }
  } catch {
    // Invalid session
  }
  return null;
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    if (!type || !["avatar", "banner"].includes(type)) {
      return NextResponse.json({ error: "Invalid type. Must be 'avatar' or 'banner'" }, { status: 400 });
    }
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Must be JPEG, PNG, GIF, or WebP" }, { status: 400 });
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 });
    }
    
    // Determine bucket and path - use existing SPORTS bucket
    const bucket = "SPORTS";
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${ext}`;
    const filePath = `${type}s/${userId}/${filename}`;
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    
    // Get signed URL (works even if bucket is private) - valid for 1 year
    const { data: signedData, error: signedError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
    
    let publicUrl: string;
    if (signedError || !signedData?.signedUrl) {
      // Fallback to public URL if signed URL fails
      const { data: urlData } = adminClient.storage
        .from(bucket)
        .getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    } else {
      publicUrl = signedData.signedUrl;
    }
    
    // Update profile with new URL
    const updateField = type === "avatar" ? "avatar_url" : "banner_url";
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ [updateField]: publicUrl })
      .eq("id", userId);
    
    if (updateError) {
      console.error("Profile update error:", updateError);
      // Don't fail - file was uploaded successfully
    }
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
