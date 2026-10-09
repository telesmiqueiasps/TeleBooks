"use client";

import React, { useState } from "react";
import {
  Star,
  Heart,
  BookmarkCheck,
  BookOpen,
  MoreVertical,
  Trash2,
  Sliders,
  Layers,
  BookMarked,
  Sparkles,
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

export interface BookshelfViewProps {
  books: UserBook[];
  onOpenDetails: (item: BookItem) => void;
  onUpdateProgress: (item: BookItem) => void;
  onToggleFavorite: (item: BookItem) => void;
  onRemoveFromShelf: (item: BookItem) => void;
  isLoading?: boolean;
}

interface SpinePalette {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

// Paleta editorial nobre para lombadas quando não houver cor personalizada
const SPINE_PALETTES: SpinePalette[] = [
  { bg: "bg-[#1E3A8A]", text: "text-blue-100", border: "border-blue-900", accent: "#3B82F6" },
  { bg: "bg-[#7F1D1D]", text: "text-rose-100", border: "border-rose-950", accent: "#EF4444" },
  { bg: "bg-[#14532D]", text: "text-emerald-100", border: "border-emerald-950", accent: "#10B981" },
  { bg: "bg-[#581C87]", text: "text-purple-100", border: "border-purple-950", accent: "#8B5CF6" },
  { bg: "bg-[#78350F]", text: "text-amber-100", border: "border-amber-950", accent: "#F59E0B" },
  { bg: "bg-[#0F172A]", text: "text-slate-100", border: "border-slate-900", accent: "#64748B" },
  { bg: "bg-[#831843]", text: "text-pink-100", border: "border-pink-950", accent: "#EC4899" },
  { bg: "bg-[#164E63]", text: "text-cyan-100", border: "border-cyan-950", accent: "#06B6D4" },
];

function getSpineTheme(
  id: string,
  customColor?: string | null
): {
  bg: string;
  text: string;
  border: string;
  accent: string;
  style?: React.CSSProperties;
} {
  if (customColor && customColor.startsWith("#")) {
    return {
      bg: "",
      style: { backgroundColor: customColor },
      text: "text-white",
      border: "border-black/20",
      accent: customColor,
    };
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SPINE_PALETTES.length;
  const palette = SPINE_PALETTES[index] ?? SPINE_PALETTES[0]!;
  return {
    bg: palette.bg,
    text: palette.text,
    border: palette.border,
    accent: palette.accent,
    style: undefined,
  };
}

export function BookshelfView({
  books,
  onOpenDetails,
  onUpdateProgress,
  onToggleFavorite,
  onRemoveFromShelf,
  isLoading = false,
}: BookshelfViewProps) {
  // Modo interno da estante: lombadas em pé ("spines") ou capas apoiadas na prateleira ("covers")
  const [shelfStyle, setShelfStyle] = useState<"spines" | "covers">("spines");
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null);

  // Divide os livros em prateleiras horizontais com 6 a 8 livros por prancha
  const BOOKS_PER_SHELF = shelfStyle === "spines" ? 8 : 6;
  const shelves: UserBook[][] = [];
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    shelves.push(books.slice(i, i + BOOKS_PER_SHELF));
  }

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
      <div className="space-y-12 py-4 select-none">
        {[1, 2, 3].map((shelfIdx) => (
          <div key={shelfIdx} className="relative">
            {/* Skeletons de livros na estante */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 px-6 h-56 pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-10 sm:w-14 rounded-t-md bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style={{ height: `${140 + (i % 4) * 20}px` }}
                />
              ))}
            </div>
            {/* Prancha de madeira */}
            <div className="h-4 w-full rounded bg-amber-900/40 dark:bg-amber-950/60 shadow-md" />
            <div className="h-3 w-full bg-amber-950/20 dark:bg-black/40" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Barra de controle visual da Estante */}
      <div className="flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <BookMarked className="w-4 h-4 text-[#007BFF]" />
          <span className="font-medium">
            Exibindo estante com {books.length} {books.length === 1 ? "livro" : "livros"}
          </span>
        </div>

        {/* Alternador de exibição interna: Lombadas vs Capas */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setShelfStyle("spines")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              shelfStyle === "spines"
                ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lombadas</span>
          </button>
          <button
            type="button"
            onClick={() => setShelfStyle("covers")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              shelfStyle === "covers"
                ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Capas Expostas</span>
          </button>
        </div>
      </div>

      {/* Conjunto de Prateleiras da Biblioteca */}
      <div className="space-y-12 sm:space-y-16 py-2 select-none">
        {shelves.map((shelfBooks, shelfIndex) => (
          <div key={shelfIndex} className="relative group/shelf">
            {/* Parede de Fundo Sutil da Estante */}
            <div className="absolute inset-0 -top-4 rounded-2xl bg-gradient-to-b from-transparent via-amber-950/[0.02] to-amber-950/[0.05] dark:via-black/20 dark:to-black/40 pointer-events-none -z-10" />

            {/* Linha de Livros na Prateleira */}
            <div
              className={`flex items-end px-4 sm:px-8 pb-0 overflow-x-auto no-scrollbar scroll-smooth ${
                shelfStyle === "spines"
                  ? "justify-center gap-1 sm:gap-2.5 h-64 sm:h-72"
                  : "justify-center gap-4 sm:gap-8 h-72 sm:h-80"
              }`}
            >
              {shelfBooks.map((userBook) => {
                const item = toBookItem(userBook);
                const isHovered = hoveredBookId === userBook.id;

                if (shelfStyle === "spines") {
                  // MODO LOMBADAS EM PÉ (BOOK SPINES)
                  const theme = getSpineTheme(userBook.id, userBook.personal_color);
                  // Altura e largura proporcionais ao número de páginas
                  const pages = item.pages || 250;
                  const heightPx = Math.min(250, Math.max(180, 180 + (pages % 70)));
                  const widthPx = Math.min(52, Math.max(28, 28 + Math.floor(pages / 80)));
                  const percent =
                    item.pages > 0 && item.currentPage !== undefined
                      ? Math.min(100, Math.round((item.currentPage / item.pages) * 100))
                      : 0;

                  return (
                    <div
                      key={userBook.id}
                      onMouseEnter={() => setHoveredBookId(userBook.id)}
                      onMouseLeave={() => setHoveredBookId(null)}
                      onClick={() => onOpenDetails(item)}
                      style={{
                        height: `${heightPx}px`,
                        width: `${widthPx}px`,
                      }}
                      className="group/book relative cursor-pointer transition-all duration-300 transform hover:-translate-y-4 hover:scale-[1.03] shrink-0"
                    >
                      {/* Lombada com texturas de relevo editorial e costura */}
                      <div
                        style={theme.style}
                        className={`relative h-full w-full rounded-t-sm shadow-[inset_-2px_0_4px_rgba(0,0,0,0.35),inset_2px_0_4px_rgba(255,255,255,0.2),2px_4px_10px_rgba(0,0,0,0.25)] border-t border-r border-l ${
                          theme.bg || ""
                        } ${theme.border || "border-black/30"} flex flex-col justify-between items-center py-2 px-1 overflow-hidden transition-all duration-200`}
                      >
                        {/* Friso dourado / metálico superior da encadernação */}
                        <div className="w-full flex flex-col items-center gap-0.5 opacity-60">
                          <span className="w-4/5 h-[1.5px] bg-amber-200/70 rounded-full" />
                          <span className="w-3/5 h-[1px] bg-amber-200/50 rounded-full" />
                        </div>

                        {/* Fita marcadora / coração no topo se for favorito */}
                        {item.isFavorite && (
                          <div className="absolute top-3 z-10">
                            <Heart className="w-3 h-3 text-rose-300 fill-current drop-shadow" />
                          </div>
                        )}

                        {/* Título e Autor na Lombada com escrita vertical */}
                        <div className="flex-1 flex flex-col items-center justify-center my-2 max-h-[75%] overflow-hidden">
                          <span
                            className={`text-[11px] sm:text-xs font-semibold tracking-wider uppercase font-display leading-none line-clamp-1 ${
                              theme.text || "text-white"
                            } [writing-mode:vertical-rl] rotate-180 drop-shadow-sm select-none`}
                          >
                            {item.title}
                          </span>
                        </div>

                        {/* Friso e Autor no rodapé da lombada */}
                        <div className="w-full flex flex-col items-center gap-1 opacity-75">
                          <span
                            className={`text-[9px] font-sans font-medium line-clamp-1 [writing-mode:vertical-rl] rotate-180 ${
                              theme.text || "text-white"
                            }`}
                          >
                            {item.author.split(",")[0]?.split(" ").slice(-1)[0]}
                          </span>
                          <span className="w-4/5 h-[1.5px] bg-amber-200/60 rounded-full" />
                        </div>

                        {/* Indicador sutil de leitura em andamento na base */}
                        {item.status === "reading" && (
                          <div
                            className="absolute bottom-0 inset-x-0 h-1.5 bg-[#007BFF] shadow-[0_0_8px_#007BFF]"
                            title={`${percent}% lido`}
                          />
                        )}
                      </div>

                      {/* Card Flutuante / Popover de Prévia no Hover */}
                      {isHovered && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-64 p-3.5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-[0_15px_35px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-150 text-left cursor-default pointer-events-auto"
                        >
                          <div className="flex gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="w-14 h-20 rounded-md object-cover shadow-md shrink-0 book-spine"
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-display text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                                {item.title}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {item.author}
                              </p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <Badge variant={item.status} size="sm" dot>
                                  {item.statusLabel}
                                </Badge>
                                {item.rating ? (
                                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    {item.rating.toFixed(1)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Barra de progresso no card */}
                          {item.status === "reading" && item.pages > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                                <span>Progresso</span>
                                <span className="font-semibold text-[#007BFF]">
                                  {percent}% ({item.currentPage}/{item.pages} pág)
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#007BFF] rounded-full transition-all"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Botões de Ação Rápida */}
                          <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <button
                              type="button"
                              onClick={() => onOpenDetails(item)}
                              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#007BFF] hover:text-white text-slate-700 dark:text-slate-200 transition-colors font-medium flex items-center gap-1"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Ficha</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateProgress(item)}
                              className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-[#007BFF] hover:text-white text-[#007BFF] transition-colors font-medium flex items-center gap-1"
                            >
                              <BookmarkCheck className="w-3 h-3" />
                              <span>Leitura</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleFavorite(item)}
                              className={`p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ${
                                item.isFavorite ? "text-rose-500" : "text-slate-400"
                              }`}
                              title={item.isFavorite ? "Remover dos Favoritos" : "Favoritar"}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-current" : ""}`}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  // MODO CAPAS APOIADAS NA PRATELEIRA (FRONT-FACING COVERS)
                  const percent =
                    item.pages > 0 && item.currentPage !== undefined
                      ? Math.min(100, Math.round((item.currentPage / item.pages) * 100))
                      : 0;

                  return (
                    <div
                      key={userBook.id}
                      onClick={() => onOpenDetails(item)}
                      className="group/cover relative cursor-pointer transition-all duration-300 transform hover:-translate-y-3 hover:scale-[1.04] shrink-0 w-32 sm:w-40"
                    >
                      {/* Capa com sombra realista projetada na prateleira */}
                      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden shadow-[0_12px_25px_-5px_rgba(0,0,0,0.35)] group-hover/cover:shadow-[0_20px_35px_-5px_rgba(0,123,255,0.3)] bg-slate-200 dark:bg-slate-800 book-spine">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />

                        {/* Badge de Favorito */}
                        {item.isFavorite && (
                          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-rose-400 shadow">
                            <Heart className="h-3.5 w-3.5 fill-current" />
                          </div>
                        )}

                        {/* Barra de progresso para livros em leitura */}
                        {item.status === "reading" && (
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-4">
                            <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#007BFF] rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Título e autor no rodapé flutuante */}
                      <div className="mt-1.5 text-center">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* PRANCHA DE MADEIRA EDITORIAL REALISTA COM 3D DEPTH */}
            <div className="relative w-full z-10">
              {/* Superfície Superior da Prancha (Deck onde o livro assenta) */}
              <div className="h-3 sm:h-3.5 w-full bg-gradient-to-r from-[#C7B299] via-[#E2D4BE] to-[#C7B299] dark:from-[#252830] dark:via-[#363B48] dark:to-[#252830] border-t border-white/40 dark:border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]" />

              {/* Borda Frontal da Prancha com Relevo e Chanfro */}
              <div className="h-3 sm:h-4 w-full bg-gradient-to-b from-[#A89078] to-[#8D735C] dark:from-[#1D2028] dark:to-[#12141A] border-t border-[#8D735C] dark:border-black/50 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.35)] flex items-center justify-between px-6">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-950/20 dark:bg-white/10" />
                <span className="text-[9px] uppercase tracking-widest font-semibold text-amber-950/30 dark:text-white/20 select-none">
                  TeleBooks Shelf {shelfIndex + 1}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-950/20 dark:bg-white/10" />
              </div>

              {/* Sombra Profunda Projetada na Parede Abaixo da Prateleira */}
              <div className="h-4 sm:h-5 w-full bg-gradient-to-b from-black/25 dark:from-black/60 to-transparent pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
