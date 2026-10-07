"use client";

import React from "react";
import { Search, Plus, BookOpen, Sun, Moon } from "lucide-react";
import { Button } from "@telebooks/ui";
import { useTheme } from "../theme-provider";

export interface TopbarProps {
  onAddBookClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Topbar({
  onAddBookClick,
  searchQuery,
  onSearchChange,
}: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#e7e3da] dark:border-[#272b35] bg-[#faf8f5]/85 dark:bg-[#111317]/85 backdrop-blur-md px-4 sm:px-8 py-3.5">
      {/* Mobile Brand Logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white">
          <BookOpen className="h-4 w-4" />
        </div>
        <span className="font-serif text-lg font-bold text-[#141618] dark:text-[#f3f4f6]">
          TeleBooks
        </span>
      </div>

      {/* Global Search Input */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por título, autor, ISBN ou gênero..."
          className="w-full rounded-xl border border-[#e2ddd3] dark:border-[#2b313d] bg-white dark:bg-[#181b22] pl-10 pr-12 py-2 text-xs sm:text-sm text-[#141618] dark:text-[#f0f2f5] placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] transition-all focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 pointer-events-none">
          <kbd className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#f0ebe1] dark:bg-[#252a35] text-[#6b7280] dark:text-[#9ca3af] border border-[#e0dad0] dark:border-[#313744]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Theme Toggle for Mobile */}
        <button
          type="button"
          onClick={toggleTheme}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-[#e5e0d8] dark:border-[#272b35] bg-white dark:bg-[#181b22] text-[#4b5563] dark:text-[#9ca3af]"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-blue-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </button>

        {/* Action Button: Add Book */}
        <Button
          onClick={onAddBookClick}
          variant="primary"
          size="sm"
          className="gap-1.5 text-xs sm:text-sm h-9 px-3.5 sm:px-4"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          <span>Adicionar Livro</span>
        </Button>
      </div>
    </header>
  );
}
