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

  // Show 404 if team not found
  if (!team) {
    notFound();
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
