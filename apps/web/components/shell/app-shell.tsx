"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { useAuth } from "../auth/auth-provider";
import { api } from "../../lib/api";

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
  bookCount: controlledBookCount,
  readingCount: controlledReadingCount,
  currentTab: controlledTab,
  onSelectTab: controlledOnSelectTab,
}: AppShellProps) {
  const { user } = useAuth();
  const [internalTab, setInternalTab] = useState("home");
  const [fetchedCounts, setFetchedCounts] = useState<{
    totalBooks?: number;
    readingCount?: number;
  }>({});

  useEffect(() => {
    if (!user) return;
    if (controlledBookCount !== undefined && controlledReadingCount !== undefined) return;

    let isMounted = true;
    api
      .getDashboard()
      .then((data) => {
        if (isMounted) {
          setFetchedCounts({
            totalBooks: data.total_books,
            readingCount: data.reading_books_count,
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, controlledBookCount, controlledReadingCount]);

  const currentTab = controlledTab ?? internalTab;
  const onSelectTab = controlledOnSelectTab ?? setInternalTab;
  const bookCount = controlledBookCount ?? fetchedCounts.totalBooks;
  const readingCount = controlledReadingCount ?? fetchedCounts.readingCount;

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

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-28 sm:pb-32 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        readingCount={readingCount}
        onAddBookClick={onAddBookClick}
      />
    </div>
  );
}
