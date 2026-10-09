"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Library,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Plus,
  ArrowUpDown,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Heart,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  FilterX,
  Compass,
  Folder,
  Tag,
  Clock,
  Users,
  FolderPlus,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  BookCardSkeleton,
} from "@telebooks/ui";
import type {
  Author,
  Book,
  BookStatus,
  Collection,
  Genre,
  Publisher,
  UserBook,
  UserTag,
} from "@telebooks/types";

import { AppShell } from "../../components/shell/app-shell";
import { BookCard, BookItem } from "../../components/book-card";
import { useAuth } from "../../components/auth/auth-provider";
import { api } from "../../lib/api";

import {
  ShelfFilters,
  ShelfFilterValues,
  ViewMode,
} from "../../components/shelf/shelf-filters";
import { BookshelfView } from "../../components/shelf/bookshelf-view";
import { ShelfListView } from "../../components/shelf/shelf-list-view";
import { CollectionsManagerModal } from "../../components/shelf/collections-manager-modal";

import { BookDetailsModal } from "../../components/catalog/book-details-modal";
import { BookFormModal } from "../../components/catalog/book-form-modal";
import { ShelfConnectionModal } from "../../components/shelf/shelf-connection-modal";

interface BookGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  description?: string;
  books: UserBook[];
}

