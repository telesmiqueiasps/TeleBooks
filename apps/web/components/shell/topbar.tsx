"use client";

import React from "react";
import { Search, Plus, Sun, Moon, Bell } from "lucide-react";
import { Button } from "@telebooks/ui";
import { useTheme } from "../theme-provider";
import { Logo } from "../ui/logo";

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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#e2e8f0] dark:border-[#1E293B] bg-white/85 dark:bg-[#0B0F1A]/85 backdrop-blur-md px-4 sm:px-8 py-3.5">
      {/* Mobile Brand Logo */}
      <div className="flex items-center md:hidden">
        <Logo size="xs" />
      </div>

      {/* Global Search Input */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar livros, autores, editoras..."
          className="w-full rounded-xl border border-[#e2e8f0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] pl-10 pr-12 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#f8fafc] placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] transition-all focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 pointer-events-none">
          <kbd className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#f0ebe1] dark:bg-[#252a35] text-[#6b7280] dark:text-[#9ca3af] border border-[#e0dad0] dark:border-[#313744]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative h-9 w-9 hidden sm:flex items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#007BFF]" />
        </button>

        {/* Quick Theme Toggle for Mobile */}
        <button
          type="button"
          onClick={toggleTheme}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8]"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-[#007BFF]" />
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
