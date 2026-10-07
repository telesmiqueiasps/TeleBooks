"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  SlidersHorizontal,
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
import { AppShell } from "../components/shell/app-shell";
import { BookCard, BookItem } from "../components/book-card";
import { AddBookModal } from "../components/add-book-modal";
import { ReadingProgressModal } from "../components/reading-progress-modal";
import { useAuth } from "../components/auth/auth-provider";

const INITIAL_BOOKS: BookItem[] = [
  {
    id: "1",
    title: "O Nome do Vento",
    author: "Patrick Rothfuss",
    coverUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
    pages: 656,
    currentPage: 442,
    status: "reading",
    statusLabel: "Lendo",
    rating: 4.8,
    isFavorite: true,
  },
  {
    id: "2",
    title: "Cem Anos de Solidão",
    author: "Gabriel García Márquez",
    coverUrl:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
    pages: 448,
    currentPage: 448,
    status: "read",
    statusLabel: "Lido",
    rating: 5.0,
    isFavorite: true,
  },
  {
    id: "3",
    title: "Duna",
    author: "Frank Herbert",
    coverUrl:
      "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=600",
    pages: 680,
    currentPage: 120,
    status: "reading",
    statusLabel: "Lendo",
    rating: 4.7,
    isFavorite: false,
  },
  {
    id: "4",
    title: "A República",
    author: "Platão",
    coverUrl:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600",
    pages: 384,
    status: "want_to_read",
    statusLabel: "Quero Ler",
    rating: 4.5,
    isFavorite: false,
  },
  {
    id: "5",
    title: "Crime e Castigo",
    author: "Fiódor Dostoiévski",
    coverUrl:
      "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600",
    pages: 592,
    currentPage: 592,
    status: "read",
    statusLabel: "Lido",
    rating: 4.9,
    isFavorite: true,
  },
  {
    id: "6",
    title: "Sapiens: Uma Breve História da Humanidade",
    author: "Yuval Noah Harari",
    coverUrl:
      "https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=600",
    pages: 464,
    status: "paused",
    statusLabel: "Pausado",
    rating: 4.3,
    isFavorite: false,
  },
];