export default function MinhaBibliotecaPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Modo de visualização: grid (capas), list (tabela detalhada), bookshelf (estante 3D)
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filtros e busca
  const [filters, setFilters] = useState<ShelfFilterValues>({
    q: "",
    status: "all",
    author_id: undefined,
    publisher_id: undefined,
    genre_id: undefined,
    collection_id: undefined,
    tag_id: undefined,
    personal_color: undefined,
    min_rating: undefined,
    sort_by: "updated_at_desc",
    page_size: 18,
    groupBy: "none",
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dados da Estante
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dados auxiliares para filtros
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<UserTag[]>([]);

  // Modais
  const [detailsBook, setDetailsBook] = useState<Book | null>(null);
  const [detailsUserBook, setDetailsUserBook] = useState<UserBook | null>(null);

  const [shelfModalBook, setShelfModalBook] = useState<Book | null>(null);
  const [shelfModalUserBook, setShelfModalUserBook] = useState<UserBook | null>(null);

  const [isBookFormOpen, setIsBookFormOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);

  // Redirecionamento de segurança para login se não autenticado
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [user, isAuthLoading, router]);

  // Carrega entidades para os seletores de filtros
  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [authorsRes, publishersRes, genresRes, collectionsRes, tagsRes] =
        await Promise.allSettled([
          api.getAuthors({ page_size: 100 }),
          api.getPublishers({ page_size: 100 }),
          api.getGenres({ page_size: 100 }),
          api.getCollections(),
          api.getUserTags(),
        ]);

      if (authorsRes.status === "fulfilled") {
        setAuthors(authorsRes.value.items || []);
      }
      if (publishersRes.status === "fulfilled") {
        setPublishers(publishersRes.value.items || []);
      }
      if (genresRes.status === "fulfilled") {
        setGenres(genresRes.value.items || []);
      }
      if (collectionsRes.status === "fulfilled") {
        setCollections(collectionsRes.value || []);
      }
      if (tagsRes.status === "fulfilled") {
        setTags(tagsRes.value || []);
      }
    } catch {
      // Falha silenciosa no carregamento de metadados
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAuxiliaryData();
    }
  }, [user, loadAuxiliaryData]);

  // Carregamento principal dos livros da estante
  const loadShelf = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setApiError(null);

    try {
      let statusParam: BookStatus | undefined = undefined;
      let favoriteParam: boolean | undefined = undefined;

      if (filters.status === "favorite") {
        favoriteParam = true;
      } else if (
        ["reading", "want_to_read", "read", "paused", "abandoned"].includes(
          filters.status
        )
      ) {
        statusParam = filters.status as BookStatus;
      }

      const res = await api.getShelf({
        q: filters.q ? filters.q.trim() : undefined,
        status: statusParam,
        favorite: favoriteParam,
        author_id: filters.author_id,
        publisher_id: filters.publisher_id,
        genre_id: filters.genre_id,
        collection_id: filters.collection_id,
        tag_id: filters.tag_id,
        personal_color: filters.personal_color,
        min_rating: filters.min_rating,
        sort_by: filters.sort_by,
        page: currentPage,
        page_size: filters.page_size,
      });

      setUserBooks(res.items || []);
      setTotalPages(res.total_pages || 1);
      setTotalItems(res.total || 0);
    } catch (err: any) {
      setApiError(
        err?.message ||
          "Não foi possível carregar sua estante. Verifique sua conexão."
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, filters, currentPage]);

  // Dispara o carregamento com debounce quando filtros ou página mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      loadShelf();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadShelf]);

  // Reseta para a página 1 ao alterar qualquer filtro
  const handleFilterChange = (newFilters: ShelfFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Conversão de UserBook para BookItem
  const toBookItem = (userBook: UserBook): BookItem => {
    const book = userBook.book;
    const authorName =
      book?.authors && book.authors.length > 0
        ? book.authors.map((a) => a.name).join(", ")
        : "Autor Desconhecido";

    const statusMap: Record<string, { label: string; variant: any }> = {
      reading: { label: "Lendo", variant: "reading" },
      want_to_read: { label: "Quero Ler", variant: "want_to_read" },
      read: { label: "Lido", variant: "read" },
      paused: { label: "Pausado", variant: "paused" },
      abandoned: { label: "Abandonado", variant: "abandoned" },
    };
    const s = statusMap[userBook.status] || {
      label: "Quero Ler",
      variant: "want_to_read",
    };

    return {
      id: userBook.id,
      bookId: userBook.book_id,
      title: book?.title || "Sem Título",
      author: authorName,
      coverUrl:
        book?.cover_url ||
        book?.thumbnail_url ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
      pages: book?.page_count || 0,
      currentPage: userBook.current_page,
      status: s.variant,
      statusLabel: s.label,
      rating: userBook.rating ? Number(userBook.rating) : undefined,
      isFavorite: userBook.favorite,
      isInShelf: true,
      personalColor: userBook.personal_color,
      tags: userBook.tags,
      collections: userBook.collections,
    };
  };

  // Agrupamento de Livros
  const groupedBooks = useMemo<BookGroup[]>(() => {
    if (filters.groupBy === "none") return [];

    if (filters.groupBy === "collection") {
      const groups: BookGroup[] = [];
      const booksWithCollectionIds = new Set<string>();

      collections.forEach((col) => {
        const booksInCol = userBooks.filter((ub) =>
          ub.collections?.some((c) => c.id === col.id)
        );
        if (booksInCol.length > 0) {
          booksInCol.forEach((b) => booksWithCollectionIds.add(b.id));
          groups.push({
            id: col.id,
            title: col.name,
            icon: <Folder className="w-4 h-4 text-[#007BFF]" />,
            description: col.description || undefined,
            books: booksInCol,
          });
        }
      });

      const uncategorized = userBooks.filter(
        (ub) => !booksWithCollectionIds.has(ub.id)
      );
      if (uncategorized.length > 0) {
        groups.push({
          id: "uncategorized",
          title: "Sem Coleção Atribuída",
          icon: <BookMarked className="w-4 h-4 text-slate-400" />,
          description: "Livros da sua estante ainda não organizados em coleções",
          books: uncategorized,
        });
      }
      return groups;
    }

    if (filters.groupBy === "status") {
      const statusOrder: {
        status: BookStatus;
        label: string;
        icon: React.ReactNode;
      }[] = [
        {
          status: "reading",
          label: "Lendo Atualmente",
          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
        },
        {
          status: "want_to_read",
          label: "Quero Ler",
          icon: <BookmarkCheck className="w-4 h-4 text-amber-500" />,
        },
        {
          status: "read",
          label: "Lidos & Concluídos",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        },
        {
          status: "paused",
          label: "Leituras Pausadas",
          icon: <Clock className="w-4 h-4 text-purple-500" />,
        },
        {
          status: "abandoned",
          label: "Abandonados",
          icon: <FilterX className="w-4 h-4 text-rose-500" />,
        },
      ];

      const groups: BookGroup[] = [];
      statusOrder.forEach(({ status, label, icon }) => {
        const booksInStatus = userBooks.filter((ub) => ub.status === status);
        if (booksInStatus.length > 0) {
          groups.push({
            id: status,
            title: label,
            icon,
            books: booksInStatus,
          });
        }
      });
      return groups;
    }

    if (filters.groupBy === "author") {
      const map = new Map<string, UserBook[]>();
      userBooks.forEach((ub) => {
        const authorName =
          ub.book?.authors && ub.book.authors.length > 0
            ? ub.book.authors.map((a) => a.name).join(", ")
            : "Autor Desconhecido";
        if (!map.has(authorName)) map.set(authorName, []);
        map.get(authorName)!.push(ub);
      });

      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([authorName, books]) => ({
          id: authorName,
          title: authorName,
          icon: <Users className="w-4 h-4 text-[#007BFF]" />,
          books,
        }));
    }

    if (filters.groupBy === "genre") {
      const map = new Map<string, UserBook[]>();
      userBooks.forEach((ub) => {
        const genreName =
          ub.book?.genres?.[0]?.name || "Sem Gênero Literário";
        if (!map.has(genreName)) map.set(genreName, []);
        map.get(genreName)!.push(ub);
      });

      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([genreName, books]) => ({
          id: genreName,
          title: genreName,
          icon: <Tag className="w-4 h-4 text-[#007BFF]" />,
          books,
        }));
    }

    return [];
  }, [filters.groupBy, userBooks, collections]);

  // Ações de usuário
  const handleOpenDetails = (item: BookItem) => {
    const ub = userBooks.find((b) => b.id === item.id);
    if (ub && ub.book) {
      setDetailsBook(ub.book);
      setDetailsUserBook(ub);
    }
  };

  const handleUpdateProgress = (item: BookItem) => {
    const ub = userBooks.find((b) => b.id === item.id);
    if (ub && ub.book) {
      setShelfModalBook(ub.book);
      setShelfModalUserBook(ub);
    }
  };

  const handleToggleFavorite = async (item: BookItem) => {
    const ub = userBooks.find((b) => b.id === item.id);
    if (!ub) return;

    const newFav = !ub.favorite;

    // Atualização otimista imediata na UI
    setUserBooks((prev) =>
      prev.map((b) => (b.id === ub.id ? { ...b, favorite: newFav } : b))
    );

    try {
      await api.updateShelfBook(ub.id, { favorite: newFav });
    } catch {
      // Reverte em caso de falha
      setUserBooks((prev) =>
        prev.map((b) => (b.id === ub.id ? { ...b, favorite: !newFav } : b))
      );
    }
  };

  const handleRemoveFromShelf = async (item: BookItem) => {
    const confirmed = window.confirm(
      `Deseja remover "${item.title}" da sua biblioteca pessoal?`
    );
    if (!confirmed) return;

    // Atualização otimista
    setUserBooks((prev) => prev.filter((b) => b.id !== item.id));
    setTotalItems((prev) => Math.max(0, prev - 1));

    try {
      await api.removeFromShelf(item.id);
    } catch {
      loadShelf();
    }
  };

  // Contadores rápidos para resumo
  const readingCount = useMemo(
    () => userBooks.filter((b) => b.status === "reading").length,
    [userBooks]
  );

  const hasAnyFilterActive =
    Boolean(filters.q) ||
    filters.status !== "all" ||
    Boolean(filters.author_id) ||
    Boolean(filters.publisher_id) ||
    Boolean(filters.genre_id) ||
    Boolean(filters.collection_id) ||
    Boolean(filters.tag_id) ||
    Boolean(filters.personal_color) ||
    filters.min_rating !== undefined;

  return (
    <AppShell
      currentTab="library"
      bookCount={totalItems}
      readingCount={readingCount}
      onAddBookClick={() => setIsBookFormOpen(true)}
    >
      <div className="space-y-6 sm:space-y-8 select-none">
        {/* Cabeçalho Editorial da Biblioteca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#006CEB] to-[#007BFF] text-white flex items-center justify-center shadow-md shadow-[#007BFF]/20">
                <Library className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Minha Biblioteca
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Organize, acompanhe e explore todo o seu acervo literário pessoal.
            </p>
          </div>

          {/* Badges de Contagem e Botões de Ação */}
          <div className="flex items-center gap-2 sm:self-center flex-wrap">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{totalItems} no acervo</span>
              {readingCount > 0 && (
                <span className="text-[#007BFF]">• {readingCount} lendo</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCollectionsModalOpen(true)}
              leftIcon={<FolderPlus className="w-4 h-4 text-[#007BFF]" />}
              className="rounded-full text-xs px-3.5"
            >
              Coleções & Tags
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsBookFormOpen(true)}
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              className="rounded-full shadow-sm shadow-[#007BFF]/25 font-semibold text-xs px-4"
            >
              Adicionar Livro
            </Button>
          </div>
        </div>

        {/* Barra de Busca, Filtros, Ordenação, Agrupamento e Modos de Exibição */}
        <ShelfFilters
          filters={filters}
          onChange={handleFilterChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          authors={authors}
          publishers={publishers}
          genres={genres}
          collections={collections}
          tags={tags}
          onOpenCollectionsManager={() => setIsCollectionsModalOpen(true)}
          totalBooks={totalItems}
        />

        {/* Alerta de Erro de Conexão */}
        {apiError && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Nota: {apiError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={loadShelf} className="rounded-full text-xs">
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL (MODOS: GRID, LISTA, ESTANTE) */}
        {isLoading ? (
          // Skeletons de Carregamento
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {[...Array(filters.page_size)].map((_, idx) => (
                <BookCardSkeleton key={idx} />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <ShelfListView
              books={[]}
              isLoading={true}
              onOpenDetails={() => {}}
              onUpdateProgress={() => {}}
              onToggleFavorite={() => {}}
              onRemoveFromShelf={() => {}}
            />
          ) : (
            <BookshelfView
              books={[]}
              isLoading={true}
              onOpenDetails={() => {}}
              onUpdateProgress={() => {}}
              onToggleFavorite={() => {}}
              onRemoveFromShelf={() => {}}
            />
          )
        ) : userBooks.length === 0 ? (
          // Estados Vazios (Empty States)
          hasAnyFilterActive ? (
            // Caso 1: Filtros sem resultados
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0F172A]/50 max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FilterX className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum livro encontrado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Não encontramos títulos que correspondam aos filtros ou termo de busca selecionados.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    q: "",
                    status: "all",
                    author_id: undefined,
                    publisher_id: undefined,
                    genre_id: undefined,
                    collection_id: undefined,
                    tag_id: undefined,
                    personal_color: undefined,
                    min_rating: undefined,
                    sort_by: "updated_at_desc",
                    page_size: 18,
                    groupBy: "none",
                  })
                }
                className="rounded-full text-xs"
              >
                Limpar Todos os Filtros
              </Button>
            </div>
          ) : (
            // Caso 2: Biblioteca totalmente vazia
            <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0F172A] max-w-md mx-auto shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#007BFF] flex items-center justify-center mx-auto shadow-inner">
                <BookMarked className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Sua biblioteca está vazia
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Comece adicionando os livros que você já leu, está lendo ou quer ler para montar sua estante pessoal.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsBookFormOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="rounded-full text-xs w-full sm:w-auto"
                >
                  Cadastrar Livro
                </Button>
                <Link href="/" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Compass className="w-4 h-4" />}
                    className="rounded-full text-xs w-full"
                  >
                    Explorar Catálogo
                  </Button>
                </Link>
              </div>
            </div>
          )
        ) : filters.groupBy !== "none" ? (
          // =========================================================================
          // EXIBIÇÃO AGRUPADA (POR COLEÇÃO, STATUS, AUTOR OU GÊNERO)
          // =========================================================================
          <div className="space-y-10 sm:space-y-12">
            {groupedBooks.map((group) => (
              <div key={group.id} className="space-y-4">
                {/* Cabeçalho da Seção Agrupada */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-900/40">
                      {group.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                          {group.title}
                        </h2>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {group.books.length} {group.books.length === 1 ? "livro" : "livros"}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Livros do Grupo no Modo Escolhido */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                    {group.books.map((userBook) => (
                      <BookCard
                        key={userBook.id}
                        book={toBookItem(userBook)}
                        onOpenDetails={handleOpenDetails}
                        onUpdateProgress={handleUpdateProgress}
                        onToggleFavorite={handleToggleFavorite}
                        onRemoveFromShelf={handleRemoveFromShelf}
                      />
                    ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <ShelfListView
                    books={group.books}
                    onOpenDetails={handleOpenDetails}
                    onUpdateProgress={handleUpdateProgress}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveFromShelf={handleRemoveFromShelf}
                  />
                )}

                {viewMode === "bookshelf" && (
                  <BookshelfView
                    books={group.books}
                    onOpenDetails={handleOpenDetails}
                    onUpdateProgress={handleUpdateProgress}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveFromShelf={handleRemoveFromShelf}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          // =========================================================================
          // EXIBIÇÃO LINEAR PADRÃO (SEM AGRUPAMENTO)
          // =========================================================================
          <>
            {viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {userBooks.map((userBook) => (
                  <BookCard
                    key={userBook.id}
                    book={toBookItem(userBook)}
                    onOpenDetails={handleOpenDetails}
                    onUpdateProgress={handleUpdateProgress}
                    onToggleFavorite={handleToggleFavorite}
                    onRemoveFromShelf={handleRemoveFromShelf}
                  />
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <ShelfListView
                books={userBooks}
                onOpenDetails={handleOpenDetails}
                onUpdateProgress={handleUpdateProgress}
                onToggleFavorite={handleToggleFavorite}
                onRemoveFromShelf={handleRemoveFromShelf}
              />
            )}

            {viewMode === "bookshelf" && (
              <BookshelfView
                books={userBooks}
                onOpenDetails={handleOpenDetails}
                onUpdateProgress={handleUpdateProgress}
                onToggleFavorite={handleToggleFavorite}
                onRemoveFromShelf={handleRemoveFromShelf}
              />
            )}

            {/* Paginação e Resumo */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
                {/* Resumo */}
                <div className="text-slate-500 dark:text-slate-400">
                  Mostrando{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {(currentPage - 1) * filters.page_size + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {Math.min(currentPage * filters.page_size, totalItems)}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {totalItems}
                  </span>{" "}
                  livros
                </div>

                {/* Controles de Navegação */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs active:scale-95"
                    title="Página Anterior"
                    aria-label="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, idx) => {
                      const pageNum = idx + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`min-h-[40px] min-w-[40px] rounded-full font-semibold text-xs flex items-center justify-center transition-all active:scale-95 ${
                              currentPage === pageNum
                                ? "bg-[#007BFF] text-white shadow-sm shadow-[#007BFF]/25"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (
                        (pageNum === 2 && currentPage > 3) ||
                        (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <span
                            key={pageNum}
                            className="w-6 text-center text-slate-400 font-bold"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs active:scale-95"
                    title="Próxima Página"
                    aria-label="Próxima Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Ficha Rápida do Livro */}
      <BookDetailsModal
        isOpen={Boolean(detailsBook)}
        onClose={() => {
          setDetailsBook(null);
          setDetailsUserBook(null);
        }}
        book={detailsBook}
        userBook={detailsUserBook}
        onOpenShelfModal={(b, ub) => {
          setShelfModalBook(b);
          setShelfModalUserBook(ub || null);
          setDetailsBook(null);
          setDetailsUserBook(null);
        }}
      />

      {/* Modal de Progresso de Leitura na Estante */}
      <ShelfConnectionModal
        isOpen={Boolean(shelfModalBook)}
        onClose={() => {
          setShelfModalBook(null);
          setShelfModalUserBook(null);
        }}
        book={shelfModalBook}
        existingUserBook={shelfModalUserBook}
        onSuccess={() => {
          loadShelf();
          loadAuxiliaryData();
          setShelfModalBook(null);
          setShelfModalUserBook(null);
        }}
      />

      {/* Modal de Cadastro / Edição de Livro */}
      <BookFormModal
        isOpen={isBookFormOpen}
        onClose={() => {
          setIsBookFormOpen(false);
          setBookToEdit(null);
        }}
        bookToEdit={bookToEdit}
        onSuccess={() => {
          loadShelf();
          loadAuxiliaryData();
          setIsBookFormOpen(false);
          setBookToEdit(null);
        }}
      />

      {/* Modal de Gestão de Coleções e Tags */}
      <CollectionsManagerModal
        isOpen={isCollectionsModalOpen}
        onClose={() => setIsCollectionsModalOpen(false)}
        onChanged={() => {
          loadAuxiliaryData();
          loadShelf();
        }}
      />
    </AppShell>
  );
}
