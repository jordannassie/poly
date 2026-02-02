"use client";

import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { LightningLoader } from "@/components/ui/LightningLoader";

interface Team {
  teamId: number;
  name: string;
  city: string;
  fullName: string;
  abbreviation: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  conference: string;
  division: string;
}

interface TeamsResponse {
  league: string;
  source?: string;
  count: number;
  expectedCount?: number;
  isMissingTeams?: boolean;
  syncRequired?: boolean;
  message?: string;
  teams: Team[];
}

interface TeamLogoGridProps {
  league?: string;
}

export function TeamLogoGrid({ league = "nfl" }: TeamLogoGridProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("sportsdataio");
  const [isMissingTeams, setIsMissingTeams] = useState(false);
  const [syncRequired, setSyncRequired] = useState(false);

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true);
        setError(null);
        setSyncRequired(false);
        
        const res = await fetch(`/api/sports/teams?league=${league}`);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to fetch teams: ${res.status}`);
        }
        
        const data: TeamsResponse = await res.json();
        setTeams(data.teams);
        setSource(data.source || "sportsdataio");
        setIsMissingTeams(data.isMissingTeams || false);
        setSyncRequired(data.syncRequired || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teams");
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, [league]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LightningLoader size="md" text="Loading teams..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        {syncRequired ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-pulse text-4xl">⏳</div>
            <p className="text-[color:var(--text-muted)]">
              Teams syncing...
            </p>
            <p className="text-sm text-[color:var(--text-subtle)]">
              {league.toUpperCase()} teams will appear once synced from the Admin panel.
            </p>
          </div>
        ) : (
          <p className="text-[color:var(--text-muted)]">
            No teams found for {league.toUpperCase()}
          </p>
        )}
      </div>
    );
  }

  // Group teams by conference if available, otherwise by first letter of name
  const groupTeams = () => {
    const groups = new Map<string, Team[]>();
    
    for (const team of teams) {
      // Use conference if available, otherwise use first letter
      const groupKey = team.conference || team.name.charAt(0).toUpperCase();
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(team);
    }
    
    // Sort groups: known conferences first, then alphabetically
    const knownConferences = ["AFC", "NFC", "Eastern", "Western", "American", "National"];
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const aIndex = knownConferences.indexOf(a);
      const bIndex = knownConferences.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    return sortedKeys.map(key => ({
      name: key,
      teams: groups.get(key)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  };

  const teamGroups = groupTeams();

  return (
    <div className="space-y-8">
      {teamGroups.map((group) => (
        <div key={group.name}>
          <h3 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">
            {group.name}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {group.teams.map((team) => (
              <TeamCard key={team.teamId} team={team} />
            ))}
          </div>
        </div>
      ))}

      {/* Missing Teams Warning */}
      {isMissingTeams && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Some teams may be missing from the cache. Re-sync teams in Admin → API Sports (NFL).
        </div>
      )}

      {/* Data Source */}
      <div className="mt-6 text-center text-xs text-[color:var(--text-subtle)]">
        Data provided by {
          source === "api-sports-cache" || source === "sports-teams-cache" 
            ? "API-Sports (cached)" 
            : "SportsDataIO"
        }
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className="flex flex-col items-center p-3 rounded-xl bg-[color:var(--surface)] border border-[color:var(--border-soft)] hover:border-[color:var(--border-strong)] transition cursor-pointer"
      title={team.fullName}
    >
      <div 
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-2 overflow-hidden"
        style={{ 
          backgroundColor: team.primaryColor || "var(--surface-2)",
        }}
      >
        {team.logoUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logoUrl}
            alt={team.fullName}
            width={40}
            height={40}
            className="object-contain w-10 h-10"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span 
            className="text-white font-bold text-sm"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {team.abbreviation}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-[color:var(--text-strong)] text-center">
        {team.abbreviation}
      </span>
      <span className="text-xs text-[color:var(--text-muted)] text-center truncate w-full">
        {team.name}
      </span>
    </div>
  );
}
