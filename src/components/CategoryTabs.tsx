import Link from "next/link";
import { Badge } from "./ui/badge";
import { categoryTabs } from "@/config/sports";
import { Lock } from "lucide-react";

type CategoryTabsProps = {
  activeLabel?: string;
};

export function CategoryTabs({ activeLabel }: CategoryTabsProps) {
  return (
    <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]">
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-3 md:px-4 py-2 md:py-3 scrollbar-hide">
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
          {categoryTabs.map((category) => {
            const isActive = category.label === activeLabel;
            const isEnabled = category.enabled;

            if (isEnabled) {
              return (
                <Link key={category.label} href={category.href}>
                  <Badge
                    className={`rounded-full border cursor-pointer ${
                      isActive
                        ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)] border-[color:var(--border-strong)]"
                        : "bg-transparent text-[color:var(--text-muted)] border-[color:var(--border-soft)] hover:text-[color:var(--text-strong)] hover:border-[color:var(--border-strong)]"
                    }`}
                  >
                    {category.label}
                  </Badge>
                </Link>
              );
            }

            // Disabled category - greyed out, not clickable
            return (
              <Badge
                key={category.label}
                className="rounded-full border cursor-not-allowed opacity-40 bg-transparent text-[color:var(--text-subtle)] border-[color:var(--border-soft)] flex items-center gap-1"
                title="Coming soon"
              >
                {category.label}
                <Lock className="h-2.5 w-2.5" />
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
