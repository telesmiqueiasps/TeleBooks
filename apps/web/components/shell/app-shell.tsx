"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  onAddBookClick,
  searchQuery = "",
  onSearchChange = () => {},
  bookCount: controlledBookCount,
  readingCount: controlledReadingCount,
  currentTab: controlledTab,
  onSelectTab: controlledOnSelectTab,
}: AppShellProps) {
  const router = useRouter();
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

  const handleAddBook =
    onAddBookClick ||
    (() => {
      router.push("/minha-biblioteca?action=search");
    });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Faixa Superior com Logo, 04 Abas Exclusivas e Ações */}
      <Topbar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        bookCount={bookCount}
        readingCount={readingCount}
        onAddBookClick={handleAddBook}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      {/* Área Principal de Conteúdo em Largura Completa Centralizada */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 sm:pb-32 md:pb-12">
        {children}
      </main>

      {/* Navegação Mobile Inferior */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        readingCount={readingCount}
        onAddBookClick={handleAddBook}
      />
    </div>
  );
}
