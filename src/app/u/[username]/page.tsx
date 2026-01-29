import { TopNav } from "@/components/TopNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MainFooter } from "@/components/MainFooter";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileByUsername, getUserStats } from "@/lib/profiles";
import { User, Globe, Trophy, Target, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering to avoid build-time Supabase calls
export const dynamic = 'force-dynamic';

type Props = {
  params: { username: string };
};

export default async function PublicProfilePage({ params }: Props) {
  const { username } = params;
  const profile = await getProfileByUsername(username);

  // User not found state
  if (!profile) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <CategoryTabs activeLabel="Trending" />
        <main className="mx-auto w-full max-w-4xl px-4 py-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-[color:var(--surface-2)] p-6 mb-6">
              <User className="h-12 w-12 text-[color:var(--text-muted)]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">User not found</h1>
            <p className="text-[color:var(--text-muted)] mb-6">
              The user @{username} doesn&apos;t exist or their profile is private.
            </p>
            <Link
              href="/"
              className="text-blue-500 hover:underline"
            >
              Go back home
            </Link>
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  // Get user stats
  // TODO: Wire to actual picks/trades tables when they exist
  const stats = await getUserStats(profile.id);

  const displayName = profile.display_name || profile.username || "Anonymous";

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />
      <CategoryTabs activeLabel="Trending" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Profile Header */}
        <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)] overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-yellow-500/20 h-24" />
          <CardContent className="p-6 -mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-24 w-24 rounded-full border-4 border-[color:var(--surface)] object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full border-4 border-[color:var(--surface)] bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-[color:var(--text-muted)]">@{profile.username}</p>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-[color:var(--text-strong)]">{profile.bio}</p>
            )}

            {/* Website */}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-blue-500 hover:underline"
              >
                <Globe className="h-4 w-4" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* Member since */}
            <p className="mt-4 text-sm text-[color:var(--text-muted)]">
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{stats.totalPicks}</div>
              <div className="text-sm text-[color:var(--text-muted)]">Total Picks</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.winRate}%</div>
              <div className="text-sm text-[color:var(--text-muted)]">Win Rate</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{stats.totalVolume}</div>
              <div className="text-sm text-[color:var(--text-muted)]">Volume</div>
            </CardContent>
          </Card>
          
          <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className={`text-2xl font-bold ${stats.profitLoss.startsWith('+') ? 'text-green-500' : stats.profitLoss.startsWith('-') ? 'text-red-500' : ''}`}>
                {stats.profitLoss}
              </div>
              <div className="text-sm text-[color:var(--text-muted)]">Profit/Loss</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
          <CardContent className="p-6 text-center text-[color:var(--text-muted)]">
            <p>No recent activity to show.</p>
            {/* TODO: Wire to actual picks/trades tables when they exist */}
          </CardContent>
        </Card>
      </main>
      <MainFooter />
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props) {
  const { username } = params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return {
      title: "User not found - ProvePicks",
      description: "This user profile does not exist or is private.",
    };
  }

  const displayName = profile.display_name || profile.username;
  return {
    title: `${displayName} (@${profile.username}) - ProvePicks`,
    description: profile.bio || `Check out ${displayName}'s profile on ProvePicks.`,
  };
}
