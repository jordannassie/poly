import { statsOverview } from "@/lib/mockData";
import { Card, CardContent } from "./ui/card";

type StatsPanelProps = {
  title?: string;
};

export function StatsPanel({ title = "Stats" }: StatsPanelProps) {
  return (
    <Card className="bg-[color:var(--surface)] border-[color:var(--border-soft)]">
      <CardContent className="p-6 space-y-4">
        <div className="text-lg font-semibold">{title}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statsOverview.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-4"
            >
              <div className="text-xs text-[color:var(--text-subtle)]">
                {stat.label}
              </div>
              <div className="text-xl font-semibold text-[color:var(--text-strong)]">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
