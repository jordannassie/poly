"use client";

import { useParams } from "next/navigation";
import { SportGamePage } from "@/components/sports/SportGamePage";

export default function MLBGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  return <SportGamePage league="mlb" gameId={gameId} />;
}
