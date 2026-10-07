"use client";

import React from "react";
import { Star, MoreVertical, BookOpen, BookmarkCheck, Heart, Trash2 } from "lucide-react";
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
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  pages: number;
  currentPage?: number;
  status: BadgeVariant;
  statusLabel: string;
  rating?: number;
  isFavorite?: boolean;
}

export interface BookCardProps {
  book: BookItem;
  onOpenDetails?: (book: BookItem) => void;
  onUpdateProgress?: (book: BookItem) => void;
  onToggleFavorite?: (book: BookItem) => void;
}

export function BookCard({
  book,
  onOpenDetails,
  onUpdateProgress,
  onToggleFavorite,
}: BookCardProps) {
  return (
    <div
      onClick={() => onOpenDetails?.(book)}
      className="group flex flex-col cursor-pointer select-none"
    >
      {/* Book Cover Container with editorial shadows and realistic spine */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-book group-hover:shadow-book-hover transition-all duration-300 group-hover:-translate-y-1.5 bg-[#e8e4dc] dark:bg-[#252a35] book-spine">
        {/* Cover Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={book.coverUrl}
          alt={`Capa de ${book.title}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* Favorite Heart Badge Overlay */}
        {book.isFavorite && (
          <div className="absolute top-2.5 right-2.5 z-20 h-6 w-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-rose-400">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
        )}

        {/* Floating Quick Action Trigger */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2.5 left-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Dropdown>
            <DropdownTrigger>
              <div className="h-7 w-7 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow">
                <MoreVertical className="h-4 w-4" />
              </div>
            </DropdownTrigger>
            <DropdownMenu align="left" className="w-44">
              <DropdownItem
                icon={<BookOpen className="h-3.5 w-3.5" />}
                onClick={() => onOpenDetails?.(book)}
              >
                Ver Ficha do Livro
              </DropdownItem>
              <DropdownItem
                icon={<BookmarkCheck className="h-3.5 w-3.5" />}
                onClick={() => onUpdateProgress?.(book)}
              >
                Atualizar Progresso
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
                onClick={() => alert(`Livro "${book.title}" selecionado para remoção.`)}
              >
                Remover da Estante
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        {/* Subtle reading progress overlay at the bottom if reading */}
        {book.status === "reading" && book.currentPage && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 text-white text-[11px] font-medium z-10">
            <div className="flex justify-between items-center mb-1 text-[10px] text-white/90">
              <span>{Math.round((book.currentPage / book.pages) * 100)}%</span>
              <span>{book.currentPage}/{book.pages} pág</span>
            </div>
            <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
              <div
                className="bg-blue-400 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (book.currentPage / book.pages) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Book Metadata */}
      <div className="mt-3 space-y-1">
        <h4 className="font-serif text-sm font-semibold text-[#141618] dark:text-[#f3f4f6] line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {book.title}
        </h4>
        <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] line-clamp-1">
          {book.author}
        </p>

        {/* Rating and Status Badge */}
        <div className="flex items-center justify-between pt-1 gap-1">
          <Badge variant={book.status} size="sm" dot>
            {book.statusLabel}
          </Badge>

          {book.rating ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" />
              <span>{book.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
