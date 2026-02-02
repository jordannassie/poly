"use client";

import { useState } from "react";
import { MessageSquare, TrendingUp } from "lucide-react";

interface TeamTabsProps {
  teamName: string;
  primaryColor: string;
}

type TabId = "feed" | "picks";

/**
 * Team Tabs Component
 * 
 * Tab navigation for team community content.
 */
export function TeamTabs({ teamName, primaryColor }: TeamTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("feed");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <MessageSquare className="h-4 w-4" /> },
    { id: "picks", label: "Picks", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[color:var(--border-soft)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition relative ${
              activeTab === tab.id
                ? "text-[color:var(--text-strong)]"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: primaryColor }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-8">
        {activeTab === "feed" && (
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No posts yet"
            description={`Be the first to post in the ${teamName} community`}
          />
        )}
        {activeTab === "picks" && (
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No picks yet"
            description={`No predictions have been made for ${teamName} games`}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[color:var(--text-subtle)] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[color:var(--text-strong)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[color:var(--text-muted)] max-w-sm">
        {description}
      </p>
    </div>
  );
}
