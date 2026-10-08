"use client";

import React from "react";
import { Home, Library, BookmarkCheck, FolderHeart, BarChart3 } from "lucide-react";
import { cn } from "@telebooks/ui";

export interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  readingCount?: number;
}

export function BottomNav({
  currentTab,
  onSelectTab,
  readingCount = 2,
}: BottomNavProps) {
  const tabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "library", label: "Biblioteca", icon: Library },
    {
      id: "reading",
      label: "Lendo",
      icon: BookmarkCheck,
      badge: readingCount,
    },
    { id: "collections", label: "Coleções", icon: FolderHeart },
    { id: "stats", label: "Métricas", icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-md px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 min-w-[56px] select-none",
                isActive
                  ? "text-[#007BFF] font-semibold"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.3]")} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 h-3.5 min-w-[14px] px-1 rounded-full bg-[#007BFF] text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-[#007BFF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
