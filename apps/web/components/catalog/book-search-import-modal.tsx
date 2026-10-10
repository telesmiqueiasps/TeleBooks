"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Library,
  BookmarkCheck,
  Globe,
  SlidersHorizontal,
  Barcode,
  Layers,
  FileText,
  Building2,
  Calendar,
  ExternalLink,
  Plus,
  Loader2,
  Camera,
  ScanLine,
} from "lucide-react";
import { Modal, Button, Input, Badge } from "@telebooks/ui";
import type {
  Book,
  BookStatus,
  ExternalBookItem,
  BookImportConfirmResponse,
} from "@telebooks/types";
import { api } from "../../lib/api";
import { IsbnScannerModal } from "./isbn-scanner-modal";

export interface BookSearchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (book: Book, response: BookImportConfirmResponse) => void;
  onOpenManualForm?: () => void;
}

export function BookSearchImportModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenManualForm,
}: BookSearchImportModalProps) {
  // Estados de busca
  const [query, setQuery] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [filterTitle, setFilterTitle] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [filterIsbn, setFilterIsbn] = useState("");
  const [provider, setProvider] = useState<"brasil_api" | "google_books" | "open_library">("brasil_api");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Resultados
  const [results, setResults] = useState<ExternalBookItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Livro Selecionado para Confirmação
  const [selectedItem, setSelectedItem] = useState<ExternalBookItem | null>(null);
  const [shelfStatus, setShelfStatus] = useState<BookStatus>("want_to_read");
  const [addToShelf, setAddToShelf] = useState(true);

  // Submissão da confirmação
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<BookImportConfirmResponse | null>(null);

  const resetAll = () => {
    setQuery("");
    setFilterTitle("");
    setFilterAuthor("");
    setFilterIsbn("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    setSelectedItem(null);
    setIsConfirming(false);
    setConfirmError(null);
    setConfirmSuccess(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const executeSearch = async (params: {
    cleanQ?: string;
    cleanTitle?: string;
    cleanAuthor?: string;
    cleanIsbn?: string;
    targetProvider?: "brasil_api" | "google_books" | "open_library";
  }) => {
    try {
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);
      setSelectedItem(null);

      const items = await api.searchExternalBooks({
        q: params.cleanQ || undefined,
        title: params.cleanTitle || undefined,
        author: params.cleanAuthor || undefined,
        isbn: params.cleanIsbn || undefined,
        provider: params.targetProvider || provider,
        limit: 14,
      });

      setResults(items);
      if (items.length === 0) {
        setSearchError("Nenhum livro localizado para os termos informados. Verifique o código ISBN ou tente outro provedor.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao pesquisar livros externos.";
      setSearchError(msg);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanQ = query.trim();
    const cleanTitle = filterTitle.trim();
    const cleanAuthor = filterAuthor.trim();
    const cleanIsbn = filterIsbn.trim();

    if (!cleanQ && !cleanTitle && !cleanAuthor && !cleanIsbn) {
      setSearchError("Digite um termo de busca, título, autor ou código ISBN.");
      return;
    }

    await executeSearch({
      cleanQ,
      cleanTitle,
      cleanAuthor,
      cleanIsbn,
    });
  };

  const handleBarcodeScanned = async (scannedIsbn: string) => {
    setIsScannerOpen(false);
    setQuery(scannedIsbn);
    setFilterIsbn(scannedIsbn);

    // Dispara a busca imediata
    await executeSearch({
      cleanIsbn: scannedIsbn,
      targetProvider: provider,
    });
  };

  const handleSelectBook = (item: ExternalBookItem) => {
    setSelectedItem(item);
    setConfirmError(null);
    setConfirmSuccess(null);
  };

  const handleConfirmImport = async () => {
    if (!selectedItem) return;

    try {
      setIsConfirming(true);
      setConfirmError(null);

      const response = await api.confirmImportBook({
        title: selectedItem.title,
        subtitle: selectedItem.subtitle || null,
        authors: selectedItem.authors,
        publisher: selectedItem.publisher || null,
        description: selectedItem.description || null,
        isbn10: selectedItem.isbn10 || null,
        isbn13: selectedItem.isbn13 || null,
        page_count: selectedItem.page_count || null,
        published_date_raw: selectedItem.published_date || null,
        language: selectedItem.language || "pt-BR",
        cover_url: selectedItem.cover_url || null,
        thumbnail_url: selectedItem.thumbnail_url || null,
        genres: selectedItem.categories,
        add_to_shelf: addToShelf,
        shelf_status: shelfStatus,
      });

      setConfirmSuccess(response);
      if (onSuccess) {
        onSuccess(response.book, response);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao confirmar importação do livro.";
      setConfirmError(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-[#007BFF]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Buscar & Importar Livros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Pesquise por Título, Autor ou ISBN em bases bibliográficas mundiais
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-5">
        {/* ================================================================= */}
        {/* ETAPA 1: TELA DE BUSCA E LISTA DE RESULTADOS                      */}
        {/* ================================================================= */}
        {!selectedItem && !confirmSuccess && (
          <>
            {/* Barra de Busca e Filtros */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Digite o título, nome do autor ou código ISBN (ex: 9788535914849)..."
                    className="w-full h-11 pl-10 pr-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    title="Ler código de barras ISBN com a câmera do celular ou webcam"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-[#007BFF] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as "brasil_api" | "google_books" | "open_library")}
                    className="h-11 px-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-[#007BFF]"
                  >
                    <option value="brasil_api">🇧🇷 Brasil (CBL / Mercado Nacional)</option>
                    <option value="google_books">🌐 Google Books (Mundial)</option>
                    <option value="open_library">📚 Open Library (Acervo Aberto)</option>
                  </select>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSearching}
                    leftIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    className="h-11 px-5 rounded-2xl text-xs font-bold shrink-0 min-w-[100px]"
                  >
                    {isSearching ? "Buscando..." : "Pesquisar"}
                  </Button>
                </div>
              </div>

              {/* Barra de Ações Rápidas: Scanner por Câmera & Toggle Avançado */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#006CEB] to-[#007BFF] hover:from-[#005AC4] hover:to-[#006CEB] text-white font-semibold shadow-sm shadow-[#007BFF]/20 active:scale-95 transition-all"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>Escanear Código de Barras</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvancedMode(!advancedMode)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#007BFF]/40 text-slate-600 hover:text-[#007BFF] dark:text-slate-300 dark:hover:text-[#38BDF8] font-medium transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{advancedMode ? "Ocultar campos separados" : "Busca avançada"}</span>
                  </button>
                </div>

                {onOpenManualForm && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManualForm();
                    }}
                    className="text-[#007BFF] dark:text-[#38BDF8] hover:underline font-medium ml-auto"
                  >
                    Cadastrar manualmente
                  </button>
                )}
              </div>

              {/* Campos Avançados Separados */}
              {advancedMode && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={filterTitle}
                      onChange={(e) => setFilterTitle(e.target.value)}
                      placeholder="Ex: Dom Casmurro"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Autor
                    </label>
                    <input
                      type="text"
                      value={filterAuthor}
                      onChange={(e) => setFilterAuthor(e.target.value)}
                      placeholder="Ex: Machado de Assis"
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007BFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      ISBN (10 ou 13)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={filterIsbn}
                        onChange={(e) => setFilterIsbn(e.target.value)}
                        placeholder="Ex: 9788535914849"
                        className="w-full h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007BFF]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        title="Ler código com câmera"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#007BFF] transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Mensagem de Erro */}
            {searchError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Lista de Resultados */}
            <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {isSearching ? (
                // Skeletons de busca
                <div className="space-y-3">
                  {[...Array(4)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 animate-pulse"
                    >
                      <div className="w-14 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length > 0 ? (
                // Itens Encontrados
                results.map((item, idx) => {
                  const authorStr = item.authors.length > 0 ? item.authors.join(", ") : "Autor não informado";
                  const isbnDisplay = item.isbn13 ? `ISBN-13: ${item.isbn13}` : item.isbn10 ? `ISBN-10: ${item.isbn10}` : null;

                  return (
                    <div
                      key={`${item.external_id}-${idx}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-[#0F172A] hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all shadow-xs"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Miniatura da Capa */}
                        <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs border border-slate-200/50 dark:border-slate-700/50 book-spine">
                          {item.thumbnail_url || item.cover_url ? (
                            <Image
                              src={item.thumbnail_url || item.cover_url || ""}
                              alt={item.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <BookOpen className="w-6 h-6 stroke-[1.5]" />
                            </div>
                          )}
                        </div>

                        {/* Metadados */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#007BFF] transition-colors">
                            {item.title}
                          </h4>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 truncate">
                            {authorStr}
                          </p>

                          <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                            {item.publisher && (
                              <span className="truncate max-w-[140px] flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {item.publisher}
                              </span>
                            )}
                            {item.published_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {item.published_date.substring(0, 4)}
                              </span>
                            )}
                            {item.page_count && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                {item.page_count}p
                              </span>
                            )}
                            {isbnDisplay && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {isbnDisplay}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badges de Status Local e Botão de Ação */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                        {item.is_on_user_shelf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-[#007BFF] dark:text-blue-300">
                            <BookmarkCheck className="w-3 h-3" /> Na sua Estante
                          </span>
                        ) : item.is_already_in_catalog ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> No Catálogo
                          </span>
                        ) : null}

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleSelectBook(item)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          className="h-9 px-3.5 rounded-full text-xs font-bold"
                        >
                          Selecionar
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : hasSearched ? (
                // Estado vazio pós-busca
                <div className="py-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhum livro localizado
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Tente pesquisar usando apenas o código ISBN (10 ou 13 dígitos) ou alterne o provedor para Open Library.
                    </p>
                  </div>
                  {onOpenManualForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenManualForm();
                      }}
                      className="rounded-full text-xs"
                    >
                      Cadastrar manualmente
                    </Button>
                  )}
                </div>
              ) : (
                // Instruções iniciais amigáveis
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Barcode className="w-10 h-10 mx-auto opacity-50 stroke-[1.5]" />
                  <p className="text-xs">
                    Busque por títulos consagrados ou cole o código de barras (ISBN) do seu livro físico.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* ETAPA 2: REVISÃO E CONFIRMAÇÃO DO LIVRO SELECIONADO                */}
        {/* ================================================================= */}
        {selectedItem && !confirmSuccess && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Banner de Deduplicação / Reutilização de Livro */}
            {selectedItem.is_already_in_catalog ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Livro já existente no catálogo do TeleBooks</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Identificamos correspondência confiável por ISBN/Título. Este registro será **reutilizado**,
                    garantindo que sua biblioteca não fique com cópias duplicadas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#007BFF] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Novo livro para o acervo global</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Os dados bibliográficos, capa e autores serão cadastrados automaticamente no catálogo.
                  </p>
                </div>
              </div>
            )}

            {/* Ficha Resumida do Livro */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-xs">
              <div className="relative w-24 h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-md book-spine self-center sm:self-start">
                {selectedItem.cover_url || selectedItem.thumbnail_url ? (
                  <Image
                    src={selectedItem.cover_url || selectedItem.thumbnail_url || ""}
                    alt={selectedItem.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedItem.title}
                  </h3>
                  {selectedItem.subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedItem.subtitle}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-[#007BFF] dark:text-[#38BDF8] mt-1">
                    {selectedItem.authors.join(", ") || "Autor desconhecido"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Editora: </span>
                    <span>{selectedItem.publisher || "Não informada"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Ano: </span>
                    <span>{selectedItem.published_date || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">ISBN-13: </span>
                    <span>{selectedItem.isbn13 || "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Páginas: </span>
                    <span>{selectedItem.page_count ? `${selectedItem.page_count} páginas` : "—"}</span>
                  </div>
                </div>

                {selectedItem.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 pt-1 leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}
              </div>
            </div>

            {/* Opções de Vinculação à Estante Pessoal */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addToShelf}
                  onChange={(e) => setAddToShelf(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007BFF] focus:ring-[#007BFF]"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Adicionar este livro diretamente à minha Estante Pessoal
                </span>
              </label>

              {addToShelf && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 pl-6">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Status de leitura inicial:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: "want_to_read", label: "Quero Ler" },
                        { id: "reading", label: "Lendo Agora" },
                        { id: "read", label: "Já Lido" },
                        { id: "paused", label: "Pausado" },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setShelfStatus(st.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          shelfStatus === st.id
                            ? "bg-[#007BFF] text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {confirmError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{confirmError}</span>
              </div>
            )}

            {/* Ações de Confirmação */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedItem(null)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="rounded-full text-xs"
              >
                Voltar aos resultados
              </Button>

              <Button
                type="button"
                variant="primary"
                disabled={isConfirming}
                onClick={handleConfirmImport}
                leftIcon={isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                className="h-10 px-5 rounded-full text-xs font-bold shadow-md shadow-[#007BFF]/20"
              >
                {isConfirming
                  ? "Salvando..."
                  : selectedItem.is_already_in_catalog
                  ? "Reutilizar & Confirmar"
                  : "Confirmar & Salvar no Acervo"}
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* ETAPA 3: TELA DE SUCESSO PÓS-CONFIRMAÇÃO                           */}
        {/* ================================================================= */}
        {confirmSuccess && (
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {confirmSuccess.reused
                  ? "Livro Reutilizado com Sucesso!"
                  : "Livro Importado com Sucesso!"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {confirmSuccess.message}
              </p>
            </div>

            <div className="p-4 max-w-sm mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-left flex items-center gap-3">
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative book-spine">
                {confirmSuccess.book.cover_url ? (
                  <Image
                    src={confirmSuccess.book.cover_url}
                    alt={confirmSuccess.book.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {confirmSuccess.book.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {confirmSuccess.book.authors?.map((a) => a.name).join(", ") || "Autor desconhecido"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                leftIcon={<Search className="w-4 h-4" />}
                className="rounded-full text-xs"
              >
                Buscar outro livro
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleClose}
                className="rounded-full text-xs px-5 font-bold"
              >
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal do Scanner de Código de Barras (Câmera Mobile/Desktop) */}
      <IsbnScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </Modal>
  );
}
