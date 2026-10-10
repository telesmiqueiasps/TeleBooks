"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Check,
  AlertCircle,
  Sparkles,
  UploadCloud,
  Loader2,
  Link2,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Author, Book, Genre, Publisher } from "@telebooks/types";
import { api, BookCreateParams } from "../../lib/api";

export interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookToEdit?: Book | null;
  onSuccess?: (book: Book) => void;
  onOpenSearchModal?: () => void;
}

export function BookFormModal({
  isOpen,
  onClose,
  bookToEdit,
  onSuccess,
  onOpenSearchModal,
}: BookFormModalProps) {
  const [title, setTitle] = useState("");
  const [authorsInput, setAuthorsInput] = useState("");
  const [publisherInput, setPublisherInput] = useState("");
  const [description, setDescription] = useState("");
  const [isbn13, setIsbn13] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);

  // Cloudflare R2 Upload state
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadSuccess, setCoverUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableAuthors, setAvailableAuthors] = useState<Author[]>([]);
  const [availablePublishers, setAvailablePublishers] = useState<Publisher[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (bookToEdit) {
        setTitle(bookToEdit.title);
        setAuthorsInput(bookToEdit.authors?.map((a) => a.name).join(", ") || "");
        setPublisherInput(bookToEdit.publisher?.name || "");
        setDescription(bookToEdit.description || "");
        setIsbn13(bookToEdit.isbn13 || "");
        setPageCount(bookToEdit.page_count ? bookToEdit.page_count.toString() : "");
        setCoverUrl(bookToEdit.cover_url || "");
        setSelectedGenreIds(bookToEdit.genres?.map((g) => g.id) || []);
      } else {
        // Reset form
        setTitle("");
        setAuthorsInput("");
        setPublisherInput("");
        setDescription("");
        setIsbn13("");
        setPageCount("");
        setCoverUrl("");
        setSelectedGenreIds([]);
      }
      setIsUploadingCover(false);
      setCoverUploadSuccess(false);
      setCoverMode(bookToEdit?.cover_url ? "url" : "upload");
      setError(null);
    }
  }, [isOpen, bookToEdit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("A imagem não pode ultrapassar o limite de 15MB.");
      return;
    }

    setIsUploadingCover(true);
    setError(null);
    setCoverUploadSuccess(false);

    try {
      const result = await api.uploadFile(file, "covers");
      setCoverUrl(result.url);
      setCoverUploadSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar capa para o Cloudflare R2.");
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const loadDependencies = async () => {
    try {
      const [authRes, pubRes, genRes] = await Promise.all([
        api.getAuthors({ page_size: 100 }),
        api.getPublishers({ page_size: 100 }),
        api.getGenres({ page_size: 100 }),
      ]);
      setAvailableAuthors(authRes.items || []);
      setAvailablePublishers(pubRes.items || []);
      setAvailableGenres(genRes.items || []);
    } catch {
      // Fallback silencioso
    }
  };

  const handleToggleGenre = (id: string) => {
    setSelectedGenreIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título da obra é obrigatório.");
      return;
    }

    const authorNames = authorsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (authorNames.length === 0) {
      setError("Informe ao menos um autor para a obra.");
      return;
    }

    const pubName = publisherInput.trim();

    setIsSubmitting(true);
    setError(null);

    // Identifica se algum autor ou editora já existe para repassar os IDs quando disponíveis
    const matchedAuthorIds: string[] = [];
    for (const name of authorNames) {
      const found = availableAuthors.find(
        (a) => a.name.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        matchedAuthorIds.push(found.id);
      }
    }

    let matchedPublisherId: string | null = null;
    if (pubName) {
      const foundPub = availablePublishers.find(
        (p) => p.name.toLowerCase() === pubName.toLowerCase()
      );
      if (foundPub) {
        matchedPublisherId = foundPub.id;
      }
    }

    const payload: BookCreateParams = {
      title: title.trim(),
      subtitle: bookToEdit?.subtitle || null,
      description: description.trim() || null,
      isbn13: isbn13.trim() || null,
      page_count: pageCount ? parseInt(pageCount, 10) : null,
      cover_url:
        coverUrl.trim() ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
      publisher_id: matchedPublisherId,
      publisher_name: pubName || null,
      author_ids: matchedAuthorIds,
      author_names: authorNames,
      genre_ids: selectedGenreIds,
    };

    try {
      let savedBook: Book;
      if (bookToEdit) {
        savedBook = await api.updateBook(bookToEdit.id, payload);
      } else {
        savedBook = await api.createBook(payload);
      }
      onSuccess?.(savedBook);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar livro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bookToEdit ? "Editar Dados Bibliográficos" : "Cadastrar Novo Livro"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!bookToEdit && onOpenSearchModal && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
              <Sparkles className="w-4 h-4 text-[#007BFF] shrink-0" />
              <span>Deseja preencher automaticamente buscando por ISBN, título ou autor?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSearchModal();
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#007BFF] hover:bg-[#0066D6] text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
            >
              Buscar Online
            </button>
          </div>
        )}

        {/* Título da Obra (sem campo de subtítulo) */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Título da Obra *
          </label>
          <Input
            placeholder="Ex: Dom Casmurro, O Nome do Vento, 1984..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Autor(es) - Campo Digitável Livre */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Autor(es) *
          </label>
          <Input
            list="telebooks-authors-datalist"
            placeholder="Ex: Machado de Assis (ou separe múltiplos por vírgula)"
            value={authorsInput}
            onChange={(e) => setAuthorsInput(e.target.value)}
            required
          />
          {availableAuthors.length > 0 && (
            <datalist id="telebooks-authors-datalist">
              {availableAuthors.map((author) => (
                <option key={author.id} value={author.name} />
              ))}
            </datalist>
          )}
          <p className="text-[11px] text-neutral-400 mt-1">
            Campo digitável livre. Caso seja mais de um autor, separe os nomes por vírgula.
          </p>
        </div>

        {/* Editora (Campo Digitável Livre), Páginas e ISBN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Editora
            </label>
            <Input
              list="telebooks-publishers-datalist"
              placeholder="Ex: Companhia das Letras, Rocco..."
              value={publisherInput}
              onChange={(e) => setPublisherInput(e.target.value)}
            />
            {availablePublishers.length > 0 && (
              <datalist id="telebooks-publishers-datalist">
                {availablePublishers.map((pub) => (
                  <option key={pub.id} value={pub.name} />
                ))}
              </datalist>
            )}
            <p className="text-[11px] text-neutral-400 mt-1">
              Campo digitável livre.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Páginas
            </label>
            <Input
              type="number"
              min="1"
              placeholder="Ex: 656"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              ISBN-13
            </label>
            <Input
              placeholder="Ex: 9788599296492"
              value={isbn13}
              onChange={(e) => setIsbn13(e.target.value)}
            />
          </div>
        </div>

        {/* Gêneros */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Gêneros Literários ({selectedGenreIds.length} selecionados)
          </label>
          <div className="flex flex-wrap gap-1.5 p-2.5 max-h-24 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
            {availableGenres.length === 0 ? (
              <span className="text-xs text-neutral-500">Nenhum gênero disponível.</span>
            ) : (
              availableGenres.map((genre) => {
                const isSelected = selectedGenreIds.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleToggleGenre(genre.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isSelected
                        ? "bg-[#2563eb] text-white border-[#2563eb]"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Imagem de Capa (Cloudflare R2 ou URL) */}
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <span>Imagem de Capa</span>
              {coverUrl?.includes("r2.dev") && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                  Cloudflare R2
                </span>
              )}
            </label>

            {/* Alternador de Modo */}
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setCoverMode("upload")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  coverMode === "upload"
                    ? "bg-[#2563eb] text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <UploadCloud className="h-3 w-3" />
                Upload (R2)
              </button>
              <button
                type="button"
                onClick={() => setCoverMode("url")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  coverMode === "url"
                    ? "bg-[#2563eb] text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
              >
                <Link2 className="h-3 w-3" />
                Link URL
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {/* Input área */}
            <div className="flex-1">
              {coverMode === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <div
                    onClick={() => !isUploadingCover && fileInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                      isUploadingCover
                        ? "border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/20 cursor-wait"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900/50"
                    }`}
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="h-5 w-5 text-[#2563eb] animate-spin" />
                        <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                          Enviando capa para o Cloudflare R2...
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-5 w-5 text-neutral-400" />
                        <div className="text-xs text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold text-[#2563eb]">Clique para selecionar</span> ou envie do seu dispositivo
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          JPG, PNG, WebP ou AVIF até 15MB
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="https://exemplo.com/capa.jpg"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Cole uma URL externa acessível de imagem.
                  </p>
                </div>
              )}
            </div>

            {/* Thumbnail preview */}
            <div className="relative group flex-shrink-0">
              <div className="h-20 w-14 rounded-lg bg-neutral-200 dark:bg-neutral-800 overflow-hidden border border-neutral-300 dark:border-neutral-700 flex items-center justify-center shadow-sm">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverUrl}
                    alt="Preview da capa"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-5 w-5 text-neutral-400" />
                )}
              </div>
              {coverUrl && (
                <button
                  type="button"
                  title="Remover capa"
                  onClick={() => {
                    setCoverUrl("");
                    setCoverUploadSuccess(false);
                  }}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {coverUploadSuccess && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Capa enviada com sucesso para o Cloudflare R2!
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Sinopse / Descrição
          </label>
          <textarea
            rows={3}
            placeholder="Breve resumo da obra literária..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<Check className="h-4 w-4" />}
          >
            {bookToEdit ? "Salvar Alterações" : "Cadastrar Livro"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
