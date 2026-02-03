import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTeamBySlug } from "@/lib/teams/getTeamBySlug";
import { TopNav } from "@/components/TopNav";
import { MainFooter } from "@/components/MainFooter";
import { TeamBanner } from "@/components/TeamBanner";
import { TeamTabs } from "@/components/TeamTabs";

interface TeamPageProps {
  params: {
    league: string;
    team: string;
  };
}

/**
 * Generate metadata for team pages
 */
export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const team = await getTeamBySlug(params.league, params.team);
  
  if (!team) {
    return {
      title: "Team Not Found | ProvePicks",
    };
  }

  return {
    title: `${team.name} | ${team.league} | ProvePicks`,
    description: `Join the ${team.name} community. Discuss games, share picks, and connect with fellow fans.`,
    openGraph: {
      title: `${team.name} Community`,
      description: `${team.league} team community on ProvePicks`,
      images: team.logoUrl ? [team.logoUrl] : undefined,
    },
  };
}

/**
 * Team Community Page
 * 
 * Reddit-style team page with banner, logo, and community tabs.
 * 
 * Route: /teams/[league]/[team]
 * Example: /teams/nfl/new-england-patriots
 */
export default async function TeamPage({ params }: TeamPageProps) {
  const { league, team: teamSlug } = params;
  
  // Fetch team data from cache
  const team = await getTeamBySlug(league, teamSlug);

  // Show friendly message if team not found (not a hard 404)
  if (!team) {
    return (
      <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
        <TopNav />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🏈</div>
          <h1 className="text-2xl font-bold mb-2">Team Not Found</h1>
          <p className="text-[color:var(--text-muted)] mb-6">
            We couldn't find a team matching "{teamSlug}" in {league.toUpperCase()}.
          </p>
          <a 
            href={`/sports?league=${league}`}
            className="text-[color:var(--accent)] hover:underline"
          >
            Browse all {league.toUpperCase()} teams →
          </a>
        </div>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--text-strong)]">
      <TopNav />

      {/* Team Banner with Logo */}
      <TeamBanner
        teamId={team.id}
        teamName={team.name}
        league={team.league}
        logoUrl={team.logoUrl}
        primaryColor={team.primaryColor}
      />

      {/* Community Tabs */}
      <TeamTabs
        teamName={team.name}
        teamId={team.apiTeamId}
        league={team.league}
        primaryColor={team.primaryColor}
      />

      <MainFooter />
    </div>
  );
}
