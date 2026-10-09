"use client";

import React from "react";
import {
  Star,
  Heart,
  BookmarkCheck,
  BookOpen,
  MoreVertical,
  Trash2,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import type { UserBook } from "@telebooks/types";
import {
  Badge,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@telebooks/ui";
import type { BookItem } from "../book-card";

export interface ShelfListViewProps {
  books: UserBook[];
  onOpenDetails: (item: BookItem) => void;
  onUpdateProgress: (item: BookItem) => void;
  onToggleFavorite: (item: BookItem) => void;
  onRemoveFromShelf: (item: BookItem) => void;
  isLoading?: boolean;
}

export function ShelfListView({
  books,
  onOpenDetails,
  onUpdateProgress,
  onToggleFavorite,
  onRemoveFromShelf,
  isLoading = false,
}: ShelfListViewProps) {
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
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 animate-pulse"
          >
            <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0F172A] shadow-sm overflow-hidden">
      {/* Cabeçalho da Tabela (Desktop) */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <div className="col-span-5">Livro & Autor</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Progresso</div>
        <div className="col-span-1 text-center">Nota</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {/* Lista de Livros */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {books.map((userBook) => {
          const item = toBookItem(userBook);
          const percent =
            item.pages > 0 && item.currentPage !== undefined
              ? Math.min(100, Math.round((item.currentPage / item.pages) * 100))
              : 0;

          return (
            <div
              key={userBook.id}
              onClick={() => onOpenDetails(item)}
              className="group flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer select-none items-center"
            >
              {/* Coluna 1: Capa + Detalhes Bibliográficos */}
              <div className="col-span-5 flex items-center gap-3.5 w-full min-w-0">
                {/* Capa */}
                <div className="relative w-12 sm:w-14 aspect-[2/3] rounded-lg overflow-hidden shrink-0 shadow-sm border border-slate-200/60 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-800 book-spine">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  {item.isFavorite && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-rose-400">
                      <Heart className="h-2.5 w-2.5 fill-current" />
                    </div>
                  )}
                </div>

                {/* Metadados */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-[#007BFF] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.author}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {userBook.book?.publisher && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">
                          {userBook.book.publisher.name}
                        </span>
                      </span>
                    )}

                    {userBook.book?.genres && userBook.book.genres[0] && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                        {userBook.book.genres[0].name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna 2: Status */}
              <div className="col-span-2 flex items-center w-full lg:w-auto justify-between lg:justify-start">
                <span className="lg:hidden text-xs text-slate-400 font-medium">Status:</span>
                <Badge variant={item.status} size="sm" dot>
                  {item.statusLabel}
                </Badge>
              </div>

              {/* Coluna 3: Progresso de Leitura */}
              <div className="col-span-2 flex flex-col justify-center w-full">
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span>
                    {item.pages > 0
                      ? `${item.currentPage || 0} de ${item.pages} pág`
                      : "Sem páginas"}
                  </span>
                  <span className="font-semibold text-[#007BFF]">{percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#006CEB] to-[#007BFF] rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Coluna 4: Avaliação */}
              <div className="col-span-1 flex items-center justify-between lg:justify-center w-full lg:w-auto">
                <span className="lg:hidden text-xs text-slate-400 font-medium">Avaliação:</span>
                {item.rating ? (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                )}
              </div>

              {/* Coluna 5: Ações Rápidas */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="col-span-2 flex items-center justify-end gap-1.5 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800/60"
              >
                {/* Botão de Leitura Rápida */}
                <button
                  type="button"
                  onClick={() => onUpdateProgress(item)}
                  title="Atualizar Leitura"
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-[#007BFF] hover:bg-[#007BFF] hover:text-white transition-colors flex items-center gap-1"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Progresso</span>
                </button>

                {/* Botão de Favorito */}
                <button
                  type="button"
                  onClick={() => onToggleFavorite(item)}
                  title={item.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
                  className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    item.isFavorite
                      ? "text-rose-500"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${item.isFavorite ? "fill-current" : ""}`} />
                </button>

                {/* Dropdown de Opções */}
                <Dropdown>
                  <DropdownTrigger>
                    <div className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </DropdownTrigger>
                  <DropdownMenu align="right" className="w-48">
                    <DropdownItem
                      icon={<BookOpen className="w-4 h-4" />}
                      onClick={() => onOpenDetails(item)}
                    >
                      Ver Detalhes do Livro
                    </DropdownItem>
                    <DropdownItem
                      icon={<BookmarkCheck className="w-4 h-4" />}
                      onClick={() => onUpdateProgress(item)}
                    >
                      Editar Progresso
                    </DropdownItem>
                    <DropdownItem
                      icon={<Heart className="w-4 h-4" />}
                      onClick={() => onToggleFavorite(item)}
                    >
                      {item.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem
                      danger
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={() => onRemoveFromShelf(item)}
                    >
                      Remover da Estante
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
