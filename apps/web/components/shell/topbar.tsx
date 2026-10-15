"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  Home,
  Library,
  Users,
  BookmarkCheck,
  Plus,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
  cn,
} from "@telebooks/ui";
import { useTheme } from "../theme-provider";
import { useAuth } from "../auth/auth-provider";
import { Logo } from "../ui/logo";
import { api } from "../../lib/api";
import type { NotificationItem } from "@telebooks/types";

export interface TopbarProps {
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  bookCount?: number;
  readingCount?: number;
  onAddBookClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Topbar({
  currentTab = "home",
  onSelectTab,
  bookCount,
  readingCount,
  onAddBookClick,
  searchQuery = "",
  onSearchChange = () => {},
}: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await signOut();
    router.push("/login");
  };

  // Estados de Notificações
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const loadNotificationsData = React.useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications(10, 0);
      setNotifications(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Ignora erro
    }
  }, [user]);

  React.useEffect(() => {
    loadNotificationsData();
    const interval = setInterval(loadNotificationsData, 30000);
    return () => clearInterval(interval);
  }, [loadNotificationsData]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsAsRead({ mark_all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignora erro
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      api.markNotificationsAsRead({ notification_ids: [notif.id] }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsNotificationsOpen(false);
    if (notif.post_id) {
      router.push(`/#post-${notif.post_id}`);
    }
  };

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || "Leitor";
  const displayUsername =
    profile?.username || user?.user_metadata?.username || "leitor";
  const initials = displayName.substring(0, 2).toUpperCase();

  // Estados ativos das 04 abas principais
  const isHomeActive = pathname === "/" && (currentTab === "home" || !currentTab);
  const isLibraryActive =
    pathname.startsWith("/minha-biblioteca") ||
    pathname.startsWith("/livros") ||
    currentTab === "library";
  const isCommunityActive =
    pathname.startsWith("/comunidade") || currentTab === "community";
  const isReadingActive =
    pathname.startsWith("/leitura-atual") || currentTab === "reading";

  const handleTabClick = (tabId: string, route: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    }
    if (pathname !== route) {
      router.push(route);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#0062CC]/60 bg-gradient-to-r from-[#006CEB] via-[#007BFF] to-[#0057C2] text-white shadow-md select-none transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
        
        {/* Lado Esquerdo: Logo e Marca TeleBooks */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            onClick={() => onSelectTab && onSelectTab("home")}
            className="inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02] focus:outline-none shrink-0"
          >
            <Logo variant="icon" size="sm" />
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white">
              Tele<span className="text-blue-200">Books</span>
            </span>
          </Link>
        </div>

        {/* Centro / Desktop: As 04 Abas Exclusivas do Sistema */}
        <nav
          aria-label="Navegação Principal"
          className="hidden md:flex items-center gap-1 bg-black/15 dark:bg-black/25 p-1 rounded-full border border-white/20 backdrop-blur-md shadow-inner shrink-0"
        >
          {/* 1. Aba Início */}
          <button
            type="button"
            onClick={() => handleTabClick("home", "/")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
              isHomeActive
                ? "bg-white text-[#006CEB] shadow-sm font-bold scale-[1.02]"
                : "text-white/85 hover:text-white hover:bg-white/15"
            )}
            title="Página Inicial e Recomendações"
          >
            <Home className={cn("h-4 w-4", isHomeActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>Início</span>
          </button>

          {/* 2. Aba Biblioteca */}
          <button
            type="button"
            onClick={() => handleTabClick("library", "/minha-biblioteca")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
              isLibraryActive
                ? "bg-white text-[#006CEB] shadow-sm font-bold scale-[1.02]"
                : "text-white/85 hover:text-white hover:bg-white/15"
            )}
            title="Minha Biblioteca e Estante Pessoal"
          >
            <Library className={cn("h-4 w-4", isLibraryActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>Biblioteca</span>
            {bookCount !== undefined && bookCount > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none tracking-tight",
                  isLibraryActive
                    ? "bg-blue-100 text-[#006CEB]"
                    : "bg-white/20 text-white"
                )}
              >
                {bookCount}
              </span>
            )}
          </button>

          {/* 3. Aba Comunidade */}
          <button
            type="button"
            onClick={() => handleTabClick("community", "/comunidade")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
              isCommunityActive
                ? "bg-white text-[#006CEB] shadow-sm font-bold scale-[1.02]"
                : "text-white/85 hover:text-white hover:bg-white/15"
            )}
            title="Comunidade de Leitores (Em Desenvolvimento)"
          >
            <Users className={cn("h-4 w-4", isCommunityActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>Comunidade</span>
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider leading-none",
                isCommunityActive
                  ? "bg-amber-100 text-amber-700"
                  : "bg-amber-400 text-slate-900"
              )}
            >
              Em Breve
            </span>
          </button>

          {/* 4. Aba Lendo */}
          <button
            type="button"
            onClick={() => handleTabClick("reading", "/leitura-atual")}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
              isReadingActive
                ? "bg-white text-[#006CEB] shadow-sm font-bold scale-[1.02]"
                : "text-white/85 hover:text-white hover:bg-white/15"
            )}
            title="Leituras em Andamento"
          >
            <BookmarkCheck className={cn("h-4 w-4", isReadingActive ? "stroke-[2.5]" : "stroke-[2]")} />
            <span>Lendo</span>
            {readingCount !== undefined && readingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none bg-rose-500 text-white animate-pulse">
                {readingCount}
              </span>
            )}
          </button>

          {/* 5. Aba Moderação (Admin) */}
          {profile?.role === "admin" && (
            <button
              type="button"
              onClick={() => handleTabClick("admin", "/admin")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 select-none cursor-pointer",
                pathname.startsWith("/admin")
                  ? "bg-amber-400 text-slate-900 shadow-sm font-bold scale-[1.02]"
                  : "bg-amber-400/20 text-amber-200 hover:text-white hover:bg-amber-400/30 border border-amber-300/30"
              )}
              title="Painel de Moderação de Livros"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Moderação</span>
            </button>
          )}
        </nav>

        {/* Global Search Input (Desktop expandido ou Tablet compacto) */}
        <div className="flex-1 max-w-xs relative hidden lg:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-200/90 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar títulos, autores..."
            className="w-full rounded-full border border-white/20 bg-white/15 focus:bg-white text-xs sm:text-sm text-white focus:text-[#0F172A] placeholder:text-blue-100/75 focus:placeholder:text-[#94A3B8] pl-9 pr-11 py-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:flex items-center pointer-events-none">
            <kbd className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Lado Direito: Ações de Usuário, Tema e Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão de Adicionar Livro (se fornecido callback) */}
          {onAddBookClick && (
            <button
              type="button"
              onClick={onAddBookClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#006CEB] hover:bg-blue-50 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Cadastrar Novo Livro"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Adicionar</span>
            </button>
          )}

          {/* Notificações (Desktop e Mobile) */}
          {user && (
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  if (!isNotificationsOpen) loadNotificationsData();
                }}
                className={cn(
                  "relative h-9 w-9 flex items-center justify-center rounded-full transition-all cursor-pointer border",
                  isNotificationsOpen
                    ? "bg-white text-[#006CEB] border-white shadow-md"
                    : "bg-white/15 hover:bg-white/25 text-white border-white/20 active:scale-95"
                )}
                aria-label="Notificações"
                title="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Popover / Dropdown de Notificações */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 text-slate-800 dark:text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Cabeçalho do Popover */}
                  <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        Notificações
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                          {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  {/* Lista de Notificações */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Nenhuma notificação por enquanto
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Você será avisado quando alguém curtir ou comentar suas publicações.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const actorName =
                          notif.actor?.full_name || notif.actor?.username || "Alguém";
                        const isLike = notif.type === "post_like";

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                              "flex items-start gap-3 p-3 transition-colors cursor-pointer text-left hover:bg-slate-50 dark:hover:bg-slate-800/60",
                              !notif.is_read && "bg-blue-50/40 dark:bg-blue-950/20"
                            )}
                          >
                            {/* Avatar com Badge de Ícone */}
                            <div className="relative shrink-0 mt-0.5">
                              {notif.actor?.avatar_url ? (
                                <img
                                  src={notif.actor.avatar_url}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                  {actorName.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span
                                className={cn(
                                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-xs",
                                  isLike ? "bg-rose-500 text-white" : "bg-blue-500 text-white"
                                )}
                              >
                                {isLike ? "❤️" : "💬"}
                              </span>
                            </div>

                            {/* Conteúdo da Notificação */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {actorName}
                                </span>{" "}
                                {isLike
                                  ? "curtiu sua publicação no feed."
                                  : "comentou na sua publicação."}
                              </p>
                              {notif.content && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                                  &ldquo;{notif.content}&rdquo;
                                </p>
                              )}
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-mono">
                                {new Date(notif.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            {/* Ponto indicador de não lida */}
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-1.5" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Rodapé do Popover */}
                  <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center">
                    <Link
                      href="/notificacoes"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Ver todas as notificações →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alternador de Tema Claro / Escuro */}
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

          {/* Cápsula de Avatar do Usuário */}
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

          {/* Menu Dropdown de Opções / Conta */}
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
                  {profile?.role === "admin" && (
                    <DropdownItem
                      icon={<ShieldCheck className="h-4 w-4 text-amber-500" />}
                      onClick={() => router.push("/admin")}
                    >
                      Painel de Moderação
                    </DropdownItem>
                  )}
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
      </div>
    </header>
  );
}
