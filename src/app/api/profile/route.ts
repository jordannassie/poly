/**
 * Profile API endpoints
 * 
 * GET /api/profile - Get current user's full profile
 * PATCH /api/profile - Update profile fields (display_name, etc.)
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

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ profile });
}

// Username validation
function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }
  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 20) {
    return { valid: false, error: "Username must be at most 20 characters" };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, error: "Username can only contain lowercase letters, numbers, and underscores" };
  }
  return { valid: true };
}

export async function PATCH(request: NextRequest) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const { username, display_name, bio, website, avatar_url, banner_url } = body;
    
    // Only allow updating specific fields
    const updates: Record<string, unknown> = {};
    
    // Handle username update with validation
    if (username !== undefined) {
      const normalizedUsername = username.toLowerCase().trim();
      const validation = validateUsername(normalizedUsername);
      
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      // Check if username is taken by another user
      const { data: existingUser } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .neq("id", userId)
        .maybeSingle();
      
      if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
      
      updates.username = normalizedUsername;
    }
    
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (website !== undefined) updates.website = website;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    
    // Always update updated_at
    updates.updated_at = new Date().toISOString();
    
    if (Object.keys(updates).length <= 1) { // Only updated_at
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    
    const { data: profile, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ profile, success: true });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
