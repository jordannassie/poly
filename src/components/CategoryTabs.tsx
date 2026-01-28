import Link from "next/link";
import { categories } from "@/lib/mockData";
import { Badge } from "./ui/badge";

type CategoryTabsProps = {
  activeLabel?: string;
};

export function CategoryTabs({ activeLabel }: CategoryTabsProps) {
  return (
    <div className="border-b border-white/5 bg-[#0b1320]">
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {categories.map((category) => {
            const isActive = category.label === activeLabel;
            return (
              <Link key={category.label} href={category.href}>
                <Badge
                  className={`rounded-full border ${
                    isActive
                      ? "bg-white/15 text-white border-white/20"
                      : "bg-transparent text-white/60 border-white/10 hover:text-white hover:border-white/30"
                  }`}
                >
                  {category.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
