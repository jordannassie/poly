/**
 * GET /api/profile/[username]
 * 
 * Fetch a public profile by username.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: { username: string };
}

export async function GET(request: NextRequest, { params }: Props) {
  const { username } = params;
  
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  
  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  
  try {
    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    
    if (error) {
      console.error("Profile fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Only return public profile info
    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        website: profile.website,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        is_public: profile.is_public,
        created_at: profile.created_at,
      }
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
