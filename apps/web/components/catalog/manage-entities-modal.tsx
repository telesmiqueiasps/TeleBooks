"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Building2, User, Tag, Check, AlertCircle } from "lucide-react";
import { Modal, Button, Input } from "@telebooks/ui";
import type { Author, Publisher, Genre } from "@telebooks/types";
import { api } from "../../lib/api";

export interface ManageEntitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ManageEntitiesModal({
  isOpen,
  onClose,
  onUpdated,
}: ManageEntitiesModalProps) {
  const [activeTab, setActiveTab] = useState<"authors" | "publishers" | "genres">(
    "authors"
  );
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulário Autor
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorBio, setNewAuthorBio] = useState("");

  // Formulário Editora
  const [newPubName, setNewPubName] = useState("");
  const [newPubWebsite, setNewPubWebsite] = useState("");

  // Formulário Gênero
  const [newGenreName, setNewGenreName] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [authorsRes, pubRes, genreRes] = await Promise.all([
        api.getAuthors({ page_size: 100 }),
        api.getPublishers({ page_size: 100 }),
        api.getGenres({ page_size: 100 }),
      ]);
      setAuthors(authorsRes.items || []);
      setPublishers(pubRes.items || []);
      setGenres(genreRes.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar dados.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCreateAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorName.trim()) return;
    try {
      await api.createAuthor({
        name: newAuthorName.trim(),
        bio: newAuthorBio.trim() || null,
      });
      setNewAuthorName("");
      setNewAuthorBio("");
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar autor.");
    }
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este autor?")) return;
    try {
      await api.deleteAuthor(id);
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir autor.");
    }
  };

  const handleCreatePublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPubName.trim()) return;
    try {
      await api.createPublisher({
        name: newPubName.trim(),
        website: newPubWebsite.trim() || null,
      });
      setNewPubName("");
      setNewPubWebsite("");
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar editora.");
    }
  };

  const handleDeletePublisher = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta editora?")) return;
    try {
      await api.deletePublisher(id);
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir editora.");
    }
  };

  const handleCreateGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreName.trim()) return;
    try {
      await api.createGenre({
        name: newGenreName.trim(),
      });
      setNewGenreName("");
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar gênero.");
    }
  };

  const handleDeleteGenre = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gênero?")) return;
    try {
      await api.deleteGenre(id);
      loadData();
      onUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir gênero.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Entidades Bibliográficas"
      size="lg"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-[#e5e0d8] dark:border-[#262c36]">
          <button
            type="button"
            onClick={() => setActiveTab("authors")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "authors"
                ? "border-[#d97706] text-[#d97706] dark:text-[#f59e0b]"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <User className="h-4 w-4" />
            Autores ({authors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("publishers")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "publishers"
                ? "border-[#d97706] text-[#d97706] dark:text-[#f59e0b]"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Editoras ({publishers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("genres")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "genres"
                ? "border-[#d97706] text-[#d97706] dark:text-[#f59e0b]"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Tag className="h-4 w-4" />
            Gêneros ({genres.length})
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Tab Content: Authors */}
        {activeTab === "authors" && (
          <div className="space-y-4">
            <form onSubmit={handleCreateAuthor} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <Input
                placeholder="Nome do autor *"
                value={newAuthorName}
                onChange={(e) => setNewAuthorName(e.target.value)}
                required
              />
              <Input
                placeholder="Biografia curta (opcional)"
                value={newAuthorBio}
                onChange={(e) => setNewAuthorBio(e.target.value)}
              />
              <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Adicionar Autor
              </Button>
            </form>

            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800">
              {authors.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500 text-center">Nenhum autor cadastrado.</p>
              ) : (
                authors.map((a) => (
                  <div key={a.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{a.name}</p>
                      {a.bio && <p className="text-xs text-neutral-500 line-clamp-1">{a.bio}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAuthor(a.id)}
                      className="text-neutral-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Excluir autor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Publishers */}
        {activeTab === "publishers" && (
          <div className="space-y-4">
            <form onSubmit={handleCreatePublisher} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <Input
                placeholder="Nome da editora *"
                value={newPubName}
                onChange={(e) => setNewPubName(e.target.value)}
                required
              />
              <Input
                placeholder="Site da editora (opcional)"
                value={newPubWebsite}
                onChange={(e) => setNewPubWebsite(e.target.value)}
              />
              <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Adicionar Editora
              </Button>
            </form>

            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800">
              {publishers.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500 text-center">Nenhuma editora cadastrada.</p>
              ) : (
                publishers.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.name}</p>
                      {p.website && <p className="text-xs text-neutral-500">{p.website}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePublisher(p.id)}
                      className="text-neutral-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Excluir editora"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Genres */}
        {activeTab === "genres" && (
          <div className="space-y-4">
            <form onSubmit={handleCreateGenre} className="flex gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex-1">
                <Input
                  placeholder="Nome do gênero literário (ex: Ficção Científica) *"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Adicionar Gênero
              </Button>
            </form>

            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800">
              {genres.length === 0 ? (
                <p className="p-4 text-sm text-neutral-500 text-center">Nenhum gênero cadastrado.</p>
              ) : (
                genres.map((g) => (
                  <div key={g.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{g.name}</p>
                      <p className="text-xs text-neutral-400">slug: {g.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGenre(g.id)}
                      className="text-neutral-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Excluir gênero"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
