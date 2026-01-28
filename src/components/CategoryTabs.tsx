import Link from "next/link";
import { categories } from "@/lib/mockData";
import { Badge } from "./ui/badge";

type CategoryTabsProps = {
  activeLabel?: string;
};

export function CategoryTabs({ activeLabel }: CategoryTabsProps) {
  return (
    <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]">
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          {categories.map((category) => {
            const isActive = category.label === activeLabel;
            return (
              <Link key={category.label} href={category.href}>
                <Badge
                  className={`rounded-full border ${
                    isActive
                      ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)] border-[color:var(--border-strong)]"
                      : "bg-transparent text-[color:var(--text-muted)] border-[color:var(--border-soft)] hover:text-[color:var(--text-strong)] hover:border-[color:var(--border-strong)]"
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
