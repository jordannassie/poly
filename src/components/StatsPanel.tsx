import { statsOverview } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";

type StatsPanelProps = {
  title?: string;
};

export function StatsPanel({ title = "Stats" }: StatsPanelProps) {
  return (
    <Card className="bg-[#111a27] border-white/10">
      <CardContent className="p-6 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statsOverview.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-[#0b1320] p-4"
            >
              <div className="text-xs text-white/50">{stat.label}</div>
              <div className="text-xl font-semibold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
