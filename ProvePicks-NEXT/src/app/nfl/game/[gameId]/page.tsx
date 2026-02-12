"use client";

import { useParams } from "next/navigation";
import { SportGamePage } from "@/components/sports/SportGamePage";

export default function NFLGamePage() {
  const params = useParams();
  const gameId = (params as any)?.gameId as string | undefined;

  if (!gameId) {
    return null;
  }
  
  return <SportGamePage league="nfl" gameId={gameId} />;
}
