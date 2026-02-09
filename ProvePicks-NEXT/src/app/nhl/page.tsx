import { redirect } from "next/navigation";

// Redirect /nhl to /sports?league=nhl for consistency
export default function NHLPage() {
  redirect("/sports?league=nhl");
}
