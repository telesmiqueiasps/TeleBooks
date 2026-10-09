"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  LayoutGrid,
  List,
  BookMarked,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Check,
  RotateCcw,
  Star,
  Heart,
  ChevronDown,
} from "lucide-react";
import type { Author, Publisher, Genre, BookStatus } from "@telebooks/types";

export type ViewMode = "grid" | "list" | "bookshelf";

export interface ShelfFilterValues {
  q: string;
  status: string; // "all", "reading", "want_to_read", "read", "paused", "abandoned", "favorite"
  author_id?: string;
  publisher_id?: string;
  genre_id?: string;
  min_rating?: number;
  sort_by: string;
  page_size: number;
}

export interface ShelfFiltersProps {
  filters: ShelfFilterValues;
  onChange: (newFilters: ShelfFilterValues) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  authors: Author[];
  publishers: Publisher[];
  genres: Genre[];
  totalBooks?: number;
}

export const SORT_OPTIONS = [
  { id: "updated_at_desc", label: "Atualizados recentemente" },
  { id: "created_at_desc", label: "Adicionados recentemente" },
  { id: "title_asc", label: "Título (A → Z)" },
  { id: "title_desc", label: "Título (Z → A)" },
  { id: "rating_desc", label: "Melhor avaliados (5★ → 1★)" },
  { id: "pages_desc", label: "Mais páginas" },
  { id: "progress_desc", label: "Maior progresso de leitura" },
];

export const STATUS_PILLS = [
  { id: "all", label: "Todos os Livros" },
  { id: "reading", label: "Lendo" },
  { id: "want_to_read", label: "Quero Ler" },
  { id: "read", label: "Lidos" },
  { id: "favorite", label: "Favoritos" },
  { id: "paused", label: "Pausados" },
  { id: "abandoned", label: "Abandonados" },
];

