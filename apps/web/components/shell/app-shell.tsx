"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";

export interface AppShellProps {
  children: React.ReactNode;
  onAddBookClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  bookCount?: number;
  readingCount?: number;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function AppShell({
  children,
  onAddBookClick = () => {},
  searchQuery = "",
  onSearchChange = () => {},
  bookCount,
  readingCount,
  currentTab: controlledTab,
  onSelectTab: controlledOnSelectTab,
}: AppShellProps) {
  const [internalTab, setInternalTab] = useState("home");
  const currentTab = controlledTab ?? internalTab;
  const onSelectTab = controlledOnSelectTab ?? setInternalTab;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        bookCount={bookCount}
        readingCount={readingCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onAddBookClick={onAddBookClick}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        readingCount={readingCount}
      />
    </div>
  );
}
