"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, AlertCircle } from "lucide-react";

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
  count: number;
  teams: Team[];
}

interface TeamLogoGridProps {
  league?: string;
}

export function TeamLogoGrid({ league = "nfl" }: TeamLogoGridProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/sports/teams?league=${league}`);
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Failed to fetch teams: ${res.status}`);
        }
        
        const data: TeamsResponse = await res.json();
        setTeams(data.teams);
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
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--text-muted)]" />
        <span className="ml-3 text-[color:var(--text-muted)]">Loading teams...</span>
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
      <div className="text-center py-12 text-[color:var(--text-muted)]">
        No teams found for {league.toUpperCase()}
      </div>
    );
  }

  // Group teams by conference
  const afcTeams = teams.filter((t) => t.conference === "AFC");
  const nfcTeams = teams.filter((t) => t.conference === "NFC");

  return (
    <div className="space-y-8">
      {/* AFC Teams */}
      {afcTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">
            AFC
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {afcTeams.map((team) => (
              <TeamCard key={team.teamId} team={team} />
            ))}
          </div>
        </div>
      )}

      {/* NFC Teams */}
      {nfcTeams.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[color:var(--text-strong)]">
            NFC
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {nfcTeams.map((team) => (
              <TeamCard key={team.teamId} team={team} />
            ))}
          </div>
        </div>
      )}
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
          <Image
            src={team.logoUrl}
            alt={team.fullName}
            width={40}
            height={40}
            className="object-contain"
            onError={() => setImgError(true)}
            unoptimized
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
