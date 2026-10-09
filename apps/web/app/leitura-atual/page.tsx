"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  BookOpen,
  Clock,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  XCircle,
  RotateCcw,
  Plus,
  Calendar,
  ChevronRight,
  TrendingUp,
  FileText,
  Trash2,
  AlertCircle,
  Library,
  Flame,
  ArrowRight,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "@telebooks/ui";
import type { UserBook, ReadingSession, ReadingOverview, BookStatus } from "@telebooks/types";

import { AppShell } from "../../components/shell/app-shell";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";
import { ReadingSessionModal } from "../../components/shelf/reading-session-modal";
import { ShelfConnectionModal } from "../../components/shelf/shelf-connection-modal";

const STATUS_CONFIG: Record<
  BookStatus,
  { label: string; color: string; badgeVariant: "default" | "success" | "warning" | "error" | "info" }
> = {
  want_to_read: {
    label: "Quero Ler",
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    badgeVariant: "info",
  },
  reading: {
    label: "Lendo Agora",
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    badgeVariant: "warning",
  },
  paused: {
    label: "Pausado",
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    badgeVariant: "default",
  },
  read: {
    label: "Lido",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badgeVariant: "success",
  },
  abandoned: {
    label: "Abandonado",
    color: "text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
    badgeVariant: "error",
  },
};

