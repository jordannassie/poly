import { sportsSidebarItems } from "@/lib/mockData";
import {
  Activity,
  Award,
  Bike,
  Dumbbell,
  Flag,
  Gamepad2,
  Trophy,
} from "lucide-react";

const iconMap = [
  Activity,
  Trophy,
  Award,
  Dumbbell,
  Flag,
  Bike,
  Gamepad2,
];

export function SportsSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col gap-4 w-64">
      <div className="rounded-2xl border border-white/10 bg-[#111a27] p-4">
        <div className="text-xs uppercase text-white/40 mb-3">All Sports</div>
        <div className="space-y-2">
          {sportsSidebarItems.map((item, index) => {
            const Icon = iconMap[index % iconMap.length];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-white/40" />
                  {item.label}
                </div>
                <span className="text-xs text-white/40">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
