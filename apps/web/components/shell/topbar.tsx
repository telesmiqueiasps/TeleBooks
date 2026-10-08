"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
  Settings,
  Loader2,
} from "lucide-react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@telebooks/ui";
import { useTheme } from "../theme-provider";
import { useAuth } from "../auth/auth-provider";
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
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push("/login");
  };

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || "Leitor";
  const displayUsername =
    profile?.username || user?.user_metadata?.username || "leitor";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 sm:gap-4 border-b border-[#e2e8f0] dark:border-[#1E293B] bg-white/85 dark:bg-[#0B0F1A]/85 backdrop-blur-md px-4 sm:px-8 py-3">
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
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative h-9 w-9 hidden sm:flex items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#007BFF]" />
        </button>

        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors"
          aria-label="Alternar tema"
          title={`Tema: ${theme === "dark" ? "Escuro" : "Claro"}`}
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
          className="gap-1.5 text-xs sm:text-sm h-9 px-3 sm:px-4"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          <span className="hidden xs:inline">Adicionar Livro</span>
          <span className="xs:hidden">Novo</span>
        </Button>

        {/* Divisor vertical */}
        <div className="h-6 w-[1px] bg-[#E2E8F0] dark:bg-[#1E293B] mx-0.5" />

        {/* Seção de Usuário & Botão de Logout */}
        {user ? (
          <div className="flex items-center gap-1.5">
            {/* Avatar Dropdown */}
            <Dropdown>
              <DropdownTrigger>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                  title="Menu do Perfil"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#007BFF] to-[#6366F1] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] max-w-[100px] truncate">
                    {displayName.split(" ")[0]}
                  </span>
                </div>
              </DropdownTrigger>
              <DropdownMenu align="right" className="top-full mt-2 w-56">
                <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                  <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                    @{displayUsername}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] dark:text-[#64748B] truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                <DropdownItem
                  icon={<User className="h-4 w-4" />}
                  onClick={() => router.push("/perfil")}
                >
                  Meu Perfil
                </DropdownItem>
                <DropdownItem
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => router.push("/perfil")}
                >
                  Configurações
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem
                  danger
                  icon={<LogOut className="h-4 w-4" />}
                  onClick={handleSignOut}
                >
                  Sair da Conta
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Botão Direto de Logout */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              title="Encerrar Sessão (Logout)"
              aria-label="Encerrar Sessão (Logout)"
              className="h-9 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 transition-all duration-150 active:scale-95 text-xs font-semibold select-none"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 shrink-0" />
              )}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="h-9 px-3 rounded-xl bg-[#007BFF] hover:bg-[#0066D6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}