export default function LeituraAtualPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [overview, setOverview] = useState<ReadingOverview | null>(null);
  const [activeBooks, setActiveBooks] = useState<UserBook[]>([]);
  const [wantToReadBooks, setWantToReadBooks] = useState<UserBook[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modais
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionTargetBook, setSessionTargetBook] = useState<UserBook | null>(null);
  const [isShelfEditModalOpen, setIsShelfEditModalOpen] = useState(false);
  const [shelfEditTargetBook, setShelfEditTargetBook] = useState<UserBook | null>(null);

  // Carrega dados agregados do backend
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [overviewData, wantToReadRes] = await Promise.all([
        api.getReadingOverview().catch(() => null),
        api.getShelf({ status: "want_to_read", page_size: 6 }).catch(() => null),
      ]);

      if (overviewData) {
        setOverview(overviewData);
        setActiveBooks(overviewData.active_books || []);
        setSessions(overviewData.recent_sessions || []);

        // Seleciona o primeiro livro lendo como foco inicial, ou primeiro ativo
        const currentlyReading = overviewData.active_books?.find((b) => b.status === "reading");
        if (currentlyReading) {
          setSelectedBookId((prev) => prev || currentlyReading.id);
        } else if (overviewData.active_books && overviewData.active_books.length > 0) {
          const firstActive = overviewData.active_books[0];
          if (firstActive) {
            setSelectedBookId((prev) => prev || firstActive.id);
          }
        }
      }

      if (wantToReadRes?.items) {
        setWantToReadBooks(wantToReadRes.items);
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar leituras:", err);
      setErrorMessage("Não foi possível carregar os dados de leitura no momento.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push("/login");
      } else {
        loadData();
      }
    }
  }, [user, isAuthLoading, router, loadData]);

  // Livro atualmente em foco
  const currentFocusedBook = useMemo(() => {
    if (!activeBooks.length) return null;
    return activeBooks.find((b) => b.id === selectedBookId) ?? activeBooks[0] ?? null;
  }, [activeBooks, selectedBookId]);

  // Leituras ativas e leituras pausadas separadas
  const readingList = useMemo(
    () => activeBooks.filter((b) => b.status === "reading"),
    [activeBooks]
  );
  const pausedList = useMemo(
    () => activeBooks.filter((b) => b.status === "paused"),
    [activeBooks]
  );

  // Mudança rápida de status (want_to_read, reading, paused, read, abandoned)
  const handleStatusChange = async (userBook: UserBook, newStatus: BookStatus) => {
    try {
      setIsUpdatingStatus(true);
      const nowIso = new Date().toISOString();
      const updates: {
        status: BookStatus;
        started_at?: string | null;
        finished_at?: string | null;
        current_page?: number;
      } = { status: newStatus };

      if (newStatus === "reading" && !userBook.started_at) {
        updates.started_at = nowIso;
      } else if (newStatus === "read") {
        updates.finished_at = nowIso;
        if (userBook.book?.page_count) {
          updates.current_page = userBook.book.page_count;
        }
      }

      await api.updateShelfBook(userBook.id, updates);
      await loadData();
    } catch (err: unknown) {
      console.error("Erro ao alterar status de leitura:", err);
      alert("Não foi possível atualizar o status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Avanço rápido de páginas (+10, +25)
  const handleQuickPageProgress = async (userBook: UserBook, increment: number) => {
    try {
      setIsUpdatingStatus(true);
      const totalPages = userBook.book?.page_count || 99999;
      const nextPage = Math.min(userBook.current_page + increment, totalPages);
      const willFinish = totalPages > 0 && nextPage >= totalPages;

      await api.updateShelfBook(userBook.id, {
        current_page: nextPage,
        status: willFinish ? "read" : userBook.status === "paused" ? "reading" : userBook.status,
        finished_at: willFinish ? new Date().toISOString() : undefined,
      });

      // Também registra automaticamente uma sessão com esse incremento
      await api.createReadingSession(userBook.id, {
        start_page: userBook.current_page,
        end_page: nextPage,
        notes: `Avanço rápido de +${increment} páginas.`,
      }).catch(() => {});

      await loadData();
    } catch (err: unknown) {
      console.error("Erro ao avançar páginas:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Exclusão de sessão de leitura
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Deseja realmente excluir esta sessão de leitura do histórico?")) {
      return;
    }
    try {
      await api.deleteReadingSession(sessionId);
      await loadData();
    } catch (err: unknown) {
      console.error("Erro ao excluir sessão:", err);
      alert("Não foi possível excluir a sessão.");
    }
  };

  const openSessionModal = (book: UserBook) => {
    setSessionTargetBook(book);
    setIsSessionModalOpen(true);
  };

  return (
    <AppShell
      currentTab="reading"
      readingCount={overview?.currently_reading_count || readingList.length}
      bookCount={
        (overview?.currently_reading_count || 0) +
        (overview?.paused_count || 0) +
        (overview?.read_count || 0) +
        (overview?.want_to_read_count || 0)
      }
    >
      <div className="space-y-8 select-none">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-md shadow-[#007BFF]/20">
                <BookmarkCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Leitura Atual
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Monitore seu progresso, registre sessões diárias e cultive seu hábito de leitura.
            </p>
          </div>

          {/* Métricas do Leitor no Cabeçalho */}
          <div className="flex items-center gap-2 sm:self-center flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{overview?.total_pages_read || 0} páginas lidas</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-[#007BFF]" />
              <span>{overview?.total_sessions_count || sessions.length} sessões</span>
            </div>
            {currentFocusedBook && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openSessionModal(currentFocusedBook)}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                className="rounded-full shadow-sm shadow-[#007BFF]/25 font-semibold text-xs px-4"
              >
                Registrar Leitura
              </Button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ) : activeBooks.length === 0 ? (
          /* Estado Vazio: Nenhuma Leitura Ativa */
          <div className="space-y-8">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/40 dark:from-slate-900/40 dark:via-slate-900/20 dark:to-blue-950/20 border border-blue-100 dark:border-slate-800 text-center max-w-2xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-[#007BFF] flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Nenhuma leitura em andamento no momento
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Escolha um livro da sua lista de desejos ou do seu acervo para iniciar uma nova jornada literária.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/minha-biblioteca">
                  <Button
                    variant="primary"
                    className="rounded-full shadow-md shadow-[#007BFF]/20 px-6"
                    leftIcon={<Library className="w-4 h-4" />}
                  >
                    Ir para Minha Biblioteca
                  </Button>
                </Link>
              </div>
            </div>

            {/* Sugestões da lista "Quero Ler" */}
            {wantToReadBooks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#007BFF]" />
                    Prontos na sua lista de &quot;Quero Ler&quot;
                  </h3>
                  <Link
                    href="/minha-biblioteca?status=want_to_read"
                    className="text-xs text-[#007BFF] hover:underline font-semibold flex items-center gap-1"
                  >
                    Ver todos <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                  {wantToReadBooks.map((ub) => (
                    <div
                      key={ub.id}
                      className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-sm">
                          {ub.book?.cover_url || ub.book?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ub.book?.cover_url || ub.book?.thumbnail_url || ""}
                              alt={ub.book?.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">
                          {ub.book?.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {ub.book?.authors?.map((a) => a.name).join(", ") || "Autor"}
                        </p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(ub, "reading")}
                        className="mt-3 w-full rounded-xl text-[11px] font-semibold py-1.5"
                        leftIcon={<PlayCircle className="w-3.5 h-3.5 text-[#007BFF]" />}
                      >
                        Começar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Conteúdo com Leituras Ativas */
          <div className="space-y-8">
            {/* Seletor de Livros Ativos (quando há mais de um) */}
            {activeBooks.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Leituras:
                </span>
                {activeBooks.map((book) => {
                  const isSelected = book.id === currentFocusedBook?.id;
                  const isReading = book.status === "reading";
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBookId(book.id)}
                      className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                        isSelected
                          ? "bg-[#007BFF] text-white border-[#007BFF] shadow-sm shadow-[#007BFF]/30"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isReading ? "bg-amber-400 animate-pulse" : "bg-purple-400"
                        }`}
                      />
                      <span className="max-w-[140px] truncate">{book.book?.title}</span>
                      <span className="text-[10px] opacity-80">
                        {book.book?.page_count
                          ? `${Math.round((book.current_page / book.book.page_count) * 100)}%`
                          : `p.${book.current_page}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* HERO DO LIVRO EM FOCO */}
            {currentFocusedBook && (
              <div className="relative rounded-3xl bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-[#0F172A] dark:via-slate-900 dark:to-blue-950/20 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* Capa 3D com Efeito de Sombra e Lombada */}
                  <div className="relative shrink-0 group perspective-1000">
                    <div className="w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.3)] dark:shadow-[0_16px_32px_-8px_rgba(0,0,0,0.7)] border border-black/5 dark:border-white/10 transform lg:-rotate-1 transition-transform group-hover:rotate-0 duration-300 relative">
                      {currentFocusedBook.book?.cover_url || currentFocusedBook.book?.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentFocusedBook.book?.cover_url || currentFocusedBook.book?.thumbnail_url || ""}
                          alt={currentFocusedBook.book?.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpen className="w-12 h-12" />
                        </div>
                      )}

                      {/* Efeito Lombada */}
                      <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />

                      {/* Cor pessoal como detalhe */}
                      {currentFocusedBook.personal_color && (
                        <div
                          className="absolute bottom-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: currentFocusedBook.personal_color }}
                          title="Sua cor personalizada para esta edição"
                        />
                      )}
                    </div>
                  </div>

                  {/* Informações Centrais e Progresso */}
                  <div className="flex-1 min-w-0 space-y-6 w-full text-center lg:text-left">
                    {/* Tags, Status e Título */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            STATUS_CONFIG[currentFocusedBook.status].color
                          }`}
                        >
                          {STATUS_CONFIG[currentFocusedBook.status].label}
                        </span>

                        {currentFocusedBook.started_at && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            Iniciado em{" "}
                            {new Date(currentFocusedBook.started_at).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                        {currentFocusedBook.book?.title}
                      </h2>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
                        {currentFocusedBook.book?.authors?.map((a) => a.name).join(", ") ||
                          "Autor não informado"}
                        {currentFocusedBook.book?.publisher && (
                          <span className="text-slate-400"> • {currentFocusedBook.book.publisher.name}</span>
                        )}
                      </p>
                    </div>

                    {/* Barra de Progresso Visual e Métricas */}
                    {(() => {
                      const totalPages = currentFocusedBook.book?.page_count || 0;
                      const currentPage = currentFocusedBook.current_page || 0;
                      const percent =
                        totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
                      const remainingPages = totalPages > 0 ? Math.max(0, totalPages - currentPage) : 0;

                      return (
                        <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 max-w-xl mx-auto lg:mx-0">
                          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-[#007BFF]" />
                              Página {currentPage} {totalPages > 0 ? `de ${totalPages}` : ""}
                            </span>
                            <span className="text-[#007BFF] font-bold text-base">{percent}%</span>
                          </div>

                          {/* Barra de Progresso com Gradiente */}
                          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] rounded-full transition-all duration-500 ease-out shadow-xs"
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                            <span>
                              {remainingPages > 0 ? `Restam ${remainingPages} páginas` : "Livro concluído!"}
                            </span>
                            {totalPages > 0 && (
                              <span>
                                {Math.ceil(remainingPages / 25)} sessões estimadas (~25 p/dia)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Botões de Ação Imediata */}
                    <div className="flex items-center justify-center lg:justify-start gap-3 flex-wrap pt-1">
                      <Button
                        variant="primary"
                        onClick={() => openSessionModal(currentFocusedBook)}
                        leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
                        className="rounded-full shadow-md shadow-[#007BFF]/25 font-semibold text-xs sm:text-sm px-5"
                      >
                        Registrar Sessão
                      </Button>

                      {/* Atalhos Rápidos de Páginas */}
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-400 pl-2 pr-1 font-semibold">Avanço:</span>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuickPageProgress(currentFocusedBook, 10)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
                        >
                          +10 págs
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleQuickPageProgress(currentFocusedBook, 25)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-xs transition-colors"
                        >
                          +25 págs
                        </button>
                      </div>

                      <Link href={`/livros/${currentFocusedBook.book_id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>

                    {/* Transição Rápida entre os 5 Status */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                      <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                        <span className="text-xs text-slate-400 font-semibold mr-1">Alterar status:</span>

                        {currentFocusedBook.status !== "reading" && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusChange(currentFocusedBook, "reading")}
                            className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold transition-colors flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" /> Retomar Leitura
                          </button>
                        )}

                        {currentFocusedBook.status === "reading" && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleStatusChange(currentFocusedBook, "paused")}
                            className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold transition-colors flex items-center gap-1"
                          >
                            <PauseCircle className="w-3.5 h-3.5" /> Pausar
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(currentFocusedBook, "read")}
                          className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Livro
                        </button>

                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(currentFocusedBook, "abandoned")}
                          className="text-xs px-2.5 py-1 rounded-full bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-600 dark:text-neutral-400 font-semibold transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Abandonar
                        </button>

                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleStatusChange(currentFocusedBook, "want_to_read")}
                          className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Quero Ler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO DE LEITURAS PAUSADAS */}
            {pausedList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <PauseCircle className="w-4 h-4 text-purple-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Leituras Pausadas ({pausedList.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pausedList.map((pausedBook) => {
                    const totalPages = pausedBook.book?.page_count || 0;
                    const percent =
                      totalPages > 0
                        ? Math.min(100, Math.round((pausedBook.current_page / totalPages) * 100))
                        : 0;

                    return (
                      <div
                        key={pausedBook.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3.5 shadow-xs"
                      >
                        <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          {pausedBook.book?.cover_url || pausedBook.book?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pausedBook.book?.cover_url || pausedBook.book?.thumbnail_url || ""}
                              alt={pausedBook.book?.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {pausedBook.book?.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Página {pausedBook.current_page} {totalPages > 0 ? `(${percent}%)` : ""}
                          </p>
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(pausedBook, "reading")}
                              className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#007BFF] hover:bg-[#006CEB] text-white font-semibold transition-colors flex items-center gap-1"
                            >
                              <PlayCircle className="w-3 h-3" /> Retomar
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedBookId(pausedBook.id)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEÇÃO DE HISTÓRICO DE SESSÕES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#007BFF]" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Histórico de Sessões Recentes
                  </h3>
                </div>
                {sessions.length > 0 && (
                  <span className="text-xs text-slate-400 font-medium">
                    {sessions.length} {sessions.length === 1 ? "sessão registrada" : "sessões registradas"}
                  </span>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nenhuma sessão de leitura registrada ainda. Registre a sua primeira sessão acima!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                  {sessions.map((session) => {
                    const pagesInSession = Math.max(0, session.end_page - session.start_page);
                    const durationMins = session.duration_seconds
                      ? Math.round(session.duration_seconds / 60)
                      : null;
                    const sessionDate = new Date(session.started_at);

                    return (
                      <div
                        key={session.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Miniatura do Livro se disponível */}
                          <div className="w-9 h-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                            {session.book_cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={session.book_cover_url}
                                alt={session.book_title || "Capa"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <BookOpen className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {session.book_title || "Leitura"}
                              </h4>
                              <span className="text-[11px] text-slate-400 font-medium">
                                •{" "}
                                {sessionDate.toLocaleDateString("pt-BR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <span className="text-[#007BFF] font-bold">
                                +{pagesInSession} {pagesInSession === 1 ? "pág." : "págs."}
                              </span>
                              <span className="text-slate-400">
                                (págs. {session.start_page} → {session.end_page})
                              </span>
                              {durationMins !== null && (
                                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <Clock className="w-3 h-3" /> {durationMins} min
                                </span>
                              )}
                            </div>

                            {session.notes && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-0.5 line-clamp-2">
                                &ldquo;{session.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Botão de Excluir Sessão */}
                        <div className="self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Excluir sessão"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Registro de Sessão de Leitura */}
      <ReadingSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false);
          setSessionTargetBook(null);
        }}
        userBook={sessionTargetBook}
        onSuccess={() => {
          loadData();
        }}
      />
    </AppShell>
  );
}
