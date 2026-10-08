"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Plus,
  Building2,
  Library,
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
  BookCardSkeleton,
} from "@telebooks/ui";
import type { Book, BookStatus, UserBook } from "@telebooks/types";

import { useRouter } from "next/navigation";
import { AppShell } from "../components/shell/app-shell";
import { BookCard, BookItem } from "../components/book-card";
import { useAuth } from "../components/auth/auth-provider";
import { api } from "../lib/api";

import { BookDetailsModal } from "../components/catalog/book-details-modal";
import { BookFormModal } from "../components/catalog/book-form-modal";
import { ManageEntitiesModal } from "../components/catalog/manage-entities-modal";
import { ShelfConnectionModal } from "../components/shelf/shelf-connection-modal";

export default function HomePage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Estados principais
  const [viewMode, setViewMode] = useState<"shelf" | "catalog">("shelf");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dados reais da API
  const [shelfBooks, setShelfBooks] = useState<UserBook[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<Book[]>([]);
  const [genresCount, setGenresCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modais
  const [detailsModalBook, setDetailsModalBook] = useState<Book | null>(null);
  const [detailsUserBook, setDetailsUserBook] = useState<UserBook | null>(null);

  const [shelfModalBook, setShelfModalBook] = useState<Book | null>(null);
  const [shelfModalUserBook, setShelfModalUserBook] = useState<UserBook | null>(null);

  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);

  const [isManageEntitiesOpen, setIsManageEntitiesOpen] = useState(false);

  // Redirecionamento de segurança para login se não autenticado
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [user, isAuthLoading, router]);

  // Carregamento de dados da API
  const loadData = useCallback(async () => {
    // Se o leitor está na estante mas ainda não tem sessão, aguarda autenticação
    if (viewMode === "shelf" && !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      if (viewMode === "shelf") {
        let statusParam: BookStatus | undefined = undefined;
        let favoriteParam: boolean | undefined = undefined;

        if (statusFilter === "favorite") {
          favoriteParam = true;
        } else if (
          ["reading", "want_to_read", "read", "paused", "abandoned"].includes(
            statusFilter
          )
        ) {
          statusParam = statusFilter as BookStatus;
        }

        const res = await api.getShelf({
          status: statusParam,
          favorite: favoriteParam,
          page: currentPage,
          page_size: 18,
        });

        setShelfBooks(res.items || []);
        setTotalPages(res.total_pages || 1);
        setTotalItems(res.total || 0);
      } else {
        // Modo catálogo global
        const res = await api.getBooks({
          q: searchQuery || undefined,
          page: currentPage,
          page_size: 18,
        });

        setCatalogBooks(res.items || []);
        setTotalPages(res.total_pages || 1);
        setTotalItems(res.total || 0);
      }

      // Buscar total de gêneros/coleções para o contador
      try {
        const genresRes = await api.getGenres({ page_size: 1 });
        if (genresRes?.total) {
          setGenresCount(genresRes.total);
        }
      } catch {
        // Fallback silencioso
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar dados do servidor.";
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, statusFilter, searchQuery, currentPage, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Livros atualmente em leitura para o destaque (Hero) e seção Continuar Lendo
  const readingBooks = useMemo(() => {
    return shelfBooks.filter((ub) => ub.status === "reading");
  }, [shelfBooks]);

  const currentlyReading = useMemo(() => {
    return readingBooks[0] || null;
  }, [readingBooks]);

  // Conversão de UserBook ou Book para BookItem para o BookCard
  const displayBooks: BookItem[] = useMemo(() => {
    const statusLabelMap: Record<string, string> = {
      reading: "Lendo",
      want_to_read: "Quero Ler",
      read: "Lido",
      paused: "Pausado",
      abandoned: "Abandonado",
    };

    if (viewMode === "shelf") {
      return shelfBooks
        .filter((ub) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          const matchTitle = ub.book?.title.toLowerCase().includes(q);
          const matchAuthor = ub.book?.authors?.some((a) =>
            a.name.toLowerCase().includes(q)
          );
          return matchTitle || matchAuthor;
        })
        .map((ub) => ({
          id: ub.id,
          bookId: ub.book_id,
          title: ub.book?.title || "Sem título",
          author:
            ub.book?.authors?.map((a) => a.name).join(", ") || "Autor não informado",
          coverUrl:
            ub.book?.cover_url ||
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
          pages: ub.book?.page_count || 100,
          currentPage: ub.current_page,
          status: (ub.status as any) || "neutral",
          statusLabel: statusLabelMap[ub.status] ?? "Estante",
          rating: ub.rating ? Number(ub.rating) : undefined,
          isFavorite: ub.favorite,
          isInShelf: true,
        }));
    } else {
      // Modo Catálogo Global
      return catalogBooks.map((b) => {
        const userShelfItem = shelfBooks.find((ub) => ub.book_id === b.id);
        const label = userShelfItem
          ? statusLabelMap[userShelfItem.status] ?? "Estante"
          : "Catálogo";

        return {
          id: b.id,
          bookId: b.id,
          title: b.title,
          author: b.authors?.map((a) => a.name).join(", ") || "Autor não informado",
          coverUrl:
            b.cover_url ||
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
          pages: b.page_count || 100,
          currentPage: userShelfItem?.current_page,
          status: (userShelfItem?.status as any) || "neutral",
          statusLabel: label,
          rating: userShelfItem?.rating ? Number(userShelfItem.rating) : undefined,
          isFavorite: userShelfItem?.favorite,
          isInShelf: !!userShelfItem,
        };
      });
    }
  }, [viewMode, shelfBooks, catalogBooks, searchQuery]);

  // Ações nos Cards
  const handleOpenDetails = async (item: BookItem) => {
    try {
      const book = await api.getBook(item.bookId);
      const userBook = shelfBooks.find((ub) => ub.book_id === item.bookId) || null;
      setDetailsModalBook(book);
      setDetailsUserBook(userBook);
    } catch {
      // Fallback
    }
  };

  const handleOpenShelfEdit = async (item: BookItem) => {
    try {
      const book = await api.getBook(item.bookId);
      const userBook = shelfBooks.find((ub) => ub.book_id === item.bookId) || null;
      setShelfModalBook(book);
      setShelfModalUserBook(userBook);
    } catch {
      // Fallback
    }
  };

  const handleToggleFavorite = async (item: BookItem) => {
    const userBook = shelfBooks.find((ub) => ub.book_id === item.bookId);
    if (!userBook) return;
    try {
      await api.updateShelfBook(userBook.id, {
        favorite: !userBook.favorite,
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromShelf = async (item: BookItem) => {
    const userBook = shelfBooks.find((ub) => ub.book_id === item.bookId);
    if (!userBook) return;
    if (!confirm(`Remover "${item.title}" da sua estante?`)) return;
    try {
      await api.removeFromShelf(userBook.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await api.deleteBook(bookId);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir livro.");
    }
  };

  const greetingName =
    profile?.full_name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    profile?.username ||
    "Leitor";

  const uniqueAuthorsCount = useMemo(() => {
    const set = new Set<string>();
    shelfBooks.forEach((ub) => {
      ub.book?.authors?.forEach((a) => set.add(a.name));
    });
    return set.size;
  }, [shelfBooks]);

  const uniquePublishersCount = useMemo(() => {
    const set = new Set<string>();
    shelfBooks.forEach((ub) => {
      if (ub.book?.publisher?.name) {
        set.add(ub.book.publisher.name);
      }
    });
    return set.size;
  }, [shelfBooks]);

  if (isAuthLoading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-neutral-500 font-serif">Carregando TeleBooks...</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell
      onAddBookClick={() => {
        setBookToEdit(null);
        setIsBookFormOpen(true);
      }}
      searchQuery={searchQuery}
      onSearchChange={(q) => {
        setSearchQuery(q);
        setCurrentPage(1);
      }}
      bookCount={shelfBooks.length}
      readingCount={readingBooks.length}
    >
      <div className="space-y-8 sm:space-y-10">
        {/* Editorial Greeting & Header Controls */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-6">
          <div className="space-y-1">
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-white flex items-center gap-2">
              Olá, {greetingName} <span className="inline-block origin-bottom-right">👋</span>
            </h1>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] font-sans">
              Sua biblioteca, do seu jeito.
            </p>
          </div>

          {/* Action Buttons: New Book & Manage Entities */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManageEntitiesOpen(true)}
              leftIcon={<Building2 className="h-3.5 w-3.5 text-[#64748B]" />}
              className="text-xs"
            >
              Autores & Editoras
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setBookToEdit(null);
                setIsBookFormOpen(true);
              }}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Novo Livro
            </Button>
          </div>
        </section>

        {/* Quick Stats Grid - Identidade Visual Oficial TeleBooks */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm transition-all hover:shadow-md hover:border-[#CBD5E1] dark:hover:border-[#334155]">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F172A] dark:text-white">
              {shelfBooks.length}
            </div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mt-1">
              Livros
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm transition-all hover:shadow-md hover:border-[#CBD5E1] dark:hover:border-[#334155]">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F172A] dark:text-white">
              {uniqueAuthorsCount}
            </div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mt-1">
              Autores
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm transition-all hover:shadow-md hover:border-[#CBD5E1] dark:hover:border-[#334155]">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F172A] dark:text-white">
              {uniquePublishersCount}
            </div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mt-1">
              Editoras
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm transition-all hover:shadow-md hover:border-[#CBD5E1] dark:hover:border-[#334155]">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F172A] dark:text-white">
              {genresCount || 17}
            </div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mt-1">
              Coleções
            </div>
          </div>
        </section>

        {/* Seção Continuar Lendo - Mockup Identidade Visual */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
              <span>Continuar lendo</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setViewMode("shelf");
                setStatusFilter("reading");
              }}
              className="text-xs font-semibold text-[#007BFF] hover:underline flex items-center gap-1 group"
            >
              <span>Ver todos</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          {readingBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {readingBooks.slice(0, 5).map((ub) => {
                const book = ub.book;
                if (!book) return null;
                const pages = book.page_count || 100;
                const current = ub.current_page || 0;
                const percent = Math.min(100, Math.round((current / pages) * 100));

                return (
                  <div
                    key={ub.id}
                    onClick={() =>
                      handleOpenShelfEdit({
                        id: ub.id,
                        bookId: ub.book_id,
                        title: book.title,
                        author: book.authors?.map((a) => a.name).join(", ") || "",
                        coverUrl: book.cover_url || "",
                        pages,
                        currentPage: current,
                        status: "reading",
                        statusLabel: "Lendo",
                        isFavorite: ub.favorite,
                        isInShelf: true,
                      })
                    }
                    className="group flex flex-col cursor-pointer select-none"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-book group-hover:shadow-book-hover transition-all duration-300 group-hover:-translate-y-1 bg-[#E2E8F0] dark:bg-[#1E293B] book-spine">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          book.cover_url ||
                          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
                        }
                        alt={book.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="mt-2.5 space-y-1">
                      <h4 className="font-display text-sm font-semibold text-[#0F172A] dark:text-white line-clamp-1 group-hover:text-[#007BFF] transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-1">
                        {book.authors?.map((a) => a.name).join(", ") || "Autor não informado"}
                      </p>
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                          <span>{percent}%</span>
                          <span>{current}/{pages} pág</span>
                        </div>
                        <div className="w-full bg-[#E2E8F0] dark:bg-[#1E293B] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#007BFF] h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 border-[#E2E8F0] dark:border-[#1E293B] bg-gradient-to-r from-blue-50/40 to-indigo-50/20 dark:from-blue-950/20 dark:to-indigo-950/10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-display font-semibold text-sm sm:text-base text-[#0F172A] dark:text-white">
                    Nenhum livro em andamento no momento
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Selecione um livro da sua estante ou do catálogo global para acompanhar o seu progresso diário de leitura.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setViewMode("shelf");
                    setStatusFilter("want_to_read");
                  }}
                  className="shrink-0 text-xs"
                >
                  Explorar Estante
                </Button>
              </div>
            </Card>
          )}
        </section>

        {/* View Mode Toggle: Minha Estante vs Catálogo Global */}
        <section className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-xl font-bold text-[#0F172A] dark:text-white">
                {viewMode === "shelf" ? "Adicionados recentemente" : "Catálogo Global"}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {viewMode === "shelf"
                  ? "Seus livros organizados, categorizados e prontos para leitura"
                  : "Catálogo comunitário com obras, edições e capas disponíveis"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex p-1 bg-slate-200/70 dark:bg-[#1E293B] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("shelf");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "shelf"
                      ? "bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white shadow-sm"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  }`}
                >
                  <Library className="h-3.5 w-3.5" />
                  Minha Estante ({shelfBooks.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("catalog");
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "catalog"
                      ? "bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white shadow-sm"
                      : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Catálogo Global
                </button>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="p-2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
                title="Recarregar"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filter Pills for Shelf */}
          {viewMode === "shelf" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: "all", label: "Todos" },
                { id: "reading", label: "Lendo" },
                { id: "want_to_read", label: "Quero Ler" },
                { id: "read", label: "Lidos" },
                { id: "favorite", label: "Favoritos" },
              ].map((filter) => {
                const isActive = statusFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(filter.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none ${
                      isActive
                        ? "bg-[#007BFF] text-white shadow-sm shadow-[#007BFF]/25 font-semibold"
                        : "bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] dark:text-[#94A3B8] hover:border-[#CBD5E1] dark:hover:border-[#334155] hover:text-[#0F172A] dark:hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Erro de API */}
          {apiError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Nota: {apiError}</span>
              <Button size="sm" variant="outline" onClick={loadData}>
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Book Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {[...Array(6)].map((_, idx) => (
                <BookCardSkeleton key={idx} />
              ))}
            </div>
          ) : displayBooks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#e5e0d8] dark:border-[#272b35] bg-white/50 dark:bg-[#181b22]/50">
              <SlidersHorizontal className="h-8 w-8 mx-auto text-neutral-400 mb-3" />
              <h3 className="font-serif text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Nenhum livro encontrado
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {viewMode === "shelf"
                  ? "Sua estante ainda não possui livros com este filtro. Explore o catálogo global para adicionar novos títulos!"
                  : "Não há livros no catálogo correspondentes à busca."}
              </p>
              {viewMode === "shelf" ? (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setViewMode("catalog")}
                >
                  Explorar Catálogo Global
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setBookToEdit(null);
                    setIsBookFormOpen(true);
                  }}
                >
                  Cadastrar Primeiro Livro
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {displayBooks.map((item) => (
                <BookCard
                  key={item.id}
                  book={item}
                  onOpenDetails={handleOpenDetails}
                  onUpdateProgress={handleOpenShelfEdit}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToShelf={handleOpenShelfEdit}
                  onRemoveFromShelf={handleRemoveFromShelf}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-500">
                Página {currentPage} de {totalPages} ({totalItems} livros)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modais do Sistema */}
      {/* 1. Ficha Bibliográfica Detalhada */}
      <BookDetailsModal
        isOpen={!!detailsModalBook}
        onClose={() => setDetailsModalBook(null)}
        book={detailsModalBook}
        userBook={detailsUserBook}
        onOpenShelfModal={(b, ub) => {
          setShelfModalBook(b);
          setShelfModalUserBook(ub || null);
        }}
        onOpenEditModal={(b) => {
          setBookToEdit(b);
          setIsBookFormOpen(true);
        }}
        onDeleteBook={handleDeleteBook}
      />

      {/* 2. Gestão de Leitura na Estante (UserBook) */}
      <ShelfConnectionModal
        isOpen={!!shelfModalBook}
        onClose={() => {
          setShelfModalBook(null);
          setShelfModalUserBook(null);
        }}
        book={shelfModalBook}
        existingUserBook={shelfModalUserBook}
        onSuccess={loadData}
      />

      {/* 3. Cadastro e Edição de Livro Bibliográfico Global (Book) */}
      <BookFormModal
        isOpen={isBookFormOpen}
        onClose={() => {
          setIsBookFormOpen(false);
          setBookToEdit(null);
        }}
        bookToEdit={bookToEdit}
        onSuccess={loadData}
      />

      {/* 4. Gestão de Entidades: Autores, Editoras e Gêneros */}
      <ManageEntitiesModal
        isOpen={isManageEntitiesOpen}
        onClose={() => setIsManageEntitiesOpen(false)}
        onUpdated={loadData}
      />
    </AppShell>
  );
}
