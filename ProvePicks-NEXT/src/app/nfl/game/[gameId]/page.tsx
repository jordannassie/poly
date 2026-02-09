"use client";

import { useParams } from "next/navigation";
import { SportGamePage } from "@/components/sports/SportGamePage";

export default function NFLGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  return <SportGamePage league="nfl" gameId={gameId} />;
}
