"use client";

import { useParams } from "next/navigation";
import { SportGamePage } from "@/components/sports/SportGamePage";

export default function NHLGamePage() {
  const params = useParams();
  const gameId = (params as any)?.gameId as string | undefined;

  if (!gameId) {
    return null;
  }
  
  return <SportGamePage league="nhl" gameId={gameId} />;
}
