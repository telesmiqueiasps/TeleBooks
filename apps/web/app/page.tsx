"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Users,
  Building2,
  Flame,
  Clock,
  Sparkles,
  Plus,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Library,
  Star,
  PauseCircle,
  PlayCircle,
  Tag,
  Folder,
  Layers,
  AlertCircle,
  RefreshCw,
  Compass,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
} from "@telebooks/ui";
import type {
  Book,
  BookStatus,
  DashboardSummary,
  ReadingSession,
  UserBook,
} from "@telebooks/types";

import { AppShell } from "../components/shell/app-shell";
import { useAuth } from "../components/auth/auth-provider";
import { api } from "../lib/api";
import { BookFormModal } from "../components/catalog/book-form-modal";
import { ReadingSessionModal } from "../components/shelf/reading-session-modal";

const STATUS_LABELS: Record<
  BookStatus,
  { label: string; color: string; bg: string }
> = {
  want_to_read: {
    label: "Quero Ler",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  reading: {
    label: "Lendo",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  paused: {
    label: "Pausado",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  read: {
    label: "Lido",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  abandoned: {
    label: "Abandonado",
    color: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-500/10 border-neutral-500/20",
  },
};

export default function DashboardPage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modais de Ação Rápida
  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionTargetBook, setSessionTargetBook] = useState<UserBook | null>(null);

  // Redirecionamento de segurança
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [user, isAuthLoading, router]);

  // Carrega os dados analíticos agregados diretamente do banco
  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setApiError(null);
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err: unknown) {
      console.error("Erro ao carregar dashboard:", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar dados do dashboard.";
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      loadDashboard();
    }
  }, [user, isAuthLoading, loadDashboard]);

  // Saudação contextual por horário
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Leitor";

  const handleOpenSessionModal = (book: UserBook) => {
    setSessionTargetBook(book);
    setIsSessionModalOpen(true);
  };

  return (
    <AppShell
      currentTab="home"
      bookCount={dashboard?.total_books || 0}
      readingCount={dashboard?.reading_books_count || 0}
      onAddBookClick={() => setIsBookFormOpen(true)}
    >
      <div className="space-y-8 select-none">
        {/* =========================================================================
            CABEÇALHO EDITORIAL DO DASHBOARD
        ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#007BFF] uppercase tracking-wider">
                Painel do Leitor
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Visão Geral do Acervo
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              {greeting}, {displayName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Acompanhe suas estatísticas, continue leituras em andamento e descubra seu ritmo.
            </p>
          </div>

          {/* Ações Rápidas no Cabeçalho */}
          <div className="flex items-center gap-2 sm:self-center flex-wrap">
            <Link href="/minha-biblioteca">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs px-3.5"
                leftIcon={<Library className="w-4 h-4 text-[#007BFF]" />}
              >
                Minha Biblioteca
              </Button>
            </Link>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBookFormOpen(true)}
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="rounded-full shadow-sm shadow-[#007BFF]/25 font-semibold text-xs px-4 bg-[#007BFF] hover:bg-[#006CEB]"
            >
              Adicionar Livro
            </Button>
          </div>
        </div>

        {/* Feedback de Erro */}
        {apiError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{apiError}</span>
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              className="font-bold underline ml-4 hover:opacity-80"
            >
              Recarregar
            </button>
          </div>
        )}

        {/* =========================================================================
            ESTADO DE CARREGAMENTO (SKELETONS SUAVES)
        ========================================================================= */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
            <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-60 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-60 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          </div>
        ) : dashboard ? (
          <div className="space-y-8">
            {/* =========================================================================
                GRADE DE CARDS COM PRINCIPAIS MÉTRICAS (KPIS)
            ========================================================================= */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* 1. Total de Livros */}
              <Link href="/minha-biblioteca">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#007BFF]/40 hover:shadow-md transition-all group flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total de Livros
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#007BFF] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
                      {dashboard.total_books}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      no acervo <ArrowRight className="w-3 h-3 text-[#007BFF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>
              </Link>

              {/* 2. Autores Distintos */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Autores
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
                    {dashboard.total_authors}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    escritores catalogados
                  </p>
                </div>
              </div>

              {/* 3. Editoras Distintas */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Editoras
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
                    {dashboard.total_publishers}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    casas editoriais
                  </p>
                </div>
              </div>

              {/* 4. Livros Lidos */}
              <Link href="/minha-biblioteca?status=read">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 hover:shadow-md transition-all group flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Livros Lidos
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {dashboard.read_books_count}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        ({dashboard.completion_rate_percent}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      concluídos com sucesso
                    </p>
                  </div>
                </div>
              </Link>

              {/* 5. Livros em Andamento (Lendo Agora) */}
              <Link href="/leitura-atual">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md transition-all group flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Lendo Agora
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                      <BookmarkCheck className="w-4 h-4" />
                      {dashboard.reading_books_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="font-display text-2xl font-black text-amber-600 dark:text-amber-400">
                      {dashboard.reading_books_count}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      leituras ativas
                    </p>
                  </div>
                </div>
              </Link>

              {/* 6. Páginas Lidas */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between h-full shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Páginas Lidas
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
                    {dashboard.total_pages_read.toLocaleString("pt-BR")}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {dashboard.total_sessions_count} sessões • ~{dashboard.total_reading_minutes}m
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                HERO: CONTINUAR LEITURA EM ANDAMENTO (SE HOUVER)
            ========================================================================= */}
            {dashboard.active_readings.length > 0 && (
              <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50/70 to-blue-50/40 dark:from-[#0F172A] dark:via-slate-900 dark:to-blue-950/20 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                  {/* Informações do Livro em Destaque */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                    <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md border border-black/5 dark:border-white/10 shrink-0 relative">
                      {dashboard.active_readings[0]?.book?.cover_url ||
                      dashboard.active_readings[0]?.book?.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            dashboard.active_readings[0]?.book?.cover_url ||
                            dashboard.active_readings[0]?.book?.thumbnail_url ||
                            ""
                          }
                          alt={dashboard.active_readings[0]?.book?.title || "Capa"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-w-lg">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {STATUS_LABELS[dashboard.active_readings[0]?.status || "reading"].label}
                        </span>
                        <span className="text-xs text-slate-400">
                          Leitura em andamento
                        </span>
                      </div>

                      <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                        {dashboard.active_readings[0]?.book?.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {dashboard.active_readings[0]?.book?.authors?.map((a) => a.name).join(", ") ||
                          "Autor não informado"}
                      </p>

                      {/* Progresso de Páginas */}
                      {(() => {
                        const total = dashboard.active_readings[0]?.book?.page_count || 0;
                        const current = dashboard.active_readings[0]?.current_page || 0;
                        const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
                        return (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <span>Página {current} {total > 0 ? `de ${total}` : ""}</span>
                              <span className="text-[#007BFF]">{pct}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Ações Imediatas */}
                  <div className="flex items-center gap-3 shrink-0 self-center md:self-end flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSessionModal(dashboard.active_readings[0]!)}
                      leftIcon={<Plus className="w-4 h-4 text-[#007BFF]" />}
                      className="rounded-full text-xs font-semibold px-4"
                    >
                      Registrar Sessão
                    </Button>

                    <Link href="/leitura-atual">
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        className="rounded-full shadow-md shadow-[#007BFF]/25 font-semibold text-xs px-5 bg-[#007BFF] hover:bg-[#006CEB]"
                      >
                        Continuar Lendo
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                SEÇÃO: LIVROS ADICIONADOS RECENTEMENTE
            ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#007BFF]" />
                    Adicionados Recentemente ao Acervo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Últimas obras catalogadas na sua estante pessoal.
                  </p>
                </div>

                <Link
                  href="/minha-biblioteca"
                  className="text-xs font-semibold text-[#007BFF] hover:underline flex items-center gap-1 shrink-0"
                >
                  Ver acervo completo ({dashboard.total_books}) <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {dashboard.recently_added_books.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Você ainda não cadastrou nenhum livro na sua biblioteca.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsBookFormOpen(true)}
                    className="rounded-full text-xs"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Adicionar Primeiro Livro
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {dashboard.recently_added_books.map((ub) => {
                    const statusInfo = STATUS_LABELS[ub.status];
                    return (
                      <Link
                        key={ub.id}
                        href={`/livros/${ub.book_id}`}
                        className="group flex flex-col justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#007BFF]/40 hover:shadow-lg transition-all"
                      >
                        <div className="space-y-2">
                          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-sm">
                            {ub.book?.cover_url || ub.book?.thumbnail_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ub.book?.cover_url || ub.book?.thumbnail_url || ""}
                                alt={ub.book?.title || "Capa"}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <BookOpen className="w-6 h-6" />
                              </div>
                            )}

                            {/* Badge do Status na Capa */}
                            <span
                              className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md border ${statusInfo.bg} ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>

                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#007BFF] transition-colors">
                            {ub.book?.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {ub.book?.authors?.map((a) => a.name).join(", ") || "Autor"}
                          </p>
                        </div>

                        <div className="pt-2 text-[10px] text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/80 mt-2 flex items-center justify-between">
                          <span>
                            {new Date(ub.created_at).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          {ub.rating && (
                            <span className="text-amber-500 font-bold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              {Number(ub.rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =========================================================================
                DUAS COLUNAS: LEITURA RECENTE & DISTRIBUIÇÃO ANALÍTICA
            ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Coluna Esquerda: Sessões Recentes de Leitura */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#007BFF]" />
                      Leituras Recentes
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sessões e avanços registrados nos últimos dias.
                    </p>
                  </div>

                  <Link
                    href="/leitura-atual"
                    className="text-xs font-semibold text-[#007BFF] hover:underline flex items-center gap-1"
                  >
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {dashboard.recent_sessions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500">
                      Nenhuma sessão de leitura registrada ainda.
                    </p>
                    <Link href="/leitura-atual">
                      <Button variant="outline" size="sm" className="rounded-full text-xs mt-2">
                        Iniciar Sessão de Leitura
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                    {dashboard.recent_sessions.map((session) => {
                      const pagesRead = Math.max(0, session.end_page - session.start_page);
                      const mins = session.duration_seconds
                        ? Math.round(session.duration_seconds / 60)
                        : null;
                      const date = new Date(session.started_at);

                      return (
                        <div
                          key={session.id}
                          className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-11 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                              {session.book_cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={session.book_cover_url}
                                  alt={session.book_title || "Capa"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {session.book_title || "Livro"}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-bold text-[#007BFF]">
                                  +{pagesRead} págs
                                </span>
                                <span>(p.{session.start_page} → {session.end_page})</span>
                                {mins !== null && (
                                  <span>• {mins} min</span>
                                )}
                              </div>
                              {session.notes && (
                                <p className="text-[11px] text-slate-400 italic truncate max-w-xs">
                                  &ldquo;{session.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {date.toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna Direita: Distribuição por Status e Top Gêneros */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. Distribuição da Estante por Status */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#007BFF]" />
                      Distribuição do Acervo
                    </h3>
                    {dashboard.average_rating !== null && (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        Média {dashboard.average_rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Barra Segmentada de Status */}
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      {dashboard.total_books > 0 ? (
                        <>
                          <div
                            style={{
                              width: `${(dashboard.read_books_count / dashboard.total_books) * 100}%`,
                            }}
                            className="h-full bg-emerald-500"
                            title={`Lidos: ${dashboard.read_books_count}`}
                          />
                          <div
                            style={{
                              width: `${(dashboard.reading_books_count / dashboard.total_books) * 100}%`,
                            }}
                            className="h-full bg-amber-500"
                            title={`Lendo: ${dashboard.reading_books_count}`}
                          />
                          <div
                            style={{
                              width: `${(dashboard.paused_books_count / dashboard.total_books) * 100}%`,
                            }}
                            className="h-full bg-purple-500"
                            title={`Pausados: ${dashboard.paused_books_count}`}
                          />
                          <div
                            style={{
                              width: `${(dashboard.want_to_read_books_count / dashboard.total_books) * 100}%`,
                            }}
                            className="h-full bg-blue-500"
                            title={`Quero Ler: ${dashboard.want_to_read_books_count}`}
                          />
                          <div
                            style={{
                              width: `${(dashboard.abandoned_books_count / dashboard.total_books) * 100}%`,
                            }}
                            className="h-full bg-slate-400"
                            title={`Abandonados: ${dashboard.abandoned_books_count}`}
                          />
                        </>
                      ) : (
                        <div className="h-full w-full bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>

                    {/* Legenda de Status */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Lidos
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dashboard.read_books_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Lendo
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dashboard.reading_books_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Quero Ler
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dashboard.want_to_read_books_count}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          Pausados
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {dashboard.paused_books_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Top Gêneros Literários da Estante */}
                {dashboard.top_genres.length > 0 && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#007BFF]" />
                      Gêneros Mais Frequentes
                    </h3>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {dashboard.top_genres.map((genre) => (
                        <Link
                          key={genre.id}
                          href={`/minha-biblioteca?genre_id=${genre.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-[#007BFF]/10 hover:text-[#007BFF] dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <span>{genre.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-white dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-300 font-bold">
                            {genre.book_count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Modal para Adicionar Livro */}
      <BookFormModal
        isOpen={isBookFormOpen}
        onClose={() => setIsBookFormOpen(false)}
        onSuccess={() => {
          loadDashboard();
          setIsBookFormOpen(false);
        }}
      />

      {/* Modal para Registrar Sessão de Leitura */}
      <ReadingSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false);
          setSessionTargetBook(null);
        }}
        userBook={sessionTargetBook}
        onSuccess={() => {
          loadDashboard();
        }}
      />
    </AppShell>
  );
}
