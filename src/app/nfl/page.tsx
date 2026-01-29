import { redirect } from "next/navigation";

// Redirect /nfl to /sports?league=nfl for consistency with other leagues
export default function NFLPage() {
  redirect("/sports?league=nfl");
}
