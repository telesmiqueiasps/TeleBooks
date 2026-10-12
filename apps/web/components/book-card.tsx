"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Star, MoreVertical, BookOpen, BookmarkCheck, Heart, Trash2, Plus, ExternalLink } from "lucide-react";
import {
  Badge,
  BadgeVariant,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@telebooks/ui";

export interface BookItem {
  id: string; // user_book_id or book_id
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  pages: number;
  currentPage?: number;
  status: BadgeVariant;
  statusLabel: string;
  rating?: number;
  isFavorite?: boolean;
  isInShelf?: boolean;
  personalColor?: string | null;
  tags?: Array<{ id: string; name: string; color?: string | null }>;
  collections?: Array<{ id: string; name: string }>;
}

export interface BookCardProps {
  book: BookItem;
  onOpenDetails?: (book: BookItem) => void;
  onUpdateProgress?: (book: BookItem) => void;
  onToggleFavorite?: (book: BookItem) => void;
  onAddToShelf?: (book: BookItem) => void;
  onRemoveFromShelf?: (book: BookItem) => void;
}

export function BookCard({
  book,
  onOpenDetails,
  onUpdateProgress,
  onToggleFavorite,
  onAddToShelf,
  onRemoveFromShelf,
}: BookCardProps) {
  const router = useRouter();
  const percent =
    book.pages > 0 && book.currentPage !== undefined
      ? Math.min(100, Math.round((book.currentPage / book.pages) * 100))
      : 0;

  return (
    <div
      onClick={() => onOpenDetails?.(book)}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* Book Cover Container with editorial shadows and realistic spine */}
      <div className="relative aspect-[2/3] w-full rounded-lg sm:rounded-xl overflow-hidden shadow-book group-hover:shadow-book-hover transition-all duration-300 group-hover:-translate-y-1.5 bg-[#e8e4dc] dark:bg-[#252a35] book-spine">
        {/* Cover Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            book.coverUrl ||
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600"
          }
          alt={`Capa de ${book.title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* Favorite Heart Badge Overlay */}
        {book.isFavorite && (
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-20 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-rose-400">
            <Heart className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-current" />
          </div>
        )}

        {/* Personal Color Accent Strip along Spine */}
        {book.personalColor && (
          <div
            className="absolute top-0 bottom-0 left-0 w-1 sm:w-1.5 z-10 shadow-xs"
            style={{ backgroundColor: book.personalColor }}
            title="Cor pessoal da lombada"
          />
        )}

        {/* Floating Quick Action Trigger */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1 sm:top-2 left-1 sm:left-2 z-20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
        >
          <Dropdown>
            <DropdownTrigger>
              <div className="h-5 w-5 sm:h-7 sm:w-7 rounded-md sm:rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow">
                <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            </DropdownTrigger>
            <DropdownMenu align="left" className="w-48">
              <DropdownItem
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                onClick={() => router.push(`/livros/${book.bookId}`)}
              >
                Abrir Página Completa
              </DropdownItem>
              <DropdownItem
                icon={<BookOpen className="h-3.5 w-3.5" />}
                onClick={() => onOpenDetails?.(book)}
              >
                Ver Ficha Rápida
              </DropdownItem>

              {book.isInShelf ? (
                <>
                  <DropdownItem
                    icon={<BookmarkCheck className="h-3.5 w-3.5" />}
                    onClick={() => onUpdateProgress?.(book)}
                  >
                    Editar Leitura na Estante
                  </DropdownItem>
                  <DropdownItem
                    icon={<Heart className="h-3.5 w-3.5" />}
                    onClick={() => onToggleFavorite?.(book)}
                  >
                    {book.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem
                    danger
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => onRemoveFromShelf?.(book)}
                  >
                    Remover da Estante
                  </DropdownItem>
                </>
              ) : (
                <DropdownItem
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => onAddToShelf?.(book)}
                >
                  Adicionar à Estante
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Subtle reading progress overlay at the bottom if reading */}
        {book.status === "reading" && book.currentPage !== undefined && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-1.5 pt-4 sm:p-2.5 sm:pt-6 text-white text-[9px] sm:text-[11px] font-medium z-10">
            <div className="flex justify-between items-center mb-0.5 text-[8px] sm:text-[10px] text-white/90">
              <span>{percent}%</span>
              <span>
                {book.currentPage}/{book.pages} pág
              </span>
            </div>
            <div className="w-full bg-white/30 h-1 sm:h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#007BFF] h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Book Metadata */}
      <div className="mt-1.5 sm:mt-2.5 space-y-0.5 sm:space-y-1">
        <h4 className="font-display text-[11px] sm:text-xs md:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] line-clamp-1 group-hover:text-[#007BFF] transition-colors leading-tight">
          {book.title}
        </h4>
        <p className="text-[9px] sm:text-[11px] md:text-xs text-[#64748B] dark:text-[#94A3B8] line-clamp-1 font-sans leading-tight">
          {book.author}
        </p>

        {/* Rating and Status Badge */}
        <div className="flex items-center justify-between pt-0.5 gap-1">
          <Badge
            variant={book.status}
            size="sm"
            dot
            className="text-[9px] sm:text-[11px] px-1 sm:px-2 py-0 sm:py-0.5 max-w-[65px] sm:max-w-none truncate"
          >
            {book.statusLabel}
          </Badge>

          {book.rating ? (
            <div className="flex items-center gap-0.5 text-[9px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
              <span>{book.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {/* User Tags Chips */}
        {book.tags && book.tags.length > 0 && (
          <div className="hidden sm:flex flex-wrap items-center gap-1 pt-0.5 overflow-hidden">
            {book.tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[90px]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color || "#007BFF" }}
                />
                #{t.name}
              </span>
            ))}
            {book.tags.length > 2 && (
              <span className="text-[10px] text-slate-400 font-medium">
                +{book.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