export default function HomePage() {
  const [books, setBooks] = useState<BookItem[]>(INITIAL_BOOKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [progressModalBook, setProgressModalBook] = useState<BookItem | null>(null);

  // Active book currently reading (hero card)
  const currentlyReading = useMemo(
    () => books.find((b) => b.id === "1") || books[0],
    [books]
  );

  // Filter books based on search and tab
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch =
        searchQuery === "" ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "favorite" && book.isFavorite) ||
        book.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [books, searchQuery, statusFilter]);

  const handleAddBook = (newBook: {
    title: string;
    author: string;
    pages: number;
    status: "want_to_read" | "reading" | "read";
    coverUrl?: string;
  }) => {
    const statusMap = {
      want_to_read: "Quero Ler",
      reading: "Lendo",
      read: "Lido",
    };

    const bookItem: BookItem = {
      id: String(Date.now()),
      title: newBook.title,
      author: newBook.author,
      pages: newBook.pages,
      currentPage: newBook.status === "reading" ? 1 : newBook.status === "read" ? newBook.pages : 0,
      status: newBook.status,
      statusLabel: statusMap[newBook.status],
      coverUrl:
        newBook.coverUrl ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
      rating: 5.0,
      isFavorite: false,
    };

    setBooks((prev) => [bookItem, ...prev]);
  };

  const handleSaveProgress = (bookId: string, newPage: number) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, currentPage: newPage } : b))
    );
  };

  const handleToggleFavorite = (book: BookItem) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === book.id ? { ...b, isFavorite: !b.isFavorite } : b
      )
    );
  };

  const { user, profile } = useAuth();
  const greetingName =
    profile?.full_name?.split(" ")[0] ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    profile?.username ||
    "Leitor";

  return (
    <AppShell
      onAddBookClick={() => setIsAddBookOpen(true)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-10">
        {/* Editorial Greeting Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e7e3da] dark:border-[#272b35] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Sua biblioteca pessoal em 2026</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#141618] dark:text-[#f3f4f6]">
              Boa tarde, {greetingName}.
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#9ca3af] italic font-serif max-w-xl">
              “Não há amigo tão leal quanto um livro.” — Ernest Hemingway
            </p>
          </div>

          {/* Skeletons Demo Toggle */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLoadingDemo((prev) => !prev)}
              leftIcon={<Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              className="text-xs"
            >
              {isLoadingDemo ? "Ocultar Skeletons" : "Simular Skeletons"}
            </Button>
          </div>
        </section>

        {/* Lendo Agora (Hero Card) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#141618] dark:text-[#f3f4f6] flex items-center gap-2">
              <BookmarkCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Lendo Agora</span>
            </h2>
            <Badge variant="reading" size="sm" dot>
              Em Andamento
            </Badge>
          </div>

          {isLoadingDemo ? (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-28 sm:w-36 shrink-0">
                  <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                </div>
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  <div className="flex gap-3 pt-2">
                    <Skeleton className="h-9 w-32 rounded-lg" />
                    <Skeleton className="h-9 w-24 rounded-lg" />
                  </div>
                </div>
              </div>
            </Card>
          ) : currentlyReading ? (
            <Card className="overflow-hidden border-[#e5e0d8] dark:border-[#272b35] bg-gradient-to-br from-white to-[#faf8f5] dark:from-[#181b22] dark:to-[#14171d]">
              <div className="flex flex-col sm:flex-row gap-6 p-6 sm:p-8">
                {/* Book Cover with 3D spine and drop shadow */}
                <div
                  onClick={() => setProgressModalBook(currentlyReading)}
                  className="relative w-28 sm:w-36 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-book book-spine cursor-pointer transition-transform duration-200 hover:scale-105"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentlyReading.coverUrl}
                    alt={currentlyReading.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Book Progress & Actions */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="reading" size="sm" dot>
                        {currentlyReading.statusLabel}
                      </Badge>
                      <span className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                        Dia 14 consecutivo de leitura
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-[#141618] dark:text-[#f3f4f6] mt-2">
                      {currentlyReading.title}
                    </h3>
                    <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      {currentlyReading.author}
                    </p>
                  </div>

                  {/* Progress Bar & Numerical stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-medium text-[#141618] dark:text-[#f3f4f6]">
                        {currentlyReading.currentPage} de {currentlyReading.pages} páginas
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {Math.round(
                          ((currentlyReading.currentPage || 0) / currentlyReading.pages) * 100
                        )}
                        % lido
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#eeeae2] dark:bg-[#252a35] overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            ((currentlyReading.currentPage || 0) / currentlyReading.pages) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#8c94a0]">
                      Restam cerca de{" "}
                      {currentlyReading.pages - (currentlyReading.currentPage || 0)} páginas
                      (~3 sessões estimadas).
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setProgressModalBook(currentlyReading)}
                      leftIcon={<BookmarkCheck className="h-4 w-4" />}
                    >
                      Registrar Páginas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFavorite(currentlyReading)}
                      className="text-xs"
                    >
                      {currentlyReading.isFavorite ? "Favoritado" : "Favoritar"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </section>

        {/* Metas & Métricas Rápidas */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-[#6b7280] dark:text-[#9ca3af]">
                <span className="text-xs font-medium">Meta Anual</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-1">18 / 24</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                75% da meta concluída
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-[#6b7280] dark:text-[#9ca3af]">
                <span className="text-xs font-medium">Páginas Lidas</span>
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-1">5.840</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                +420 este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-[#6b7280] dark:text-[#9ca3af]">
                <span className="text-xs font-medium">Ritmo Médio</span>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-1">42 min</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                Por dia de leitura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between text-[#6b7280] dark:text-[#9ca3af]">
                <span className="text-xs font-medium">Total na Estante</span>
                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-1">128</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-[#6b7280] dark:text-[#9ca3af]">
                Livros catalogados
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Minha Estante Recente */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#141618] dark:text-[#f3f4f6]">
                Minha Estante Recente
              </h2>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                Acesse rapidamente suas leituras em andamento, desejos e livros concluídos.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap select-none ${
                      isActive
                        ? "bg-[#141618] text-white dark:bg-white dark:text-[#111317] shadow-sm"
                        : "bg-[#eeeae2] dark:bg-[#1f232c] text-[#525b6a] dark:text-[#9ca3af] hover:bg-[#e4dfd5] dark:hover:bg-[#282e3a]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Book Cards Grid */}
          {isLoadingDemo ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {[...Array(6)].map((_, idx) => (
                <BookCardSkeleton key={idx} />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#e5e0d8] dark:border-[#272b35] bg-white/50 dark:bg-[#181b22]/50">
              <SlidersHorizontal className="h-8 w-8 mx-auto text-[#9ca3af] mb-3" />
              <h3 className="font-serif text-base font-semibold text-[#141618] dark:text-[#f3f4f6]">
                Nenhum livro encontrado
              </h3>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-1 max-w-sm mx-auto">
                Não há livros correspondentes a esta busca ou filtro. Tente ajustar os termos ou
                adicione novos títulos.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpenDetails={(b) => setProgressModalBook(b)}
                  onUpdateProgress={(b) => setProgressModalBook(b)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <AddBookModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onAddBook={handleAddBook}
      />

      <ReadingProgressModal
        isOpen={!!progressModalBook}
        onClose={() => setProgressModalBook(null)}
        book={progressModalBook}
        onSaveProgress={handleSaveProgress}
      />
    </AppShell>
  );
}
