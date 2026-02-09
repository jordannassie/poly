"use client";

import { useParams } from "next/navigation";
import { SportGamePage } from "@/components/sports/SportGamePage";

export default function SoccerGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  return <SportGamePage league="soccer" gameId={gameId} />;
}
