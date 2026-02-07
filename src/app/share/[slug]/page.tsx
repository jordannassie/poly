"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PicksCard, PicksCardData } from "@/components/picks-card/PicksCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, CheckCircle, Twitter, Facebook } from "lucide-react";

interface MarketData {
  slug: string;
  title: string;
  league: string;
  startTime: string;
  team1: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    color: string;
    probability: number;
  };
  team2: {
    name: string;
    abbr: string;
    logoUrl: string | null;
    color: string;
    probability: number;
  };
}

export default function SharePage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch market data
  useEffect(() => {
    if (!slug) return;
    
    async function fetchMarket() {
      try {
        // Fetch from markets API using slug
        const res = await fetch(`/api/admin/markets?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("Market not found");
        
        const data = await res.json();
        const m = data.markets?.[0];
        
        if (!m) throw new Error("Market not found");
        
        // Transform to our MarketData format
        const marketData: MarketData = {
          slug: m.slug,
          title: m.title || m.question || "Market",
          league: m.league || m.category || "sports",
          startTime: m.closes_at || m.starts_at || new Date().toISOString(),
          team1: {
            name: m.homeTeam || m.option_a_label || "Team A",
            abbr: (m.homeTeam || m.option_a_label || "A").slice(0, 3).toUpperCase(),
            logoUrl: m.homeTeamLogoUrl || null,
            color: "#1e40af",
            probability: m.option_a_probability || 50,
          },
          team2: {
            name: m.awayTeam || m.option_b_label || "Team B",
            abbr: (m.awayTeam || m.option_b_label || "B").slice(0, 3).toUpperCase(),
            logoUrl: m.awayTeamLogoUrl || null,
            color: "#991b1b",
            probability: m.option_b_probability || 50,
          },
        };
        
        setMarket(marketData);
      } catch (err) {
        console.error("[SharePage] Error fetching market:", err);
        setError(err instanceof Error ? err.message : "Failed to load market");
      } finally {
        setLoading(false);
      }
    }
    
    fetchMarket();
  }, [slug]);
  
  // Copy link handler
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/market/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [slug]);
  
  // Share to Twitter
  const handleShareTwitter = useCallback(() => {
    if (!market) return;
    const url = `${window.location.origin}/market/${slug}`;
    const text = `Check out this pick on ProvePicks: ${market.title}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  }, [market, slug]);
  
  // Share to Facebook
  const handleShareFacebook = useCallback(() => {
    const url = `${window.location.origin}/market/${slug}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank"
    );
  }, [slug]);
  
  // Format date for display
  const formatLocksIn = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center">
        <div className="text-[color:var(--text-muted)]">Loading...</div>
      </div>
    );
  }
  
  if (error || !market) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] flex flex-col items-center justify-center gap-4">
        <div className="text-[color:var(--text-muted)]">{error || "Market not found"}</div>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }
  
  // Build PicksCardData
  const cardData: PicksCardData = {
    league: market.league,
    eventTitle: market.title,
    teamA: {
      name: market.team1.name,
      abbr: market.team1.abbr,
      logoUrl: market.team1.logoUrl,
      odds: Math.round(market.team1.probability),
      color: market.team1.color,
    },
    teamB: {
      name: market.team2.name,
      abbr: market.team2.abbr,
      logoUrl: market.team2.logoUrl,
      odds: Math.round(market.team2.probability),
      color: market.team2.color,
    },
    selectedTeam: "teamA", // Default selection for share page
    locksIn: formatLocksIn(market.startTime),
    userHandle: "Guest",
  };
  
  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      {/* Header */}
      <header className="border-b border-[color:var(--border-soft)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/market/${slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Share Pick</h1>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Card Preview */}
        <div className="flex justify-center mb-8">
          <PicksCard data={cardData} />
        </div>
        
        {/* Share Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[color:var(--text-muted)] text-center">
            Share this pick
          </h2>
          
          {/* Copy Link */}
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
          
          {/* Social Share Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleShareTwitter}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Twitter className="h-4 w-4" />
              Share on X
            </Button>
            <Button
              onClick={handleShareFacebook}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Facebook className="h-4 w-4" />
              Share on FB
            </Button>
          </div>
          
          {/* View Market Link */}
          <div className="pt-4 text-center">
            <Link 
              href={`/market/${slug}`}
              className="text-sm text-[color:var(--accent)] hover:underline"
            >
              View full market details →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
