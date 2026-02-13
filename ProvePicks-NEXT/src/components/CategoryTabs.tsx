import Link from "next/link";
import { Badge } from "./ui/badge";
import { categoryTabs } from "@/config/sports";
import AppIcon from "@/components/ui/AppIcon";

type CategoryTabsProps = {
  activeLabel?: string;
};

export function CategoryTabs({ activeLabel }: CategoryTabsProps) {
  return (
    <div className="border-b border-[color:var(--border-soft)] bg-[color:var(--surface)]">
      <div className="mx-auto w-full max-w-6xl overflow-x-auto px-3 md:px-4 py-2 md:py-3 scrollbar-hide">
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
          {categoryTabs
            .filter((category) => category.enabled)
            .map((category) => {
              const isActive = category.label === activeLabel;

              return (
                <Link key={category.label} href={category.href}>
                  <Badge
                    className={`rounded-full border cursor-pointer ${
                      isActive
                        ? "bg-[color:var(--surface-2)] text-[color:var(--text-strong)] border-[color:var(--border-strong)]"
                        : "bg-transparent text-[color:var(--text-muted)] border-[color:var(--border-soft)] hover:text-[color:var(--text-strong)] hover:border-[color:var(--border-strong)]"
                    }`}
                  >
                  {category.icon && (
                    <AppIcon name={category.icon} className="mr-2 opacity-80" size={16} />
                  )}
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
