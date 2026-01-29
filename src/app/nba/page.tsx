import { redirect } from "next/navigation";

// Redirect /nba to /sports?league=nba for consistency
export default function NBAPage() {
  redirect("/sports?league=nba");
}
