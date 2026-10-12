"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
  Settings,
  Loader2,
  Menu,
  LogIn,
} from "lucide-react";
import {
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
  onAddBookClick?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Topbar({
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
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 sm:gap-4 border-b border-[#0062CC]/60 bg-gradient-to-r from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white px-3 sm:px-8 py-2.5 sm:py-3 shadow-md select-none">
      {/* Brand Logo & Name (Idêntico à tela de login) */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 transition-transform hover:scale-[1.02] focus:outline-none shrink-0"
      >
        <Logo variant="icon" size="sm" />
        <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white">
          Tele<span className="text-blue-200">Books</span>
        </span>
      </Link>

      {/* Global Search Input */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200/90 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar livros, autores, editoras..."
          className="w-full rounded-full border border-white/20 bg-white/15 focus:bg-white text-xs sm:text-sm text-white focus:text-[#0F172A] placeholder:text-blue-100/75 focus:placeholder:text-[#94A3B8] pl-10 pr-12 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 pointer-events-none">
          <kbd className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative h-9 w-9 hidden sm:flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-400" />
        </button>

        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors"
          aria-label="Alternar tema"
          title={`Tema: ${theme === "dark" ? "Escuro" : "Claro"}`}
        >
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-blue-200" />
          ) : (
            <Sun className="h-4 w-4 text-amber-300" />
          )}
        </button>

        {/* Avatar Capsule (discreto no desktop) */}
        {user && (
          <div
            onClick={() => router.push("/perfil")}
            role="button"
            tabIndex={0}
            className="hidden md:flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 transition-colors cursor-pointer"
            title="Ver Meu Perfil"
          >
            <div className="h-7 w-7 rounded-full bg-white text-[#006CEB] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {initials}
            </div>
            <span className="text-xs font-semibold text-white max-w-[100px] truncate">
              {displayName.split(" ")[0]}
            </span>
          </div>
        )}

        {/* Botão de 3 Barrinhas (Menu / Mais Opções) */}
        <Dropdown>
          <DropdownTrigger>
            <button
              type="button"
              aria-label="Mais opções e conta"
              title="Menu"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Menu className="h-5 w-5 stroke-[2.2]" />
            </button>
          </DropdownTrigger>
          <DropdownMenu align="right" className="top-full mt-2 w-56">
            {user ? (
              <>
                <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        @{displayUsername}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] dark:text-[#64748B] truncate">
                    {user.email}
                  </p>
                </div>

                <DropdownItem
                  icon={<User className="h-4 w-4 text-[#007BFF]" />}
                  onClick={() => router.push("/perfil")}
                >
                  Meu Perfil
                </DropdownItem>
                <DropdownItem
                  icon={<Settings className="h-4 w-4 text-slate-500" />}
                  onClick={() => router.push("/perfil")}
                >
                  Configurações
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem
                  danger
                  icon={
                    isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )
                  }
                  onClick={handleSignOut}
                >
                  Sair da Conta
                </DropdownItem>
              </>
            ) : (
              <DropdownItem
                icon={<LogIn className="h-4 w-4 text-[#007BFF]" />}
                onClick={() => router.push("/login")}
              >
                Entrar / Cadastrar
              </DropdownItem>
            )}
          </DropdownMenu>
        </Dropdown>
      </div>
    </header>
  );
}
