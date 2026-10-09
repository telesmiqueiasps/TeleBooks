"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  BookmarkCheck,
  FolderHeart,
  BarChart3,
  Home,
  Sun,
  Moon,
  Library,
  Settings,
  LogOut,
  User,
  LogIn,
  Users,
  List,
} from "lucide-react";
import { Logo } from "../ui/logo";
import {
  NavItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@telebooks/ui";
import { useTheme } from "../theme-provider";
import { useAuth } from "../auth/auth-provider";

export interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  bookCount?: number;
  readingCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  bookCount = 128,
  readingCount = 2,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isHomeActive = pathname === "/" && (currentTab === "home" || !currentTab);
  const isLibraryActive = pathname.startsWith("/minha-biblioteca") || currentTab === "library";

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Leitor";
  const displayUsername = profile?.username || user?.user_metadata?.username || "leitor";
  const initials = displayName
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-gradient-to-b from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white border-r border-[#0062CC]/50 dark:border-[#004DB3]/60 h-screen sticky top-0 p-4 justify-between select-none shadow-xl shadow-[#007BFF]/10 z-20">
      <div className="space-y-6">
        {/* Brand Header */}
        <Link href="/" className="flex items-center px-2 pt-2 transition-transform hover:scale-[1.02]">
          <Logo size="md" theme="dark" />
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1">
          <NavItem
            variant="brand"
            label="Início"
            icon={<Home className="h-4 w-4" />}
            active={isHomeActive}
            onClick={() => {
              onSelectTab("home");
              if (pathname !== "/") router.push("/");
            }}
          />
          <NavItem
            variant="brand"
            label="Minha Biblioteca"
            icon={<Library className="h-4 w-4" />}
            active={isLibraryActive}
            badge={bookCount}
            onClick={() => {
              onSelectTab("library");
              if (!pathname.startsWith("/minha-biblioteca")) router.push("/minha-biblioteca");
            }}
          />
          <NavItem
            variant="brand"
            label="Estatísticas"
            icon={<BarChart3 className="h-4 w-4" />}
            active={currentTab === "stats"}
            onClick={() => onSelectTab("stats")}
          />
          <NavItem
            variant="brand"
            label="Listas"
            icon={<List className="h-4 w-4" />}
            active={currentTab === "lists"}
            onClick={() => onSelectTab("lists")}
          />
          <NavItem
            variant="brand"
            label="Comunidade"
            icon={<Users className="h-4 w-4" />}
            active={currentTab === "community"}
            onClick={() => onSelectTab("community")}
          />
          <NavItem
            variant="brand"
            label="Configurações"
            icon={<Settings className="h-4 w-4" />}
            active={currentTab === "settings"}
            onClick={() => onSelectTab("settings")}
          />
        </nav>
      </div>

      {/* Footer / Profile & Theme */}
      <div className="space-y-3 pt-4 border-t border-white/20">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-full text-xs font-semibold text-white/90 hover:bg-white/15 transition-colors"
        >
          <span className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon className="h-4 w-4 text-blue-200" />
            ) : (
              <Sun className="h-4 w-4 text-amber-300" />
            )}
            <span>Tema {theme === "dark" ? "Escuro" : "Claro"}</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-white/70 bg-white/15 px-2 py-0.5 rounded-full">
            Alternar
          </span>
        </button>

        {/* User Capsule */}
        {user ? (
          <div className="flex items-center gap-1.5 w-full">
            <div className="flex-1 min-w-0">
              <Dropdown>
                <DropdownTrigger className="w-full">
                  <div className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-full hover:bg-white/15 transition-colors w-full text-left">
                    <div className="h-8 w-8 rounded-full bg-white text-[#006CEB] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-blue-100/80 truncate">
                        @{displayUsername}
                      </p>
                    </div>
                  </div>
                </DropdownTrigger>
                <DropdownMenu align="left" className="bottom-full mb-2 w-56">
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
                  <DropdownItem danger icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
                    Encerrar Sessão
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>

            {/* Botão Direto de Logout */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Encerrar Sessão (Logout)"
              aria-label="Encerrar Sessão (Logout)"
              className="p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full p-2.5 rounded-full bg-white text-[#006CEB] hover:bg-white/90 text-xs font-bold shadow-md transition-all"
          >
            <LogIn className="h-4 w-4" />
            <span>Entrar / Cadastrar</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