export function ShelfFilters({
  filters,
  onChange,
  viewMode,
  onViewModeChange,
  authors,
  publishers,
  genres,
  totalBooks,
}: ShelfFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Calcula quantos filtros avançados estão ativos
  const activeAdvancedCount = [
    filters.author_id,
    filters.publisher_id,
    filters.genre_id,
    filters.min_rating,
  ].filter(Boolean).length;

  const handleSearchChange = (val: string) => {
    onChange({ ...filters, q: val });
  };

  const handleStatusChange = (status: string) => {
    onChange({ ...filters, status });
  };

  const handleSortChange = (sort_by: string) => {
    onChange({ ...filters, sort_by });
  };

  const clearAllFilters = () => {
    onChange({
      ...filters,
      q: "",
      status: "all",
      author_id: undefined,
      publisher_id: undefined,
      genre_id: undefined,
      min_rating: undefined,
    });
  };

  const hasAnyFilterActive =
    Boolean(filters.q) ||
    filters.status !== "all" ||
    Boolean(filters.author_id) ||
    Boolean(filters.publisher_id) ||
    Boolean(filters.genre_id) ||
    filters.min_rating !== undefined;

  // Busca nomes das entidades selecionadas para os chips
  const selectedAuthor = authors.find((a) => a.id === filters.author_id)?.name;
  const selectedPublisher = publishers.find((p) => p.id === filters.publisher_id)?.name;
  const selectedGenre = genres.find((g) => g.id === filters.genre_id)?.name;

  return (
    <div className="space-y-4">
      {/* Linha Principal de Controles */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={filters.q}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por título, autor ou ISBN..."
            className="w-full pl-10 pr-9 py-2.5 rounded-full text-xs bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all shadow-sm"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grupo de Ações: Ordenação, Botão de Filtros e Modos de Visualização */}
        <div className="flex items-center gap-2 justify-between sm:justify-end overflow-x-auto pb-1 sm:pb-0">
          {/* Seletor de Ordenação */}
          <div className="relative shrink-0">
            <select
              value={filters.sort_by}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none pl-8 pr-7 py-2 rounded-full text-xs font-medium bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-[#007BFF] transition-all cursor-pointer shadow-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Botão de Filtros Avançados */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all shrink-0 border ${
              isAdvancedOpen || activeAdvancedCount > 0
                ? "bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/40 font-semibold"
                : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {activeAdvancedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#007BFF] text-white text-[10px] font-bold flex items-center justify-center">
                {activeAdvancedCount}
              </span>
            )}
          </button>

          {/* Alternador dos 3 Modos de Visualização (Grid, Lista e Estante) */}
          <div className="flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Grid de Capas"
              className={`p-1.5 rounded-full transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              title="Lista Detalhada"
              className={`p-1.5 rounded-full transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("bookshelf")}
              title="Modo Estante"
              className={`p-1.5 rounded-full transition-all ${
                viewMode === "bookshelf"
                  ? "bg-white dark:bg-[#0F172A] text-[#007BFF] shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BookMarked className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pílulas de Status Rápidas (Scroll Horizontal) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {STATUS_PILLS.map((pill) => {
          const isActive = filters.status === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => handleStatusChange(pill.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#007BFF] text-white shadow-sm shadow-[#007BFF]/25 font-semibold"
                  : "bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-xs"
              }`}
            >
              {pill.id === "favorite" && (
                <Heart
                  className={`w-3 h-3 inline mr-1 -mt-0.5 ${
                    isActive ? "fill-current text-white" : "text-rose-500 fill-current"
                  }`}
                />
              )}
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* Painel Expansível de Filtros Avançados */}
      {isAdvancedOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#007BFF]" />
              <span>Filtros Específicos</span>
            </span>
            {activeAdvancedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    author_id: undefined,
                    publisher_id: undefined,
                    genre_id: undefined,
                    min_rating: undefined,
                  })
                }
                className="text-xs text-[#007BFF] hover:underline font-medium"
              >
                Limpar filtros específicos
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Filtro por Autor */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Autor
              </label>
              <select
                value={filters.author_id || ""}
                onChange={(e) =>
                  onChange({ ...filters, author_id: e.target.value || undefined })
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007BFF]"
              >
                <option value="">Todos os Autores</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Editora */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Editora
              </label>
              <select
                value={filters.publisher_id || ""}
                onChange={(e) =>
                  onChange({ ...filters, publisher_id: e.target.value || undefined })
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007BFF]"
              >
                <option value="">Todas as Editoras</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Gênero */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Gênero Literário
              </label>
              <select
                value={filters.genre_id || ""}
                onChange={(e) =>
                  onChange({ ...filters, genre_id: e.target.value || undefined })
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007BFF]"
              >
                <option value="">Todos os Gêneros</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Avaliação Mínima */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Avaliação Mínima
              </label>
              <select
                value={filters.min_rating !== undefined ? filters.min_rating.toString() : ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    min_rating: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#007BFF]"
              >
                <option value="">Qualquer Avaliação</option>
                <option value="5">Apenas 5 Estrelas (★★★★★)</option>
                <option value="4">4 Estrelas ou mais (★★★★☆)</option>
                <option value="3">3 Estrelas ou mais (★★★☆☆)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Chips de Filtros Ativos (com remoção individual) */}
      {hasAnyFilterActive && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs select-none">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Filtros ativos:</span>

          {filters.q && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#007BFF] font-medium">
              Busca: &ldquo;{filters.q}&rdquo;
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="hover:text-blue-900 dark:hover:text-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.status !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              Status: {STATUS_PILLS.find((p) => p.id === filters.status)?.label}
              <button
                type="button"
                onClick={() => handleStatusChange("all")}
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedAuthor && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              Autor: {selectedAuthor}
              <button
                type="button"
                onClick={() => onChange({ ...filters, author_id: undefined })}
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedPublisher && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              Editora: {selectedPublisher}
              <button
                type="button"
                onClick={() => onChange({ ...filters, publisher_id: undefined })}
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedGenre && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              Gênero: {selectedGenre}
              <button
                type="button"
                onClick={() => onChange({ ...filters, genre_id: undefined })}
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.min_rating && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 font-medium">
              Avaliação: {filters.min_rating}★+
              <button
                type="button"
                onClick={() => onChange({ ...filters, min_rating: undefined })}
                className="hover:text-amber-900 dark:hover:text-amber-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-500 transition-colors ml-1 font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        </div>
      )}
    </div>
  );
}
