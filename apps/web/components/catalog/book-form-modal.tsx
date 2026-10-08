"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Check, AlertCircle, Sparkles } from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Author, Book, Genre, Publisher } from "@telebooks/types";
import { api, BookCreateParams } from "../../lib/api";

export interface BookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookToEdit?: Book | null;
  onSuccess?: (book: Book) => void;
}

export function BookFormModal({
  isOpen,
  onClose,
  bookToEdit,
  onSuccess,
}: BookFormModalProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [isbn13, setIsbn13] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<string[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);

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
        setSubtitle(bookToEdit.subtitle || "");
        setDescription(bookToEdit.description || "");
        setIsbn13(bookToEdit.isbn13 || "");
        setPageCount(bookToEdit.page_count ? bookToEdit.page_count.toString() : "");
        setCoverUrl(bookToEdit.cover_url || "");
        setPublisherId(bookToEdit.publisher_id || "");
        setSelectedAuthorIds(bookToEdit.authors?.map((a) => a.id) || []);
        setSelectedGenreIds(bookToEdit.genres?.map((g) => g.id) || []);
      } else {
        // Reset form
        setTitle("");
        setSubtitle("");
        setDescription("");
        setIsbn13("");
        setPageCount("");
        setCoverUrl("");
        setPublisherId("");
        setSelectedAuthorIds([]);
        setSelectedGenreIds([]);
      }
      setError(null);
    }
  }, [isOpen, bookToEdit]);

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

  const handleToggleAuthor = (id: string) => {
    setSelectedAuthorIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
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

    setIsSubmitting(true);
    setError(null);

    const payload: BookCreateParams = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      isbn13: isbn13.trim() || null,
      page_count: pageCount ? parseInt(pageCount, 10) : null,
      cover_url:
        coverUrl.trim() ||
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
      publisher_id: publisherId || null,
      author_ids: selectedAuthorIds,
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

        {/* Título e Subtítulo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Título da Obra *
            </label>
            <Input
              placeholder="Ex: O Nome do Vento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Subtítulo (opcional)
            </label>
            <Input
              placeholder="Ex: A Crônica do Matador do Rei: Primeiro Dia"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>
        </div>

        {/* Autores */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Autores ({selectedAuthorIds.length} selecionados)
          </label>
          <div className="flex flex-wrap gap-1.5 p-2.5 max-h-28 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
            {availableAuthors.length === 0 ? (
              <span className="text-xs text-neutral-500">Nenhum autor disponível.</span>
            ) : (
              availableAuthors.map((author) => {
                const isSelected = selectedAuthorIds.includes(author.id);
                return (
                  <button
                    key={author.id}
                    type="button"
                    onClick={() => handleToggleAuthor(author.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      isSelected
                        ? "bg-[#d97706] text-white border-[#d97706]"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {author.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Editora e Páginas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Editora
            </label>
            <select
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
            >
              <option value="">Selecione uma editora...</option>
              {availablePublishers.map((pub) => (
                <option key={pub.id} value={pub.id}>
                  {pub.name}
                </option>
              ))}
            </select>
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

        {/* Capa e Sinopse */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              URL da Imagem de Capa
            </label>
            <Input
              placeholder="https://images.unsplash.com/..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-center p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/40">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt="Preview da capa"
                className="h-16 w-11 object-cover rounded shadow"
              />
            ) : (
              <div className="h-16 w-11 rounded border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400">
                <BookOpen className="h-4 w-4" />
              </div>
            )}
          </div>
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
