import { redirect } from "next/navigation";

// Redirect /soccer to /sports?league=soccer for consistency
export default function SoccerPage() {
  redirect("/sports?league=soccer");
}
