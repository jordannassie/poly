import { redirect } from "next/navigation";

// Redirect /mlb to /sports?league=mlb for consistency
export default function MLBPage() {
  redirect("/sports?league=mlb");
}
